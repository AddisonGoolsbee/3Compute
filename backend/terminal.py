import os
import pty
import fcntl
import struct
import termios
import logging
import select
import subprocess
import time
import threading

from flask import request, current_app
from flask_socketio import SocketIO
from flask_login import current_user

from .docker import attach_to_container, spawn_container

logger = logging.getLogger("terminal")

socketio: SocketIO = None  # will be assigned in init
# each user gets a single container. But if they have multiple tabs open, each session will get its own sid (resize properties etc)
# user_id → container info
user_containers = {}
# sid → container info + fd
session_map = {}
POLL_INTERVAL = 4
# Active cleanup timers per user
_cleanup_timers: dict[int, threading.Event] = {}


def init_terminal(socketio_instance):
    global socketio
    socketio = socketio_instance
    _register_handlers()
    logger.debug("Terminal module initialized")


def _register_handlers():
    socketio.on_event("connect", handle_connect)
    socketio.on_event("disconnect", handle_disconnect)
    socketio.on_event("pty-input", handle_pty_input)
    socketio.on_event("resize", handle_resize)
    socketio.on_event("tmux-new-window", new_window)
    socketio.on_event("tmux-select-window", select_window)


def set_winsize(fd, row, col, xpix=0, ypix=0):
    winsize = struct.pack("HHHH", row, col, xpix, ypix)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


def read_and_forward_pty_output(sid, is_authed):
    if not is_authed:
        return

    max_read_bytes = 1024 * 20
    fd = session_map[sid]["fd"]
    try:
        while True:
            socketio.sleep(0.01)
            if fd:
                try:
                    data_ready, _, _ = select.select([fd], [], [], 0)
                    if data_ready:
                        output = os.read(fd, max_read_bytes).decode(errors="ignore")
                        socketio.emit("pty-output", {"output": output}, to=sid)
                except (OSError, ValueError):
                    break
    finally:
        logger.info(f"Stopping read thread for {sid}")


def handle_pty_input(data):
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    sid = request.sid
    if sid in session_map:
        fd = session_map[sid]["fd"]
        os.write(fd, data["input"].encode())


def handle_resize(data):
    logger.debug(f"handle_resize called with data: {data}")

    if not current_user.is_authenticated:
        logger.warning("Unauthenticated user attempted to resize terminal")
        return

    sid = request.sid
    logger.debug(f"Resize request from session {sid}")

    if sid not in session_map:
        logger.warning(f"Session {sid} not found in session_map. Available sessions: {list(session_map.keys())}")
        return

    session_info = session_map[sid]
    fd = session_info["fd"]
    user_id = session_info["user_id"]

    logger.debug(f"Resizing terminal for user {user_id}, session {sid}, fd {fd}")
    logger.debug(f"New dimensions: rows={data.get('rows', 'MISSING')}, cols={data.get('cols', 'MISSING')}")

    try:
        set_winsize(fd, data["rows"], data["cols"])
        logger.debug(f"Successfully resized terminal to {data['rows']}x{data['cols']}")
    except KeyError as e:
        logger.error(f"Missing required resize data: {e}. Available keys: {list(data.keys())}")
    except Exception as e:
        logger.error(f"Failed to resize terminal: {e}", exc_info=True)


# Polls containers with no active users to see if they're idle e.g. no processes other than infra processes are running
def _start_idle_poller(user_id: int):
    # If there’s already a timer, cancel it
    ev = _cleanup_timers.pop(user_id, None)
    if ev:
        ev.set()

    stop_event = threading.Event()
    _cleanup_timers[user_id] = stop_event

    def poller():
        time.sleep(POLL_INTERVAL)
        container = user_containers[user_id]["container_name"]
        while not stop_event.is_set():
            # 1) Run `docker top` with no extra flags
            result = subprocess.run(
                ["docker", "top", container],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            if result.returncode != 0:
                logging.warning(f"docker top failed for {container}: {result.stderr.strip()}")
                time.sleep(POLL_INTERVAL)
                continue

            lines = result.stdout.splitlines()
            if len(lines) < 2:
                # no processes listed (weird), try again later
                time.sleep(POLL_INTERVAL)
                continue

            # 2) Figure out which column is COMMAND
            header_cols = lines[0].split()
            try:
                cmd_idx = header_cols.index("COMMAND")
            except ValueError:
                # fallback to last column
                cmd_idx = len(header_cols) - 1

            # 3) Collect “real” processes (skip infrastructure)
            procs = []
            for proc_line in lines[1:]:
                cols = proc_line.split(None, len(header_cols) - 1)
                cmd_str = cols[cmd_idx]
                # logger.debug(f"cmd: {cmd_str}")

                # POLLER IGNORE LIST — these are the processes we know are NOT the user's
                if (
                    cmd_str.startswith("/sbin/tini")
                    or cmd_str.startswith("tmux ")
                    or cmd_str.startswith("-sh")
                    or cmd_str.startswith("sh")
                    or cmd_str.startswith("-ash")
                    or cmd_str == "sleep infinity"
                    or cmd_str == "bash"
                ):
                    # infra processes—ignore
                    continue
                procs.append(cmd_str)

            if not procs:
                logging.info(f"No user processes left in {container}, removing it")
                subprocess.run(["docker", "rm", "-f", container], check=False)
                user_containers.pop(user_id, None)
                break

    t = threading.Thread(target=poller, daemon=True)
    t.start()


def _cancel_idle_poller(user_id: int):
    ev = _cleanup_timers.pop(user_id, None)
    if ev:
        ev.set()


def handle_connect():
    logger.debug("Handling new terminal connection")
    if not current_user.is_authenticated:
        logger.warning("unauthenticated user tried to connect")
        # Properly disconnect the unauthorized user
        socketio.emit("error", {"message": "Unauthorized"}, to=request.sid)
        # Use disconnect() from the request context
        from flask_socketio import disconnect

        disconnect()
        return

    user_id = current_user.id
    sid = request.sid
    logger.info(f"client {sid} connected")

    _cancel_idle_poller(user_id)

    container_name = f"user-container-{user_id}"
    if user_id not in user_containers:
        port_range = current_user.port_range
        spawn_container(user_id, None, container_name, port_range)
        user_containers[user_id] = {"container_name": container_name, "port_range": port_range}
        logging.info(f"Spawned new container for user {user_id}")

    # Attach to tmux session in container
    proc, fd = attach_to_container(container_name)
    logger.info(f"Attached to tmux in container for user {user_id}")

    session_map[sid] = {"fd": fd, "user_id": user_id}
    socketio.start_background_task(read_and_forward_pty_output, sid, True)


def handle_disconnect():
    sid = request.sid
    session = session_map.pop(sid, None)
    if not session:
        return

    user_id = session["user_id"]
    # close the PTY, kill docker-exec proc, etc…
    try:
        os.close(session["fd"])
    except:
        pass

    # If that was the last live session for this user, start the poller
    if not any(s["user_id"] == user_id for s in session_map.values()):
        _start_idle_poller(user_id)


# TODO: Multiple tabs; this is not working
def new_window(data):
    container = user_containers[current_user.id]["container_name"]
    win = data["windowIndex"]
    subprocess.run(["docker", "exec", container, "tmux", "new-window", "-t", f"3compute:{win}", "-n", win], check=False)


def select_window(data):
    container = user_containers[current_user.id]["container_name"]
    win = data["windowIndex"]
    subprocess.run(["docker", "exec", container, "tmux", "select-window", "-t", f"3compute:{win}"], check=False)


__all__ = ["init_terminal", "user_containers"]
