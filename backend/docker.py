import os
import pty
import subprocess
import platform
import logging

import psutil

logger = logging.getLogger("docker")
MAX_USERS = 20
num_cpus = os.cpu_count() or 1
memory_mb = psutil.virtual_memory().total // (1024 * 1024)

cpu_per_user = round(num_cpus / MAX_USERS, 2)
memory_per_user = round(memory_mb / MAX_USERS, 2)


def setup_isolated_network(network_name="isolated_net"):
    try:
        # Check if the network exists
        subprocess.run(
            ["docker", "network", "inspect", network_name],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except subprocess.CalledProcessError:
        # Network doesn't exist, so create it
        subprocess.run(
            [
                "docker",
                "network",
                "create",
                "--driver",
                "bridge",
                "--opt",
                "com.docker.network.bridge.enable_icc=false",  # Disable inter-container communication
                network_name,
            ],
            check=True,
        )
        logger.info(f"Network {network_name} created successfully.")

    if platform.system() != "Linux":
        return

    try:
        # Get the bridge name for the Docker network
        network_id = subprocess.run(
            ["docker", "network", "inspect", "-f", "{{.Id}}", network_name],
            check=True,
            stdout=subprocess.PIPE,
            text=True,
        ).stdout.strip()[:12]

        # Add iptables rule to block communication with the host
        if os.getenv("CI") != "true":
            subprocess.run(
                ["iptables", "-I", "DOCKER-USER", "-i", f"br-{network_id}", "-o", "docker0", "-j", "DROP"],
                check=True,
            )
            logger.info(f"Blocked host communication for network {network_name}.")
        else:
            logger.warning("Skipping iptables config in CI")
    except subprocess.CalledProcessError as e:
        logger.warning(f"Failed to block host communication: {str(e)}")


def container_exists(container_name):
    """Check if a container exists (running or stopped)"""
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--filter", f"name={container_name}", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=True,
        )
        return container_name in result.stdout.strip()
    except subprocess.CalledProcessError:
        return False


def container_is_running(container_name):
    """Check if a container is currently running"""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", f"name={container_name}", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=True,
        )
        return container_name in result.stdout.strip()
    except subprocess.CalledProcessError:
        return False


def spawn_container(user_id, slave_fd, container_name, port_range=None):
    # Only create a new container if one doesn't already exist
    if container_exists(container_name):
        logger.warning(f"Container {container_name} already exists, not creating a new one")
        raise RuntimeError(f"Container {container_name} already exists")

    cmd = [
        "docker",
        "run",
        "-d",
        "--rm",
        "--name",
        container_name,
        "--hostname",
        "3compute",
        "--network=isolated_net",  # prevent containers from accessing other containers or host, but allows internet
        "--cap-drop=ALL",  # prevent a bunch of admin linux stuff
        "--user=1000:1000",  # login as a non-root user
        # Security profiles
        "--security-opt",
        "no-new-privileges",  # prevent container from gaining priviledge
        # "--security-opt",
        # "seccomp",  # restricts syscalls
        # Resource limits
        "--cpus",
        str(cpu_per_user),
        "--memory",
        f"{memory_per_user}m",
        # TODO: bandwidth limit
        # TODO: disk limit, perhaps by making everything read-only and adding a volume?
        "-v",
        f"/tmp/uploads/{user_id}:/app",
    ]

    if port_range:
        cmd.extend(["-p", f"{port_range[0]}-{port_range[1]}:{port_range[0]}-{port_range[1]}"])

    cmd.append("3compute")

    logger.info(f"[{user_id}] Attempting to spawn container '{container_name}' with cmd: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        logger.info(f"[{user_id}] Successfully started container '{container_name}'")
    except subprocess.CalledProcessError as e:
        logger.error(f"[{user_id}] Failed to start container '{container_name}': {e}")
        raise


def attach_to_container(container_name):
    # Check if container is running
    if not container_is_running(container_name):
        logger.error(f"Cannot attach to container '{container_name}' - it is not running")
        raise RuntimeError(f"Container {container_name} is not running")

    master_fd, slave_fd = pty.openpty()
    cmd = [
        "docker",
        "exec",
        "-it",
        container_name,
        "sh",
        "-lc",
        "tmux new-session -d -A -s 3compute; tmux attach -t 3compute",
    ]
    logger.info(f"Attaching to container '{container_name}' with tmux session")
    try:
        proc = subprocess.Popen(cmd, stdin=slave_fd, stdout=slave_fd, stderr=slave_fd, close_fds=True)
        return proc, master_fd
    except Exception as e:
        logger.error(f"Failed to attach to container '{container_name}': {e}")
        raise


__all__ = [
    "setup_isolated_network",
    "spawn_container",
    "attach_to_container",
    "container_exists",
    "container_is_running",
]
