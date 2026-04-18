"""Admin dashboard endpoints.

Gated to users whose email ends with ``@birdflop.com``. Returns host +
backend-process stats, Docker/user/classroom counts, and port allocation.
"""
import logging
import os
import resource
import subprocess
import time

import psutil
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlmodel import Session, select

from backend.docker import CLASSROOMS_ROOT

from ..database import Classroom, ClassroomMember, PortSubdomain, User
from ..dependencies import get_current_user, get_db

logger = logging.getLogger("admin")

router = APIRouter()


ADMIN_EMAIL_DOMAIN = "@birdflop.com"


def require_birdflop_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency: only allow authenticated users with a birdflop.com email."""
    email = (user.email or "").lower()
    if not email.endswith(ADMIN_EMAIL_DOMAIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/me")
async def admin_me(user: User = Depends(require_birdflop_admin)):
    """Lightweight probe so the frontend can check admin access before rendering."""
    return {"email": user.email, "is_admin": True}


def _count_containers() -> dict:
    """Count user containers by state via `docker ps -a`."""
    try:
        result = subprocess.run(
            [
                "docker",
                "ps",
                "-a",
                "--filter",
                "name=user-container-",
                "--format",
                "{{.State}}",
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning("docker ps failed: %s", e)
        return {"total": None, "running": None, "stopped": None, "error": str(e)}

    total = running = stopped = 0
    for line in result.stdout.strip().splitlines():
        state = line.strip().lower()
        if not state:
            continue
        total += 1
        if state == "running":
            running += 1
        else:
            stopped += 1
    return {"total": total, "running": running, "stopped": stopped}


def _fd_stats() -> dict:
    """Open fds + soft/hard limit for the backend process.

    The recent EMFILE incident ate the default soft limit of 1024, so this
    is the most important single number on the dashboard — keep an eye on
    it climbing in a way not explained by concurrent users.
    """
    pid = os.getpid()
    fd_count: int | None
    try:
        fd_count = len(os.listdir(f"/proc/{pid}/fd"))
    except OSError:
        # macOS or any system without /proc — psutil has a portable fallback.
        try:
            fd_count = psutil.Process(pid).num_fds()
        except Exception:
            fd_count = None
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    return {"open": fd_count, "soft_limit": soft, "hard_limit": hard}


@router.get("/stats")
async def stats(
    request: Request,
    _user: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    now = time.time()
    settings = request.app.state.settings

    # Host
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    # cpu_percent with interval=None compares against the last call; the
    # dashboard polls every 5s so the value reflects that window. For a
    # cold cache (first call), a short blocking interval avoids reporting 0.
    cached = getattr(request.app.state, "_admin_cpu_sampled", False)
    cpu = psutil.cpu_percent(interval=None if cached else 0.2)
    request.app.state._admin_cpu_sampled = True
    try:
        load1, load5, load15 = os.getloadavg()
    except OSError:
        load1 = load5 = load15 = None

    # Backend process
    proc = psutil.Process(os.getpid())
    try:
        proc_cpu = proc.cpu_percent(interval=None)
    except Exception:
        proc_cpu = None

    fds = _fd_stats()

    # Users
    total_users = db.exec(select(func.count()).select_from(User)).one()
    onboarded_users = db.exec(
        select(func.count()).select_from(User).where(User.role.is_not(None))
    ).one()
    # "Recently active": last_login within 24h. Uses wall-clock; good enough.
    from datetime import datetime, timedelta
    day_ago = datetime.utcnow() - timedelta(days=1)
    active_24h = db.exec(
        select(func.count()).select_from(User).where(User.last_login >= day_ago)
    ).one()

    # Classrooms
    total_classrooms = db.exec(select(func.count()).select_from(Classroom)).one()
    total_memberships = db.exec(select(func.count()).select_from(ClassroomMember)).one()

    # Subdomains
    total_subdomains = db.exec(select(func.count()).select_from(PortSubdomain)).one()

    # Ports
    port_rows = db.exec(select(User.port_start, User.port_end)).all()
    port_base = getattr(settings, "port_base", None)
    max_port_end = max((r[1] for r in port_rows if r[1] is not None), default=None)

    # Containers (via docker ps)
    containers = _count_containers()

    return {
        "host": {
            "cpu_percent": cpu,
            "memory": {
                "total_mb": mem.total // 1024 // 1024,
                "used_mb": (mem.total - mem.available) // 1024 // 1024,
                "percent": mem.percent,
            },
            "disk": {
                "total_gb": round(disk.total / 1024**3, 1),
                "used_gb": round(disk.used / 1024**3, 1),
                "percent": disk.percent,
            },
            "load_avg": {"1m": load1, "5m": load5, "15m": load15},
            "uptime_seconds": int(now - psutil.boot_time()),
        },
        "process": {
            "pid": proc.pid,
            "uptime_seconds": int(now - proc.create_time()),
            "cpu_percent": proc_cpu,
            "memory_rss_mb": proc.memory_info().rss // 1024 // 1024,
            "threads": proc.num_threads(),
            "fds": fds,
        },
        "users": {
            "total": total_users,
            "onboarded": onboarded_users,
            "active_24h": active_24h,
        },
        "containers": containers,
        "classrooms": {
            "total": total_classrooms,
            "memberships": total_memberships,
        },
        "subdomains": {"total": total_subdomains},
        "ports": {
            "base": port_base,
            "max_allocated_end": max_port_end,
            "allocated_users": len(port_rows),
        },
        "timestamp": int(now),
    }


def _running_container_uids() -> tuple[set[str], str | None]:
    """Return the set of user ids that have a running container, or an error string."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=user-container-", "--format", "{{.Names}}"],
            capture_output=True, text=True, check=False, timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return set(), str(e)
    if result.returncode != 0:
        return set(), (result.stderr or "").strip() or None
    running: set[str] = set()
    prefix = "user-container-"
    for line in result.stdout.strip().splitlines():
        name = line.strip()
        if name.startswith(prefix):
            running.add(name[len(prefix):])
    return running, None


