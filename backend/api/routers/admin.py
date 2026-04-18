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
