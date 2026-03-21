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
    sio.on("tmux-new-window", handler=handle_tmux_new_window)
    sio.on("tmux-select-window", handler=handle_tmux_select_window)


# ---------------------------------------------------------------------------
# Container discovery (sync — called once at startup)
# ---------------------------------------------------------------------------

def discover_existing_containers():
    """Scan Docker for user containers and restore them to tracking."""
    try:
        result = subprocess.run(
            [
                "docker", "ps", "-a",
                "--filter", "name=user-container-",
                "--format", "{{.Names}}",
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
    container_name = f"user-container-{user_id}"

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
                    subprocess.run(
                        ["docker", "start", container_name], check=True
                    )
                    user_containers[user_id] = {
                        "container_name": container_name,
                        "port_range": port_range,
                    }
                except subprocess.CalledProcessError:
                    logger.warning(
                        "Restart failed for %s, spawning new container",
                        container_name,
                    )
                    subprocess.run(
                        ["docker", "rm", "-f", container_name], check=False
                    )
                    try:
                        spawn_container(
                            user_id, None, container_name, port_range, email
                        )
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
                spawn_container(
                    user_id, None, container_name, port_range, email
                )
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
        if user_containers[user_id]["port_range"] is None:
            user_containers[user_id]["port_range"] = port_range

        if not container_is_running(container_name):
            logger.info("Container %s not running, restarting", container_name)
            try:
                subprocess.run(
                    ["docker", "start", container_name], check=True
                )
                logger.info("Restarted container %s", container_name)
            except subprocess.CalledProcessError:
                logger.warning(
                    "Restart failed for %s, spawning replacement",
                    container_name,
                )
                _cleanup_user_container(user_id, container_name)
                try:
                    spawn_container(
                        user_id, None, container_name, port_range, email
                    )
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


def _attach_container(session_info: dict) -> bool:
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
            logger.warning(
                "Failed to restart %s; spawning replacement", container_name
            )
            port_range = session_info.get("port_range")
            email = session_info.get("email")
            try:
                spawn_container(
                    user_id, None, container_name, port_range, email
                )
                logger.info("Spawned replacement container %s", container_name)
            except Exception:
                logger.error(
                    "Failed to spawn replacement %s", container_name, exc_info=True
                )
                return False

    try:
        _proc, fd = attach_to_container(container_name, tab_id)
    except Exception:
        logger.error(
            "Failed to attach to container for user %s", user_id, exc_info=True
        )
        return False

    session_info["fd"] = fd
    session_info["container_attached"] = True
    logger.info(
        "Attached to container for user %s tab %s in handle_resize()",
        user_id,
        tab_id,
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


# ---------------------------------------------------------------------------
# Idle poller (daemon threads — identical logic to Flask version)
# ---------------------------------------------------------------------------

_INFRA_PREFIXES = (
    "/sbin/tini",
    "tmux ",
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
                logger.info(
                    "No user processes left in %s, removing it", container
                )
                subprocess.run(["docker", "rm", "-f", container], check=False)
                user_containers.pop(user_id, None)
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
        if raw:
            return raw.decode(errors="ignore")
    return None


async def read_and_forward_pty_output(sid: str):
    """Background coroutine: stream PTY output to the client via Socket.IO."""
    max_read_bytes = 1024 * 20
    try:
        while True:
            await sio.sleep(0.01)
            session = session_map.get(sid)
            if not session:
                break
            fd = session.get("fd")
            if not fd:
                continue
            try:
                output = await asyncio.to_thread(
                    _blocking_pty_read, fd, max_read_bytes
                )
                if output:
                    await sio.emit("pty-output", {"output": output}, to=sid)
            except (OSError, ValueError):
                break
    except asyncio.CancelledError:
        pass
    finally:
        logger.info("Stopping read task for %s", sid)


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

    container_name = await asyncio.to_thread(
        _ensure_container, user_id, port_range, email
    )
    if not container_name:
        await sio.emit(
            "error",
            {"message": "Failed to create terminal session. Please try again."},
            to=sid,
        )
        return False

    session_map[sid] = {
        "fd": None,
        "user_id": user_id,
        "container_attached": False,
        "container_name": container_name,
        "tab_id": tab_id,
        "port_range": port_range,
        "email": email,
    }

    sio.start_background_task(read_and_forward_pty_output, sid)


async def handle_disconnect(sid):
    session = session_map.pop(sid, None)
    if not session:
        return

    user_id = session["user_id"]
    fd = session.get("fd")
    if fd:
        try:
            os.close(fd)
        except Exception as e:
            logger.error("Failed to close PTY for user %s: %s", user_id, e)

    if not any(s["user_id"] == user_id for s in session_map.values()):
        _start_idle_poller(user_id)


async def handle_pty_input(sid, data):
    session = session_map.get(sid)
    if not session:
        return
    fd = session.get("fd")
    if fd:
        await asyncio.to_thread(os.write, fd, data["input"].encode())


async def handle_resize(sid, data):
    logger.debug("handle_resize called with data: %s", data)

    if sid not in session_map:
        logger.warning(
            "Session %s not found in session_map. Available: %s",
            sid,
            list(session_map.keys()),
        )
        return

    session_info = session_map[sid]
    user_id = session_info["user_id"]

    if not session_info["container_attached"]:
        try:
            success = await asyncio.to_thread(_attach_container, session_info)
            if not success:
                await sio.emit(
                    "error",
                    {
                        "message": "Failed to connect to terminal. Please try again."
                    },
                    to=sid,
                )
                return
        except Exception as e:
            logger.error(
                "Failed to attach to container for user %s: %s", user_id, e
            )
            await sio.emit(
                "error",
                {"message": "Failed to connect to terminal. Please try again."},
                to=sid,
            )
            return

    fd = session_info["fd"]
    try:
        set_winsize(fd, data["rows"], data["cols"])
    except KeyError as e:
        logger.error(
            "Missing required resize data: %s. Available keys: %s",
            e,
            list(data.keys()),
        )
    except Exception as e:
        logger.error("Failed to resize terminal: %s", e, exc_info=True)


async def handle_tmux_new_window(sid, data):
    session = session_map.get(sid)
    if not session:
        return
    container_info = user_containers.get(session["user_id"])
    if not container_info:
        return
    container = container_info["container_name"]
    win = data["windowIndex"]
    await asyncio.to_thread(
        subprocess.run,
        [
            "docker", "exec", container,
            "tmux", "new-window",
            "-t", f"3compute:{win}",
            "-n", str(win),
        ],
        check=False,
    )


async def handle_tmux_select_window(sid, data):
    session = session_map.get(sid)
    if not session:
        return
    container_info = user_containers.get(session["user_id"])
    if not container_info:
        return
    container = container_info["container_name"]
    win = data["windowIndex"]
    await asyncio.to_thread(
        subprocess.run,
        [
            "docker", "exec", container,
            "tmux", "select-window",
            "-t", f"3compute:{win}",
        ],
        check=False,
    )


# ---------------------------------------------------------------------------
# Close-tab helper (invoked from the HTTP router)
# ---------------------------------------------------------------------------

async def close_tab(user_id: str, tab_id: str) -> tuple[str, int]:
    """Kill the tmux session for a tab.  Returns ``(message, status_code)``."""
    container_info = user_containers.get(user_id)
    if not container_info:
        return "No container for user", 404

    container_name = container_info["container_name"]
    session_name = f"3compute-tab{tab_id}"
    try:
        await asyncio.to_thread(
            subprocess.run,
            [
                "docker", "exec", container_name,
                "tmux", "kill-session", "-t", session_name,
            ],
            check=True,
        )
    except subprocess.CalledProcessError as e:
        logger.warning(
            "Failed to kill tmux session %s in %s: %s",
            session_name,
            container_name,
            e,
        )
        return "No session or already terminated", 200

    return "Terminated", 200


_register_handlers()

__all__ = [
    "sio",
    "user_containers",
    "discover_existing_containers",
    "start_pollers_for_orphaned",
    "close_tab",
]