def _port_conflicts(users: list[User]) -> set[str]:
    """Return the set of user ids whose port range overlaps another user's.

    O(n^2) but n is a few hundred at most. Surfaces the signup race documented
    in fix-stuck-user.md where two simultaneous /auth/callback hits read the
    same ``MAX(port_end)`` and get the same port_start.
    """
    conflicts: set[str] = set()
    ranges = [(u.id, u.port_start, u.port_end) for u in users if u.port_start and u.port_end]
    for i in range(len(ranges)):
        a_id, a_s, a_e = ranges[i]
        for j in range(i + 1, len(ranges)):
            b_id, b_s, b_e = ranges[j]
            if not (a_e < b_s or b_e < a_s):
                conflicts.add(a_id)
                conflicts.add(b_id)
    return conflicts


@router.get("/users")
async def admin_users(
    _user: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    users = list(db.exec(select(User)).all())

    # Membership counts per user (single grouped query)
    mem_rows = db.exec(
        select(ClassroomMember.user_id, func.count())
        .group_by(ClassroomMember.user_id)
    ).all()
    mem_map = {uid: count for uid, count in mem_rows}

    running, docker_err = _running_container_uids()
    conflicts = _port_conflicts(users)

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "port_start": u.port_start,
                "port_end": u.port_end,
                "port_conflict": u.id in conflicts,
                "first_login": u.first_login.isoformat() + "Z" if u.first_login else None,
                "last_login": u.last_login.isoformat() + "Z" if u.last_login else None,
                "container_running": u.id in running,
                "classroom_count": mem_map.get(u.id, 0),
            }
            for u in users
        ],
        "docker_error": docker_err,
    }


