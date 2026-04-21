"""Terminal WebSocket handling via python-socketio AsyncServer (ASGI).

Provides real-time PTY access to per-user Docker containers over Socket.IO.
Blocking PTY / subprocess operations are offloaded to threads via
``asyncio.to_thread`` so the async event loop is never blocked.
"""

import asyncio
import base64
import fcntl
import json
import logging
import os
import select
import struct
import subprocess
import termios
import threading
import time
from http.cookies import SimpleCookie
from urllib.parse import parse_qs

import socketio
from itsdangerous import TimestampSigner
from sqlmodel import Session

from backend.docker import (
    attach_to_container,
    container_exists,
    container_is_running,
    spawn_container,
)

from .config import Settings
from .database import User, get_engine

logger = logging.getLogger("terminal")

_settings = Settings()
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        _settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

# user_id → {"container_name": str, "port_range": tuple | None}
user_containers: dict[str, dict] = {}
# sid → per-session state (fd, user_id, container info, …)
session_map: dict[str, dict] = {}
POLL_INTERVAL = 4
_cleanup_timers: dict[str, threading.Event] = {}
# per-user lock to prevent simultaneous container spawns from multiple tabs
_spawn_locks: dict[str, threading.Lock] = {}
# Ring buffer of recent PTY output per (user_id, tab_id).
# Used to replay terminal content on reconnect (dtach has no screen buffer).
_MAX_OUTPUT_BUFFER = 80 * 1024  # 80 KB
_tab_output_buffers: dict[tuple[str, str], str] = {}
_engine = None


