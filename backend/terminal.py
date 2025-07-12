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


def _discover_existing_containers():
    """Discover existing user containers and restore them to tracking"""
    from .docker import container_exists, container_is_running

    try:
        # Find all containers with the user-container- prefix
        result = subprocess.run(
            ["docker", "ps", "-a", "--filter", "name=user-container-", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=True,
        )

        for container_name in result.stdout.strip().split("\n"):
            if not container_name:
                continue

            # Extract user ID from container name
            try:
                user_id = int(container_name.replace("user-container-", ""))
            except ValueError:
                continue  # Skip containers that don't match our naming pattern

            # Check if container is running
            if container_is_running(container_name):
                logger.info(f"Found running container {container_name} for user {user_id}")
                # We'll need to get the port range from the user object when they connect
                user_containers[user_id] = {"container_name": container_name, "port_range": None}
            else:
                logger.info(f"Found stopped container {container_name} for user {user_id}")
                # For stopped containers, we'll let the connection logic handle restarting them
                user_containers[user_id] = {"container_name": container_name, "port_range": None}

    except subprocess.CalledProcessError as e:
        logger.warning(f"Failed to discover existing containers: {e}")


def _start_pollers_for_orphaned_containers():
    """Start idle pollers for containers that were discovered but have no active sessions"""
    for user_id in list(user_containers.keys()):
        # Check if this user has any active sessions
        if not any(s["user_id"] == user_id for s in session_map.values()):
            logger.info(f"Starting idle poller for orphaned container user {user_id}")
            _start_idle_poller(user_id)


def init_terminal(socketio_instance):
    global socketio
    socketio = socketio_instance
    _register_handlers()
    _discover_existing_containers()
    _start_pollers_for_orphaned_containers()  # Start pollers for discovered containers
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
    if not current_user.is_authenticated:
        return

    sid = request.sid
    if sid in session_map:
        fd = session_map[sid]["fd"]
        set_winsize(fd, data["rows"], data["cols"])


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


def _cleanup_user_container(user_id, container_name):
    """Clean up a user's container and remove from tracking"""
    try:
        subprocess.run(["docker", "rm", "-f", container_name], check=False)
    except:
        pass
    user_containers.pop(user_id, None)


def handle_connect(auth=None):
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
        # Check if container already exists and use it
        from .docker import container_exists, container_is_running

        if container_exists(container_name):
            if container_is_running(container_name):
                logger.info(f"Found existing running container {container_name}, reusing it")
                # Add it to our tracking
                user_containers[user_id] = {"container_name": container_name, "port_range": current_user.port_range}
            else:
                logger.info(f"Found existing stopped container {container_name}, restarting it")
                try:
                    subprocess.run(["docker", "start", container_name], check=True)
                    user_containers[user_id] = {"container_name": container_name, "port_range": current_user.port_range}
                    logger.info(f"Restarted container {container_name}")
                except subprocess.CalledProcessError:
                    logger.warning(f"Failed to restart container {container_name}, creating new one")
                    # Only remove if restart failed
                    subprocess.run(["docker", "rm", "-f", container_name], check=False)
                    try:
                        spawn_container(user_id, None, container_name, current_user.port_range)
                        user_containers[user_id] = {
                            "container_name": container_name,
                            "port_range": current_user.port_range,
                        }
                        logging.info(f"Spawned new container for user {user_id}")
                    except Exception as e:
                        logger.error(f"Failed to spawn new container for user {user_id}: {e}")
                        socketio.emit(
                            "error", {"message": "Failed to create terminal session. Please try again."}, to=sid
                        )
                        return
        else:
            # No existing container, create a new one
            port_range = current_user.port_range
            try:
                spawn_container(user_id, None, container_name, port_range)
                user_containers[user_id] = {"container_name": container_name, "port_range": port_range}
                logging.info(f"Spawned new container for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to spawn container for user {user_id}: {e}")
                socketio.emit("error", {"message": "Failed to create terminal session. Please try again."}, to=sid)
                return
    else:
        # User has a container tracked, but check if it's actually running
        from .docker import container_is_running

        # Update port_range if it was None (from discovery)
        if user_containers[user_id]["port_range"] is None:
            user_containers[user_id]["port_range"] = current_user.port_range

        if not container_is_running(container_name):
            logger.info(f"Container {container_name} exists but is not running, restarting it")
            try:
                subprocess.run(["docker", "start", container_name], check=True)
                logger.info(f"Restarted container {container_name}")
            except subprocess.CalledProcessError:
                logger.warning(f"Failed to restart container {container_name}, creating new one")
                _cleanup_user_container(user_id, container_name)
                try:
                    spawn_container(user_id, None, container_name, current_user.port_range)
                    user_containers[user_id] = {"container_name": container_name, "port_range": current_user.port_range}
                except Exception as e:
                    logger.error(f"Failed to spawn new container for user {user_id}: {e}")
                    socketio.emit("error", {"message": "Failed to create terminal session. Please try again."}, to=sid)
                    return

    # Attach to tmux session in container
    try:
        proc, fd = attach_to_container(container_name)
        logger.info(f"Attached to tmux in container for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to attach to container {container_name}: {e}")
        # Clean up the container if we can't attach to it
        _cleanup_user_container(user_id, container_name)
        # Notify the user of the error
        socketio.emit("error", {"message": "Failed to connect to terminal. Please try again."}, to=sid)
        return

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


def new_window(data):
    container = user_containers[current_user.id]["container_name"]
    win = data["windowIndex"]
    subprocess.run(["docker", "exec", container, "tmux", "new-window", "-t", f"3compute:{win}", "-n", win], check=False)


def select_window(data):
    container = user_containers[current_user.id]["container_name"]
    win = data["windowIndex"]
    subprocess.run(["docker", "exec", container, "tmux", "select-window", "-t", f"3compute:{win}"], check=False)


__all__ = ["init_terminal", "user_containers"]