@router.get("/classrooms")
async def admin_classrooms(
    _user: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    classrooms = list(db.exec(select(Classroom)).all())

    # Role-split member counts per classroom (single grouped query)
    member_rows = db.exec(
        select(ClassroomMember.classroom_id, ClassroomMember.role, func.count())
        .group_by(ClassroomMember.classroom_id, ClassroomMember.role)
    ).all()
    counts: dict[str, dict[str, int]] = {}
    for cid, role, count in member_rows:
        counts.setdefault(cid, {})[role] = count

    # Creator email lookup
    creator_ids = list({c.created_by for c in classrooms if c.created_by})
    creator_map: dict[str, str] = {}
    if creator_ids:
        creators = db.exec(select(User).where(User.id.in_(creator_ids))).all()
        creator_map = {u.id: u.email for u in creators}

    # Assignment count = number of subdirectories in assignments/.
    # Filesystem-cheap: listdir + is_dir per classroom.
    assignment_counts: dict[str, int] = {}
    for c in classrooms:
        assignments_dir = os.path.join(CLASSROOMS_ROOT, c.id, "assignments")
        try:
            assignment_counts[c.id] = sum(
                1 for e in os.listdir(assignments_dir)
                if os.path.isdir(os.path.join(assignments_dir, e))
            )
        except (FileNotFoundError, PermissionError, NotADirectoryError):
            assignment_counts[c.id] = 0

    return {
        "classrooms": [
            {
                "id": c.id,
                "name": c.name,
                "access_code": c.access_code,
                "created_by_email": creator_map.get(c.created_by),
                "created_at": c.created_at.isoformat() + "Z" if c.created_at else None,
                "joins_paused": bool(getattr(c, "joins_paused", False)),
                "grading_mode": getattr(c, "grading_mode", "equal"),
                "instructor_count": counts.get(c.id, {}).get("instructor", 0),
                "participant_count": counts.get(c.id, {}).get("participant", 0),
                "assignment_count": assignment_counts.get(c.id, 0),
            }
            for c in classrooms
        ],
    }


import re as _re_admin_logs

_DEBUG_RE = _re_admin_logs.compile(r"\[DEBUG\]")
# Both Python-logger INFO lines ("[INFO]") and uvicorn's access log lines
# ("INFO:     172.x.x.x:0 - ...") count as info.
_INFO_RE = _re_admin_logs.compile(r"\[INFO\]|: INFO: ")


def _filter_log_lines(raw_lines: list[str], hide_debug: bool, hide_info: bool) -> list[str]:
    if not hide_debug and not hide_info:
        return raw_lines
    out: list[str] = []
    for line in raw_lines:
        if hide_debug and _DEBUG_RE.search(line):
            continue
        if hide_info and _INFO_RE.search(line):
            continue
        out.append(line)
    return out


@router.get("/logs")
async def admin_logs(
    _user: User = Depends(require_birdflop_admin),
    lines: int = 200,
    hide_debug: bool = False,
    hide_info: bool = False,
):
    """Recent entries from the systemd journal for the 3compute service.

    On hosts without systemd (dev / docker-compose), returns an error. The
    production deployment needs www-data added to the ``systemd-journal``
    group once: ``usermod -aG systemd-journal www-data``.

    ``hide_debug`` drops ``[DEBUG]`` lines, ``hide_info`` drops both
    Python-logger ``[INFO]`` and uvicorn ``INFO:`` access lines. Both
    independent; both can be true.
    """
    lines = max(1, min(int(lines), 2000))

    # If we're hiding anything, scan a larger window so we still have ~lines
    # of material after filtering. Capped at 5000.
    if hide_debug or hide_info:
        scan_lines = min(max(lines * 10, 1000), 5000)
    else:
        scan_lines = lines

    cmd = [
        "journalctl",
        "-u", "3compute",
        "-n", str(scan_lines),
        "--no-pager",
        "--output=short-iso",
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, check=False, timeout=10,
        )
    except FileNotFoundError:
        return {
            "available": False,
            "error": (
                "journalctl not available on this host (likely dev / docker-compose). "
                "In dev, view logs with `docker compose logs -f backend`."
            ),
            "lines": [],
        }
    except subprocess.TimeoutExpired:
        return {"available": False, "error": "journalctl timed out after 10s", "lines": []}

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        hint = ""
        if "Hint:" in stderr or "permission" in stderr.lower() or "No journal files were opened" in stderr:
            hint = " (Add www-data to the systemd-journal group: `usermod -aG systemd-journal www-data && systemctl restart 3compute`.)"
        return {
            "available": False,
            "error": f"journalctl exit {result.returncode}: {stderr}{hint}",
            "lines": [],
        }

    raw_lines = result.stdout.splitlines()
    filtered = _filter_log_lines(raw_lines, hide_debug=hide_debug, hide_info=hide_info)
    # Keep the last `lines` after filtering.
    tail = filtered[-lines:]
    return {
        "available": True,
        "lines": tail,
        "count": len(tail),
        "scanned": len(raw_lines),
        "hide_debug": hide_debug,
        "hide_info": hide_info,
    }


@router.get("/containers")
async def admin_containers(
    _user: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    """List user containers joined with user emails.

    No per-container `docker stats` — that's an expensive blocking call per
    container. The headline host CPU/mem on /admin plus state + uptime here
    is enough to spot the common problems without burning cycles.
    """
    try:
        result = subprocess.run(
            [
                "docker", "ps", "-a",
                "--filter", "name=user-container-",
                "--format",
                "{{.Names}}\t{{.State}}\t{{.Status}}\t{{.RunningFor}}\t{{.Ports}}",
            ],
            capture_output=True, text=True, check=False, timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return {"containers": [], "error": str(e)}

    if result.returncode != 0:
        return {"containers": [], "error": (result.stderr or "").strip()}

    email_map = {u.id: u.email for u in db.exec(select(User)).all()}

    prefix = "user-container-"
    containers = []
    for line in result.stdout.strip().splitlines():
        parts = line.split("\t")
        # Pad in case a field is empty and tab-split produces fewer columns
        while len(parts) < 5:
            parts.append("")
        name, state, status, running_for, ports = parts[:5]
        user_id = name[len(prefix):] if name.startswith(prefix) else None
        containers.append({
            "name": name,
            "user_id": user_id,
            "user_email": email_map.get(user_id) if user_id else None,
            "state": state.lower(),
            "status": status,
            "running_for": running_for,
            "ports": ports,
        })
    return {"containers": containers}