def _get_db_engine():
    """Lazily create and cache a SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = get_engine(_settings.database_url)
    return _engine


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------


def _register_handlers():
    sio.on("connect", handler=handle_connect)
    sio.on("disconnect", handler=handle_disconnect)
    sio.on("pty-input", handler=handle_pty_input)
    sio.on("resize", handler=handle_resize)


# ---------------------------------------------------------------------------
# Container discovery (sync — called once at startup)
# ---------------------------------------------------------------------------


def discover_existing_containers():
    """Scan Docker for user containers and restore them to tracking."""
    try:
        result = subprocess.run(
            [
                "docker",
                "ps",
                "-a",
                "--filter",
                "name=user-container-",
                "--format",
                "{{.Names}}",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        for name in result.stdout.strip().split("\n"):
            if not name:
                continue
            user_id = name.replace("user-container-", "")
            if not user_id:
                continue
            running = container_is_running(name)
            logger.info(
                "Found %s container %s for user %s",
                "running" if running else "stopped",
                name,
                user_id,
            )
            user_containers[user_id] = {
                "container_name": name,
                "port_range": None,
            }
    except subprocess.CalledProcessError as e:
        logger.warning("Failed to discover existing containers: %s", e)


def start_pollers_for_orphaned():
    """Start idle pollers for discovered containers with no active sessions."""
    for user_id in list(user_containers.keys()):
        if not any(s["user_id"] == user_id for s in session_map.values()):
            logger.info("Starting idle poller for orphaned container user %s", user_id)
            _start_idle_poller(user_id)


# ---------------------------------------------------------------------------
# Auth / session helpers
# ---------------------------------------------------------------------------


def _get_user_id_from_environ(environ: dict) -> str | None:
    """Decode the Starlette session cookie from a WSGI-style environ dict.

    python-socketio's ASGI driver converts the ASGI scope into a WSGI-style
    environ where headers are ``HTTP_<NAME>`` keys (e.g. ``HTTP_COOKIE``).
    """
    cookie_header = environ.get("HTTP_COOKIE", "")
    if not cookie_header:
        logger.warning("No HTTP_COOKIE in environ")
        return None

    cookies = SimpleCookie(cookie_header)
    morsel = cookies.get("session")
    if not morsel:
        logger.warning("No 'session' cookie found. Cookie names: %s", list(cookies.keys()))
        return None

    signer = TimestampSigner(str(_settings.flask_secret))
    try:
        data = signer.unsign(morsel.value, max_age=86400 * 30)
        session_data = json.loads(base64.b64decode(data))
        user_id = session_data.get("user_id")
        logger.info("Decoded user_id=%s from session cookie", user_id)
        return user_id
    except Exception as exc:
        logger.warning("Failed to decode session cookie: %s", exc)
        return None


def _get_query_param(environ: dict, param: str, default: str = "") -> str:
    """Extract a single query parameter from the WSGI-style environ."""
    qs = environ.get("QUERY_STRING", environ.get("query_string", ""))
    if isinstance(qs, bytes):
        qs = qs.decode()
    params = parse_qs(qs)
    values = params.get(param, [default])
    return values[0] if values else default


def _get_user(user_id: str) -> User | None:
    """Look up a User by primary key.  Blocking — call via ``to_thread``."""
    engine = _get_db_engine()
    with Session(engine) as db:
        return db.get(User, user_id)


# ---------------------------------------------------------------------------
# Container lifecycle (sync — run via asyncio.to_thread)
# ---------------------------------------------------------------------------


def _ensure_container(
    user_id: str,
    port_range: tuple | None,
    email: str | None,
) -> str | None:
    """Guarantee a running container for *user_id*.  Returns container name or
    ``None`` on unrecoverable failure."""
    lock = _spawn_locks.setdefault(user_id, threading.Lock())
    with lock:
        return _ensure_container_locked(user_id, port_range, email)


def _ensure_container_locked(
    user_id: str,
    port_range: tuple | None,
    email: str | None,
) -> str | None:
    container_name = f"user-container-{user_id}"
    logger.info(
        "[DIAG] _ensure_container: user=%s tracked=%s",
        user_id,
        user_id in user_containers,
    )

    if user_id not in user_containers:
        if container_exists(container_name):
            if container_is_running(container_name):
                logger.info("Reusing existing running container %s", container_name)
                user_containers[user_id] = {
                    "container_name": container_name,
                    "port_range": port_range,
                }
            else:
                logger.info("Restarting stopped container %s", container_name)
                try:
                    subprocess.run(["docker", "start", container_name], check=True)
                    user_containers[user_id] = {
                        "container_name": container_name,
                        "port_range": port_range,
                    }
                except subprocess.CalledProcessError:
                    logger.warning(
                        "Restart failed for %s, spawning new container",
                        container_name,
                    )
                    subprocess.run(["docker", "rm", "-f", container_name], check=False)
                    try:
                        spawn_container(user_id, None, container_name, port_range, email)
                        user_containers[user_id] = {
                            "container_name": container_name,
                            "port_range": port_range,
                        }
                        logger.info("Spawned new container for user %s", user_id)
                    except Exception:
                        logger.error(
                            "Failed to spawn container for user %s",
                            user_id,
                            exc_info=True,
                        )
                        return None
        else:
            try:
                spawn_container(user_id, None, container_name, port_range, email)
                user_containers[user_id] = {
                    "container_name": container_name,
                    "port_range": port_range,
                }
                logger.info("Spawned new container for user %s", user_id)
            except Exception as first_err:
                # Most common cause of spawn failure is a stale container
                # with the same name lingering in some state (created but not
                # yet fully registered, or removed but not yet cleaned up).
                # Automate one attempt here so a page refresh suffices.
                logger.warning(
                    "First spawn attempt failed for user %s: %s; force-removing and retrying",
                    user_id, first_err,
                )
                subprocess.run(
                    ["docker", "rm", "-f", container_name],
                    check=False, capture_output=True,
                )
                try:
                    spawn_container(user_id, None, container_name, port_range, email)
                    user_containers[user_id] = {
                        "container_name": container_name,
                        "port_range": port_range,
                    }
                    logger.info("Retry spawn succeeded for user %s", user_id)
                except Exception:
                    logger.error(
                        "Retry spawn also failed for user %s — see prior log line for docker's stderr",
                        user_id,
                        exc_info=True,
                    )
                    return None
    else:
        logger.info("[DIAG] _ensure_container: user=%s already tracked, checking if running", user_id)
        if user_containers[user_id]["port_range"] is None:
            user_containers[user_id]["port_range"] = port_range

        if not container_is_running(container_name):
            logger.info("Container %s not running, restarting", container_name)
            try:
                subprocess.run(["docker", "start", container_name], check=True)
                logger.info("Restarted container %s", container_name)
            except subprocess.CalledProcessError:
                logger.warning(
                    "Restart failed for %s, spawning replacement",
                    container_name,
                )
                _cleanup_user_container(user_id, container_name)
                try:
                    spawn_container(user_id, None, container_name, port_range, email)
                    user_containers[user_id] = {
                        "container_name": container_name,
                        "port_range": port_range,
                    }
                except Exception:
                    logger.error(
                        "Failed to spawn replacement for user %s",
                        user_id,
                        exc_info=True,
                    )
                    return None

    return container_name


def _attach_container(session_info: dict, cols: int = 80, rows: int = 24) -> bool:
    """Open a PTY into the user's container.  Updates *session_info* in place.

    Returns ``True`` on success, ``False`` on failure.
    """
    container_name = session_info["container_name"]
    user_id = session_info["user_id"]
    tab_id = session_info["tab_id"]

    if not container_is_running(container_name):
        logger.info(
            "Container %s not running at attach time; attempting restart",
            container_name,
        )
        try:
            subprocess.run(["docker", "start", container_name], check=True)
            logger.info("Restarted container %s", container_name)
        except subprocess.CalledProcessError:
            logger.warning("Failed to restart %s; spawning replacement", container_name)
            port_range = session_info.get("port_range")
            email = session_info.get("email")
            try:
                spawn_container(user_id, None, container_name, port_range, email)
                logger.info("Spawned replacement container %s", container_name)
            except Exception:
                logger.error("Failed to spawn replacement %s", container_name, exc_info=True)
                return False

    logger.info(
        "[DIAG] _attach_container: about to call attach_to_container for user=%s tab=%s container=%s cols=%s rows=%s",
        user_id,
        tab_id,
        container_name,
        cols,
        rows,
    )
    try:
        proc, fd = attach_to_container(container_name, tab_id, cols=cols, rows=rows)
    except Exception:
        logger.error("Failed to attach to container for user %s", user_id, exc_info=True)
        return False

    session_info["fd"] = fd
    # Track the docker exec subprocess so disconnect can terminate it —
    # otherwise the `docker exec -it ... dtach` process orphans and
    # holds a connection to dockerd (additional fds) until its stdin EOFs.
    session_info["proc"] = proc
    session_info["container_attached"] = True
    logger.info(
        "[DIAG] _attach_container: SUCCESS for user=%s tab=%s fd=%s pid=%s",
        user_id,
        tab_id,
        fd,
        proc.pid,
    )
    return True


def _cleanup_user_container(user_id: str, container_name: str):
    """Force-remove a container and drop it from tracking."""
    try:
        subprocess.run(["docker", "rm", "-f", container_name], check=False)
    except Exception as e:
        logger.error("Failed to cleanup container %s: %s", container_name, e)
    user_containers.pop(user_id, None)


def set_winsize(fd, row, col, xpix=0, ypix=0):
    winsize = struct.pack("HHHH", row, col, xpix, ypix)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


def _release_session_resources(sid: str, session: dict) -> None:
    """Close the PTY master fd and terminate the docker-exec subprocess
    associated with a session. Safe to call more than once.

    Fd leak history: slave_fd (in attach_to_container) and the docker exec
    subprocess both used to leak on every terminal attach, accumulating until
    the backend hit EMFILE. This helper is the single cleanup
    path. Call it from every code path that drops a session.
    """
    fd = session.pop("fd", None)
    if fd is not None:
        try:
            os.close(fd)
            logger.info("[DIAG] released fd=%s for sid=%s", fd, sid)
        except OSError as e:
            logger.warning("os.close(fd=%s) for sid=%s failed: %s", fd, sid, e)

    proc = session.pop("proc", None)
    if proc is not None:
        try:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=2)
            logger.info(
                "[DIAG] released proc pid=%s exit=%s for sid=%s",
                proc.pid, proc.returncode, sid,
            )
        except Exception as e:
            logger.warning("Failed to terminate proc for sid=%s: %s", sid, e)

    # Kill the orphaned dtach *client* inside the container.
    # proc.terminate() kills the docker CLI, but the containerised dtach
    # client process survives and leaks.  The dtach *server* (which keeps
    # the shell alive) is in a different session (setsid) and is NOT
    # affected — only the now-detached client is killed.
    container_name = session.get("container_name")
    tab_id = session.get("tab_id")
    if container_name and tab_id:
        sock_path = f"/tmp/3compute-tab{tab_id}.sock"
        try:
            subprocess.run(
                [
                    "docker", "exec", container_name, "sh", "-c",
                    # Find dtach client PIDs for this socket.  The server is
                    # the parent of the shell — skip it.  Clients have no
                    # child processes, so we kill PIDs whose only matching
                    # entry is the dtach -A line itself.
                    f"for pid in $(ps -o pid,args 2>/dev/null "
                    f"| grep '[d]tach -A {sock_path}' "
                    f"| awk '{{print $1}}'); do "
                    f"  children=$(ps -o ppid 2>/dev/null | grep -c \"^\\s*$pid$\"); "
                    f"  [ \"$children\" -eq 0 ] && kill \"$pid\" 2>/dev/null; "
                    f"done",
                ],
                check=False,
                timeout=5,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception as e:
            logger.debug("dtach client cleanup for sid=%s: %s", sid, e)


# ---------------------------------------------------------------------------
# Idle poller (daemon threads — identical logic to Flask version)
# ---------------------------------------------------------------------------

_INFRA_PREFIXES = (
    "/sbin/tini",
    "dtach ",
    "-sh",
    "sh",
    "-ash",
)
_INFRA_EXACT = frozenset({"sleep infinity", "bash"})


def _start_idle_poller(user_id: str):
    ev = _cleanup_timers.pop(user_id, None)
    if ev:
        ev.set()

    stop_event = threading.Event()
    _cleanup_timers[user_id] = stop_event

    def poller():
        time.sleep(POLL_INTERVAL)
        container_info = user_containers.get(user_id)
        if not container_info:
            return
        container = container_info["container_name"]

        while not stop_event.is_set():
            result = subprocess.run(
                ["docker", "top", container],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            if result.returncode != 0:
                logger.warning(
                    "docker top failed for %s: %s",
                    container,
                    result.stderr.strip(),
                )
                time.sleep(POLL_INTERVAL)
                continue

            lines = result.stdout.splitlines()
            if len(lines) < 2:
                time.sleep(POLL_INTERVAL)
                continue

            header_cols = lines[0].split()
            try:
                cmd_idx = header_cols.index("COMMAND")
            except ValueError:
                cmd_idx = len(header_cols) - 1

            user_procs = []
            for proc_line in lines[1:]:
                cols = proc_line.split(None, len(header_cols) - 1)
                cmd_str = cols[cmd_idx] if cmd_idx < len(cols) else ""
                if cmd_str in _INFRA_EXACT:
                    continue
                if any(cmd_str.startswith(p) for p in _INFRA_PREFIXES):
                    continue
                user_procs.append(cmd_str)

            if not user_procs:
                # Re-check stop_event — user may have reconnected while we were polling
                if stop_event.is_set():
                    break
                logger.info("No user processes left in %s, removing it", container)
                subprocess.run(["docker", "rm", "-f", container], check=False)
                user_containers.pop(user_id, None)
                # Clear all output buffers for this user
                for key in [k for k in _tab_output_buffers if k[0] == user_id]:
                    _tab_output_buffers.pop(key, None)
                break

            time.sleep(POLL_INTERVAL)

    threading.Thread(target=poller, daemon=True).start()


def _cancel_idle_poller(user_id: str):
    ev = _cleanup_timers.pop(user_id, None)
    if ev:
        ev.set()


# ---------------------------------------------------------------------------
# PTY read loop
# ---------------------------------------------------------------------------


def _blocking_pty_read(fd: int, max_read_bytes: int) -> str | None:
    """Non-blocking read from a PTY master fd.  Runs in a worker thread."""
    data_ready, _, _ = select.select([fd], [], [], 0)
    if data_ready:
        raw = os.read(fd, max_read_bytes)
        if not raw:
            logger.info("[DIAG] _blocking_pty_read: EOF (empty read) on fd=%s", fd)
            raise OSError("PTY EOF — empty read")
        return raw.decode(errors="ignore")
    return None


async def read_and_forward_pty_output(sid: str):
    """Background coroutine: stream PTY output to the client via Socket.IO."""
    max_read_bytes = 1024 * 20
    session = session_map.get(sid)
    logger.info(
        "[DIAG] read_loop: STARTED for sid=%s user=%s tab=%s",
        sid,
        session.get("user_id") if session else "?",
        session.get("tab_id") if session else "?",
    )
    first_output = True
    try:
        while True:
            await sio.sleep(0.01)
            session = session_map.get(sid)
            if not session:
                logger.info("[DIAG] read_loop: session gone for sid=%s, stopping", sid)
                break
            fd = session.get("fd")
            if not fd:
                continue
            try:
                output = await asyncio.to_thread(_blocking_pty_read, fd, max_read_bytes)
                if output:
                    if first_output:
                        logger.info(
                            "[DIAG] read_loop: FIRST output for sid=%s, len=%d, repr=%.200r",
                            sid,
                            len(output),
                            output,
                        )
                        first_output = False
                    await sio.emit("pty-output", {"output": output}, to=sid)
                    # After the first output (shell's SIGWINCH clear-screen),
                    # replay the stashed buffer so old content reappears on
                    # top of the now-cleared terminal.
                    pending = session.pop("_pending_replay", None)
                    if pending:
                        logger.info(
                            "[DIAG] read_loop: replaying %d bytes after first output for sid=%s",
                            len(pending), sid,
                        )
                        await sio.emit("pty-output", {"output": pending}, to=sid)
                        # Replace the buffer with the replayed content so history
                        # accumulates across reloads.  We intentionally skip
                        # buffering `output` (the SIGWINCH clear-screen) — adding
                        # it would embed a mid-stream clear that wipes history on
                        # the next reload.
                        buf_key = (session["user_id"], session["tab_id"])
                        if len(pending) > _MAX_OUTPUT_BUFFER:
                            pending = pending[-_MAX_OUTPUT_BUFFER:]
                        _tab_output_buffers[buf_key] = pending
                    else:
                        buf_key = (session["user_id"], session["tab_id"])
                        prev = _tab_output_buffers.get(buf_key, "")
                        combined = prev + output
                        if len(combined) > _MAX_OUTPUT_BUFFER:
                            combined = combined[-_MAX_OUTPUT_BUFFER:]
                        _tab_output_buffers[buf_key] = combined
            except (OSError, ValueError) as exc:
                logger.info("[DIAG] read_loop: PTY error for sid=%s: %s", sid, exc)
                await sio.emit("terminal-restart-required", {}, to=sid)
                break
    except asyncio.CancelledError:
        pass
    finally:
        logger.info("[DIAG] read_loop: STOPPED for sid=%s", sid)


# ---------------------------------------------------------------------------
# Socket.IO event handlers
# ---------------------------------------------------------------------------


async def handle_connect(sid, environ, auth=None):
    logger.info("handle_connect called for sid=%s", sid)

    user_id = _get_user_id_from_environ(environ)
    if not user_id:
        logger.warning("Unauthenticated user tried to connect")
        return False

    user = await asyncio.to_thread(_get_user, user_id)
    if not user:
        logger.warning("User %s not found in database", user_id)
        return False

    tab_id = _get_query_param(environ, "tabId", "1")
    port_range = (user.port_start, user.port_end)
    email = user.email

    logger.info("Client %s connected for tab %s", sid, tab_id)

    _cancel_idle_poller(user_id)

    container_name = await asyncio.to_thread(_ensure_container, user_id, port_range, email)
    if not container_name:
        await sio.emit(
            "error",
            {"message": "Failed to create terminal session. Please try again."},
            to=sid,
        )
        return False

    # Check for existing sessions for same user+tab (stale from prior connection).
    # A reconnect (page refresh, engine-io ping timeout, network blip) fires
    # a fresh connect before socket.io ever fires disconnect on the old sid,
    # so the old session's pty + subprocess are still live. Release them
    # proactively — otherwise every reconnect leaks one pty pair + one docker
    # exec subprocess until the backend exhausts fds.
    existing_sids = [s for s, info in session_map.items() if info["user_id"] == user_id and info["tab_id"] == tab_id]
    if existing_sids:
        logger.warning(
            "[DIAG] handle_connect: DUPLICATE session(s) for user=%s tab=%s existing_sids=%s new_sid=%s; releasing old sessions",
            user_id,
            tab_id,
            existing_sids,
            sid,
        )
        for stale_sid in existing_sids:
            stale = session_map.pop(stale_sid, None)
            if stale is not None:
                await asyncio.to_thread(_release_session_resources, stale_sid, stale)

    session_info = {
        "fd": None,
        "user_id": user_id,
        "container_attached": False,
        "container_name": container_name,
        "tab_id": tab_id,
        "port_range": port_range,
        "email": email,
    }
    session_map[sid] = session_info
    logger.info(
        "[DIAG] handle_connect: session created for sid=%s user=%s tab=%s container=%s (total sessions: %d)",
        sid,
        user_id,
        tab_id,
        container_name,
        len(session_map),
    )

    # Don't attach the PTY yet — wait for the first resize so the backend has
    # the frontend's actual dimensions before the shell renders anything.
    session_info["read_loop_started"] = False
    logger.info(
        "[DIAG] handle_connect: DONE for sid=%s, waiting for first resize to attach and start read loop",
        sid,
    )


async def handle_disconnect(sid):
    session = session_map.pop(sid, None)
    if not session:
        logger.info("[DIAG] handle_disconnect: sid=%s not in session_map, ignoring", sid)
        return

    user_id = session["user_id"]
    tab_id = session.get("tab_id")
    logger.info(
        "[DIAG] handle_disconnect: sid=%s user=%s tab=%s fd=%s",
        sid, user_id, tab_id, session.get("fd"),
    )

    # Offload close + terminate to a thread — proc.wait() blocks up to a few
    # seconds, which would stall the event loop.
    await asyncio.to_thread(_release_session_resources, sid, session)

    remaining = [s["tab_id"] for s in session_map.values() if s["user_id"] == user_id]
    logger.info("[DIAG] handle_disconnect: remaining sessions for user=%s: %s", user_id, remaining)
    if not remaining:
        logger.info("[DIAG] handle_disconnect: no sessions left, starting idle poller for user=%s", user_id)
        _start_idle_poller(user_id)


async def handle_pty_input(sid, data):
    session = session_map.get(sid)
    if not session:
        logger.info("[DIAG] handle_pty_input: sid=%s NOT in session_map", sid)
        return
    fd = session.get("fd")
    if fd:
        await asyncio.to_thread(os.write, fd, data["input"].encode())
    else:
        logger.warning("[DIAG] handle_pty_input: sid=%s has NO fd, dropping input", sid)


async def handle_resize(sid, data):
    cols = data.get("cols")
    rows = data.get("rows")
    logger.info("[DIAG] handle_resize: sid=%s cols=%s rows=%s", sid, cols, rows)

    if sid not in session_map:
        logger.warning(
            "[DIAG] handle_resize: sid=%s NOT in session_map (keys=%s)",
            sid,
            list(session_map.keys()),
        )
        return

    session_info = session_map[sid]
    user_id = session_info["user_id"]
    tab_id = session_info["tab_id"]
    attached = session_info["container_attached"]
    read_started = session_info.get("read_loop_started", "N/A")

    logger.info(
        "[DIAG] handle_resize: sid=%s user=%s tab=%s attached=%s read_started=%s fd=%s",
        sid,
        user_id,
        tab_id,
        attached,
        read_started,
        session_info.get("fd"),
    )

    if not attached:
        logger.info("[DIAG] handle_resize: lazy-attaching for sid=%s", sid)
        try:
            success = await asyncio.to_thread(
                _attach_container,
                session_info,
                cols=cols,
                rows=rows,
            )
            if not success:
                logger.info("[DIAG] handle_resize: lazy-attach FAILED for sid=%s", sid)
                await sio.emit(
                    "error",
                    {"message": "Failed to connect to terminal. Please try again."},
                    to=sid,
                )
                return
            logger.info("[DIAG] handle_resize: lazy-attach SUCCESS for sid=%s fd=%s", sid, session_info.get("fd"))
        except Exception as e:
            logger.error("[DIAG] handle_resize: lazy-attach EXCEPTION for sid=%s: %s", sid, e)
            await sio.emit(
                "error",
                {"message": "Failed to connect to terminal. Please try again."},
                to=sid,
            )
            return

    if not isinstance(cols, int) or not isinstance(rows, int) or cols <= 0 or rows <= 0:
        logger.warning("[DIAG] handle_resize: INVALID dimensions cols=%s rows=%s sid=%s", cols, rows, sid)
        return

    fd = session_info["fd"]
    try:
        set_winsize(fd, rows, cols)
        logger.info("[DIAG] handle_resize: set_winsize OK fd=%s rows=%s cols=%s sid=%s", fd, rows, cols, sid)
    except Exception as e:
        logger.error("[DIAG] handle_resize: set_winsize FAILED: %s", e, exc_info=True)

    # Start the read loop on the first resize — now the PTY has correct
    # dimensions so the terminal won't render at the wrong size.
    if not session_info.get("read_loop_started"):
        session_info["read_loop_started"] = True
        logger.info("[DIAG] handle_resize: STARTING read loop for sid=%s (first resize)", sid)
        # Stash buffered output for replay AFTER the first dtach output.
        # dtach -r winch sends SIGWINCH on reattach, which makes the shell
        # clear the screen (ESC[H ESC[J).  If we replayed before that,
        # the clear would immediately wipe the replayed content.
        buf_key = (user_id, tab_id)
        buffered = _tab_output_buffers.get(buf_key)
        if buffered:
            session_info["_pending_replay"] = buffered
            logger.info(
                "[DIAG] handle_resize: stashed %d bytes for post-attach replay sid=%s",
                len(buffered), sid,
            )
        sio.start_background_task(read_and_forward_pty_output, sid)
    else:
        logger.info("[DIAG] handle_resize: read loop already running for sid=%s", sid)


# ---------------------------------------------------------------------------
# Close-tab helper (invoked from the HTTP router)
# ---------------------------------------------------------------------------


async def close_tab(user_id: str, tab_id: str) -> tuple[str, int]:
    """Kill the dtach session for a tab.  Returns ``(message, status_code)``."""
    _tab_output_buffers.pop((user_id, tab_id), None)
    container_info = user_containers.get(user_id)
    if not container_info:
        return "No container for user", 404

    container_name = container_info["container_name"]
    session_name = f"3compute-tab{tab_id}"
    sock_path = f"/tmp/{session_name}.sock"
    try:
        # Find the dtach server process for this socket and kill it.
        # When dtach dies, the child shell receives SIGHUP and exits.
        await asyncio.to_thread(
            subprocess.run,
            [
                "docker",
                "exec",
                container_name,
                "sh", "-c",
                f"pid=$(ps -o pid,args 2>/dev/null | grep '[d]tach.*{session_name}' | awk '{{print $1}}' | head -1); "
                f"[ -n \"$pid\" ] && kill \"$pid\" 2>/dev/null; "
                f"rm -f {sock_path}",
            ],
            check=False,
        )
    except subprocess.CalledProcessError as e:
        logger.warning(
            "Failed to kill dtach session %s in %s: %s",
            session_name,
            container_name,
            e,
        )
        return "No session or already terminated", 200

    return "Terminated", 200


async def notify_files_changed(user_id: str) -> None:
    """Emit a ``files-changed`` event to every socket session owned by *user_id*."""
    for sid, session in session_map.items():
        if session.get("user_id") == user_id:
            await sio.emit("files-changed", {}, to=sid)


_register_handlers()

__all__ = [
    "sio",
    "user_containers",
    "discover_existing_containers",
    "start_pollers_for_orphaned",
    "close_tab",
    "notify_files_changed",
]
