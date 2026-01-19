import json
import logging
import os
import platform
import pty
import re
import shutil
import subprocess

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
                [
                    "iptables",
                    "-I",
                    "DOCKER-USER",
                    "-i",
                    f"br-{network_id}",
                    "-o",
                    "docker0",
                    "-j",
                    "DROP",
                ],
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
            [
                "docker",
                "ps",
                "-a",
                "--filter",
                f"name={container_name}",
                "--format",
                "{{.Names}}",
            ],
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
            [
                "docker",
                "ps",
                "--filter",
                f"name={container_name}",
                "--format",
                "{{.Names}}",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return container_name in result.stdout.strip()
    except subprocess.CalledProcessError:
        return False


def _load_classrooms_for_user(user_id: str, include_archived: bool = False):
    """Return tuple (instructor_classrooms, participant_classrooms).

    Uses per-user archived_by list to determine if a classroom is archived.
    If include_archived is True, returns ONLY archived classrooms for the user.
    """
    inst, part = [], []
    try:
        if os.path.exists(CLASSROOMS_JSON_FILE):
            with open(CLASSROOMS_JSON_FILE, "r") as f:
                data = json.load(f)
            for c in data.values():
                archived_by = c.get("archived_by", [])
                is_archived_for_user = user_id in archived_by

                if user_id in c.get("instructors", []):
                    if include_archived:
                        if is_archived_for_user:
                            inst.append(c)
                    else:
                        if not is_archived_for_user:
                            inst.append(c)
                elif user_id in c.get("participants", []):
                    if include_archived:
                        if is_archived_for_user:
                            part.append(c)
                    else:
                        if not is_archived_for_user:
                            part.append(c)
    except Exception as e:
        logger.warning(f"Failed loading classrooms for mounts: {e}")
    return inst, part




def _slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "-", name).strip("-")
    return name or "classroom"


