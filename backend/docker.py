import os
import pty
import subprocess
import platform
import logging
import json
import re

import psutil

logger = logging.getLogger("docker")
MAX_USERS = 20
num_cpus = os.cpu_count() or 1
memory_mb = psutil.virtual_memory().total // (1024 * 1024)

cpu_per_user = 1.0
memory_per_user = round(memory_mb / MAX_USERS, 2)

# Container user UID/GID that matches the dedicated system user
CONTAINER_USER_UID = 999
CONTAINER_USER_GID = 995

CLASSROOMS_JSON_FILE = "backend/classrooms.json"
CLASSROOMS_ROOT = "/tmp/classrooms"


def prepare_user_directory(user_id):
    """Ensure user directory exists with correct ownership before container creation"""
    user_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(user_dir, exist_ok=True)
    # Removed placeholder classrooms dir creation (not needed now)
    try:
        os.chown(user_dir, CONTAINER_USER_UID, CONTAINER_USER_GID)
        os.chmod(user_dir, 0o755)
    except OSError as e:
        logger.warning(f"Failed to set ownership for {user_dir}: {e}")


def volume_exists(volume_name: str) -> bool:  # legacy placeholder (unused now)
    return False


def ensure_user_volume(user_id: str) -> str:  # legacy placeholder
    raise RuntimeError("Named volumes disabled in reverted configuration")


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


def _load_classrooms_for_user(user_id: str):
    try:
        if os.path.exists(CLASSROOMS_JSON_FILE):
            with open(CLASSROOMS_JSON_FILE, "r") as f:
                data = json.load(f)
            # filter classrooms where user is instructor
            return [c for c in data.values() if user_id in c.get("instructors", [])]
    except Exception as e:
        logger.warning(f"Failed loading classrooms for mounts: {e}")
    return []


def _slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "-", name).strip("-")
    return name or "classroom"