def spawn_container(
    user_id, slave_fd, container_name, port_range=None, user_email: str | None = None
):
    # Only create a new container if one doesn't already exist
    if container_exists(container_name):
        logger.warning(
            f"Container {container_name} already exists, not creating a new one"
        )
        raise RuntimeError(f"Container {container_name} already exists")

    # Prepare host directory with correct ownership before mounting
    prepare_user_directory(user_id)

    # Clean up all existing classroom symlinks in user's directory
    # This ensures archived classrooms are properly removed
    user_dir = f"/tmp/uploads/{user_id}"
    archive_dir = os.path.join(user_dir, "archive")
    try:
        for entry in os.listdir(user_dir):
            entry_path = os.path.join(user_dir, entry)
            if entry == "archive":
                # Remove old archive folder entirely
                if os.path.isdir(entry_path):
                    shutil.rmtree(entry_path)
                elif os.path.islink(entry_path):
                    os.unlink(entry_path)
                logger.debug(f"[{user_id}] Removed old archive folder")
            elif os.path.islink(entry_path):
                target = os.readlink(entry_path)
                # Check if it's a classroom symlink
                if target.startswith(CLASSROOMS_ROOT) or target.startswith("/classrooms/"):
                    os.unlink(entry_path)
                    logger.debug(f"[{user_id}] Removed old classroom symlink: {entry}")
    except Exception as e:
        logger.warning(f"[{user_id}] Failed cleaning up old symlinks: {e}")

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

    # Add classroom mounts for instructor + participant (active + archived)
    inst_classrooms, part_classrooms = _load_classrooms_for_user(str(user_id))
    archived_inst, archived_part = _load_classrooms_for_user(str(user_id), include_archived=True)

    slug_map = {}  # id -> slug (instructor) or participant variant
    name_map = {}  # id -> human-readable classroom name
    participant_mode = {}  # id -> True if user is participant (not instructor)
    used_slugs = set()
    # Reserve "archive" slug
    used_slugs.add("archive")

    # Mount ALL classrooms (active + archived) so they can be accessed
    all_classrooms_to_mount = set()
    for c in inst_classrooms + part_classrooms + archived_inst + archived_part:
        all_classrooms_to_mount.add(c.get("id"))

    for class_id in all_classrooms_to_mount:
        host_path = os.path.join(CLASSROOMS_ROOT, class_id)
        if os.path.isdir(host_path):
            target_dir = f"/classrooms/{class_id}"
            cmd.extend(["-v", f"{host_path}:{target_dir}"])

    # Only create symlinks for active (non-archived) classrooms
    all_classrooms = inst_classrooms + part_classrooms
    for c in all_classrooms:
        class_id = c.get("id")
        name = c.get("name") or class_id
        host_path = os.path.join(CLASSROOMS_ROOT, class_id)
        if not os.path.isdir(host_path):
            logger.warning(f"Expected classroom dir missing: {host_path}")
            continue
        is_participant = c not in inst_classrooms
        slug = _slugify(name)
        base_slug = slug
        if slug in used_slugs:
            suffix = class_id.split("-")[0][:4]
            slug = f"{base_slug}-{suffix}"
        used_slugs.add(slug)
        slug_map[class_id] = slug
        name_map[class_id] = name
        participant_mode[class_id] = is_participant

    if port_range:
        cmd.extend(
            ["-p", f"{port_range[0]}-{port_range[1]}:{port_range[0]}-{port_range[1]}"]
        )

    # Environment variable with mapping (JSON) for optional in-container logic
    if slug_map:
        import base64

        mapping_json = json.dumps({"slugs": slug_map, "participant": participant_mode})
        b64 = base64.b64encode(mapping_json.encode()).decode()
        cmd.extend(["-e", f"CLASSROOM_SLUG_MAP_B64={b64}"])

    cmd.append("3compute")

    logger.info(
        f"[{user_id}] Docker run building with {len(slug_map)} classroom mounts"
    )

    try:
        subprocess.run(cmd, check=True)
        logger.info(f"[{user_id}] Started container '{container_name}'")
    except subprocess.CalledProcessError as e:
        logger.error(f"[{user_id}] Failed to start container '{container_name}': {e}")
        raise

    # Create symlinks: instructor -> /classrooms/<id>; participant -> /classrooms/<id>/participants/<email>
    if slug_map:
        sanitized_email = (user_email or "participant").replace("/", "_")
        link_commands = [
            "chown root:root /classrooms || true",
            "chmod 555 /classrooms || true",
        ]
        for cid, slug in slug_map.items():
            link_commands.append(f"chown 999:995 /classrooms/{cid} || true")
            link_commands.append(
                f"mkdir -p /classrooms/{cid}/templates /classrooms/{cid}/participants || true"
            )
            # basic perms; keep participants dir traversable
            link_commands.append(f"chmod 775 /classrooms/{cid}/templates || true")
            link_commands.append(f"chmod 775 /classrooms/{cid}/participants || true")
            target_path = (
                f"/classrooms/{cid}"
                if not participant_mode.get(cid)
                else f"/classrooms/{cid}/participants/{sanitized_email}"
            )
            if participant_mode.get(cid):
                # create personal participant folder
                link_commands.append(
                    f"mkdir -p /classrooms/{cid}/participants/{sanitized_email} || true"
                )
                link_commands.append(
                    f"chown 999:995 /classrooms/{cid}/participants/{sanitized_email} || true"
                )
                link_commands.append(
                    f"chmod 775 /classrooms/{cid}/participants/{sanitized_email} || true"
                )
                # create symlink to templates inside participant folder so students can access them
                link_commands.append(
                    f"rm -rf /classrooms/{cid}/participants/{sanitized_email}/classroom-templates || true"
                )
                link_commands.append(
                    f"ln -s /classrooms/{cid}/templates /classrooms/{cid}/participants/{sanitized_email}/classroom-templates"
                )
            # Create symlink inside container for immediate access
            link_commands.append(f"rm -rf /app/{slug} || true")
            link_commands.append(f"ln -s {target_path} /app/{slug}")

            # Also create symlink on HOST filesystem so backend can detect it
            # Map container paths to host paths
            if participant_mode.get(cid):
                # Student: link to participant folder on host
                host_source = f"/tmp/uploads/{user_id}/{slug}"
                host_target = f"{CLASSROOMS_ROOT}/{cid}/participants/{sanitized_email}"
            else:
                # Instructor: link to classroom root on host
                host_source = f"/tmp/uploads/{user_id}/{slug}"
                host_target = f"{CLASSROOMS_ROOT}/{cid}"

            try:
                # Ensure base classroom directories exist on host
                os.makedirs(host_target, exist_ok=True)

                # For participants, mirror classroom-templates symlink on host
                if participant_mode.get(cid):
                    templates_target = os.path.join(CLASSROOMS_ROOT, cid, "templates")
                    os.makedirs(templates_target, exist_ok=True)

                    templates_link = os.path.join(host_target, "classroom-templates")
                    if os.path.islink(templates_link) or os.path.exists(templates_link):
                        if os.path.islink(templates_link):
                            os.unlink(templates_link)
                        elif os.path.isdir(templates_link):
                            shutil.rmtree(templates_link)
                        else:
                            os.remove(templates_link)
                    os.symlink(templates_target, templates_link)

                # Remove existing symlink or file if any
                if os.path.islink(host_source) or os.path.exists(host_source):
                    if os.path.islink(host_source):
                        os.unlink(host_source)
                    elif os.path.isdir(host_source):
                        shutil.rmtree(host_source)
                    else:
                        os.remove(host_source)

                # Ensure parent directory exists for symlink
                os.makedirs(os.path.dirname(host_source), exist_ok=True)

                # Create the symlink on host
                os.symlink(host_target, host_source)
                logger.info(
                    f"[{user_id}] Created host symlink: {host_source} -> {host_target}"
                )
            except Exception as e:
                logger.error(
                    f"[{user_id}] Failed to create host symlink {host_source}: {e}"
                )
        link_commands.append(
            "echo 'Symlinks + permissions (participant-aware) applied'"
        )
        try:
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_name,
                    "sh",
                    "-lc",
                    " && ".join(link_commands),
                ],
                check=True,
            )
            logger.info(
                f"[{user_id}] Applied participant-aware symlinks (map: {slug_map})"
            )
        except subprocess.CalledProcessError as e:
            logger.error(f"[{user_id}] Failed applying participant symlinks: {e}")

    # Create archive folder with symlinks to archived classrooms
    archived_inst, archived_part = _load_classrooms_for_user(str(user_id), include_archived=True)
    all_archived = archived_inst + archived_part
    if all_archived:
        archive_dir = f"/tmp/uploads/{user_id}/archive"
        try:
            os.makedirs(archive_dir, exist_ok=True)
            os.chown(archive_dir, CONTAINER_USER_UID, CONTAINER_USER_GID)
            os.chmod(archive_dir, 0o755)

            archive_used_slugs = set()
            for c in all_archived:
                class_id = c.get("id")
                class_name = c.get("name") or class_id
                host_path = os.path.join(CLASSROOMS_ROOT, class_id)
                if not os.path.isdir(host_path):
                    continue

                is_participant = c not in archived_inst
                slug = _slugify(class_name)
                base_slug = slug
                if slug in archive_used_slugs:
                    suffix = class_id.split("-")[0][:4]
                    slug = f"{base_slug}-{suffix}"
                archive_used_slugs.add(slug)

                # Determine target path (same logic as active classrooms)
                sanitized_email = (user_email or "participant").replace("/", "_")
                if is_participant:
                    host_target = f"{CLASSROOMS_ROOT}/{class_id}/participants/{sanitized_email}"
                else:
                    host_target = f"{CLASSROOMS_ROOT}/{class_id}"

                # Ensure target exists
                os.makedirs(host_target, exist_ok=True)

                # Create symlink in archive folder
                archive_link = os.path.join(archive_dir, slug)
                if os.path.islink(archive_link) or os.path.exists(archive_link):
                    if os.path.islink(archive_link):
                        os.unlink(archive_link)
                    elif os.path.isdir(archive_link):
                        shutil.rmtree(archive_link)
                    else:
                        os.remove(archive_link)
                os.symlink(host_target, archive_link)
                logger.debug(f"[{user_id}] Created archive symlink: {archive_link} -> {host_target}")

            logger.info(f"[{user_id}] Created archive folder with {len(all_archived)} archived classrooms")
        except Exception as e:
            logger.error(f"[{user_id}] Failed creating archive folder: {e}")

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
                logger.warning(
                    f"[{user_id}] Failed reloading classrooms for README access codes: {e}"
                )

            # Build a single shell script that writes each README (quote-safe using cat EOF)
            write_cmds = []
            for cid, slug in slug_map.items():
                access_code = access_codes.get(cid, "UNKNOWN")
                class_name = name_map.get(cid, cid)
                # Perform placeholder substitution server-side to avoid complicated shell escaping
                content = (
                    template_content.replace("{{CLASSROOM_NAME}}", class_name)
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
                subprocess.run(
                    ["docker", "exec", container_name, "sh", "-lc", script], check=True
                )
                logger.info(f"[{user_id}] Classroom README files written from template")
            except subprocess.CalledProcessError as e:
                logger.warning(
                    f"[{user_id}] Failed writing README files from template: {e}"
                )


def attach_to_container(container_name, tab_id="1"):
    # Check if container is running
    if not container_is_running(container_name):
        logger.error(
            f"Cannot attach to container '{container_name}' - it is not running"
        )
        raise RuntimeError(f"Container {container_name} is not running")

    master_fd, slave_fd = pty.openpty()
    # Create unique tmux session for each tab
    session_name = f"3compute-tab{tab_id}"
    tmux_conf = "/home/myuser/.tmux.conf"
    # Source the config after attaching to ensure settings are applied even if server was already running
    cmd = [
        "docker",
        "exec",
        "-it",
        container_name,
        "sh",
        "-lc",
        f"tmux -f {tmux_conf} new-session -d -A -s {session_name}; tmux source-file {tmux_conf} 2>/dev/null; tmux attach -t {session_name}",
    ]
    logger.info(
        f"Attaching to container '{container_name}' with tmux session '{session_name}'"
    )
    try:
        proc = subprocess.Popen(
            cmd, stdin=slave_fd, stdout=slave_fd, stderr=slave_fd, close_fds=True
        )
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