def spawn_container(user_id, slave_fd, container_name, port_range=None):
    # Only create a new container if one doesn't already exist
    if container_exists(container_name):
        logger.warning(f"Container {container_name} already exists, not creating a new one")
        raise RuntimeError(f"Container {container_name} already exists")

    # Prepare host directory with correct ownership before mounting
    prepare_user_directory(user_id)

    mount_spec = f"/tmp/uploads/{user_id}:/app"

    cmd = [
        "docker",
        "run",
        "-d",
        "--rm",
        "--name",
        container_name,
        "--hostname",
        "3compute",
        "--network=isolated_net",
        "--cap-drop=ALL",
        "--user=999:995",
        "--security-opt",
        "no-new-privileges",
        "--cpus",
        str(cpu_per_user),
        "--memory",
        f"{memory_per_user}m",
        "-v",
        mount_spec,
    ]

    # Add classroom mounts (read-write shared) under /app/classrooms/<id>
    classrooms = _load_classrooms_for_user(str(user_id))
    slug_map = {}  # id -> slug
    used_slugs = set()
    for c in classrooms:
        class_id = c.get("id")
        name = c.get("name") or class_id
        host_path = os.path.join(CLASSROOMS_ROOT, class_id)
        if not os.path.isdir(host_path):
            logger.warning(f"Expected classroom dir missing: {host_path}")
            continue
        slug = _slugify(name)
        base_slug = slug
        # collision handling
        if slug in used_slugs:
            suffix = class_id.split("-")[0][:4]
            slug = f"{base_slug}-{suffix}"
        used_slugs.add(slug)
        slug_map[class_id] = slug
        # mount to /classrooms/<id>
        target_dir = f"/classrooms/{class_id}"
        cmd.extend(["-v", f"{host_path}:{target_dir}"])

    if port_range:
        cmd.extend(["-p", f"{port_range[0]}-{port_range[1]}:{port_range[0]}-{port_range[1]}"])

    # Environment variable with mapping (JSON) for optional in-container logic
    if slug_map:
        import base64

        mapping_json = json.dumps(slug_map)
        b64 = base64.b64encode(mapping_json.encode()).decode()
        cmd.extend(["-e", f"CLASSROOM_SLUG_MAP_B64={b64}"])

    cmd.append("3compute")

    logger.info(f"[{user_id}] Docker run building with {len(slug_map)} classroom mounts")

    try:
        subprocess.run(cmd, check=True)
        logger.info(f"[{user_id}] Started container '{container_name}'")
    except subprocess.CalledProcessError as e:
        logger.error(f"[{user_id}] Failed to start container '{container_name}': {e}")
        raise

    # Create symlinks inside container: /app/<slug> -> /classrooms/<id>
    if slug_map:
        link_commands = [
            # ensure /classrooms permissions root-owned, non-writable by user (555)
            "chown root:root /classrooms || true",
            "chmod 555 /classrooms || true",
        ]
        for cid, slug in slug_map.items():
            # Set classroom dir writable by container user (so they can edit contents) but not by others
            link_commands.append(f"chown 999:995 /classrooms/{cid} || true")
            link_commands.append(f"chmod 555 /classrooms/{cid} || true")
            # Ensure subdirs exist
            link_commands.append(f"mkdir -p /classrooms/{cid}/templates /classrooms/{cid}/participants || true")
            # templates & participants dirs: make directory itself read/execute only (no create/delete) but contents writeable -> tricky.
            # Approach: directory 755 allows creates; we instead set 755 on classroom, 555 on participants, 755 on templates then inside templates user can write.
            link_commands.append(f"chmod 755 /classrooms/{cid}/templates || true")
            link_commands.append(f"chmod 555 /classrooms/{cid}/participants || true")
            # Remove existing slug path if any (file, dir, or symlink) then create symlink
            link_commands.append(f"rm -rf /app/{slug} || true")
            link_commands.append(f"ln -s /classrooms/{cid} /app/{slug}")
        link_commands.append("echo 'Symlinks + permissions applied'")
        shell_cmd = " && ".join(link_commands)
        try:
            subprocess.run(["docker", "exec", container_name, "sh", "-lc", shell_cmd], check=True)
            logger.info(f"[{user_id}] Applied symlinks and permissions for classrooms (slug map: {slug_map})")
        except subprocess.CalledProcessError as e:
            logger.error(f"[{user_id}] Failed applying symlinks/permissions: {e}")

    # Template-based README generation for each classroom (overwrite each restart)
    if slug_map:
        template_path = os.path.join("backend", "classroom_readme_template.md")
        template_content = None
        try:
            with open(template_path, "r") as tf:
                template_content = tf.read()
        except Exception as e:
            logger.warning(f"[{user_id}] Could not read classroom README template: {e}")

        if template_content:
            # Load full classrooms data again to fetch access codes (already small file)
            access_codes = {}
            try:
                if os.path.exists(CLASSROOMS_JSON_FILE):
                    with open(CLASSROOMS_JSON_FILE, "r") as f:
                        all_cls = json.load(f)
                    for cid, data in all_cls.items():
                        access_codes[cid] = data.get("access_code", "UNKNOWN")
            except Exception as e:
                logger.warning(f"[{user_id}] Failed reloading classrooms for README access codes: {e}")

            # Build a single shell script that writes each README (quote-safe using cat EOF)
            write_cmds = []
            for cid, slug in slug_map.items():
                access_code = access_codes.get(cid, "UNKNOWN")
                # Perform placeholder substitution server-side to avoid complicated shell escaping
                content = (
                    template_content
                    .replace("{{CLASSROOM_NAME}}", cid)  # Name not readily available here; could extend mapping if needed
                    .replace("{{CLASSROOM_ID}}", cid)
                    .replace("{{ACCESS_CODE}}", access_code)
                    .replace("{{SLUG}}", slug)
                )
                # Escape any EOF markers inside content (unlikely) by replacing literal EOF lines
                safe_content = content.replace("EOF", "E0F")
                write_cmds.append(
                    f"if [ -d /classrooms/{cid} ]; then cat > /classrooms/{cid}/README.md <<'EOF'\n{safe_content}\nEOF\nfi"
                )
            script = " ; ".join(write_cmds)
            try:
                subprocess.run(["docker", "exec", container_name, "sh", "-lc", script], check=True)
                logger.info(f"[{user_id}] Classroom README files written from template")
            except subprocess.CalledProcessError as e:
                logger.warning(f"[{user_id}] Failed writing README files from template: {e}")


def attach_to_container(container_name, tab_id="1"):
    # Check if container is running
    if not container_is_running(container_name):
        logger.error(f"Cannot attach to container '{container_name}' - it is not running")
        raise RuntimeError(f"Container {container_name} is not running")

    master_fd, slave_fd = pty.openpty()
    # Create unique tmux session for each tab
    session_name = f"3compute-tab{tab_id}"
    cmd = [
        "docker",
        "exec",
        "-it",
        container_name,
        "sh",
        "-lc",
        f"tmux new-session -d -A -s {session_name}; tmux attach -t {session_name}",
    ]
    logger.info(f"Attaching to container '{container_name}' with tmux session '{session_name}'")
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
