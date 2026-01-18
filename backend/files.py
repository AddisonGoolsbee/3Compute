import json
import logging
import os
import subprocess

from flask import Blueprint, request
from flask_login import current_user

from .classrooms import CLASSROOMS_JSON_FILE
from .docker import CLASSROOMS_ROOT, CONTAINER_USER_GID, CONTAINER_USER_UID

files_bp = Blueprint("upload", __name__)


def _translate_container_path(path: str) -> str:
    """Convert absolute container classroom paths to host paths."""
    if not path:
        return path
    if path.startswith("/classrooms/"):
        tail = path[len("/classrooms/") :].lstrip("/")
        return os.path.join(CLASSROOMS_ROOT, tail)
    return path


def set_container_ownership(path):
    """Set ownership of a file/directory to match the container user"""
    try:
        os.chown(path, CONTAINER_USER_UID, CONTAINER_USER_GID)
        # Also ensure proper permissions
        if os.path.isdir(path):
            os.chmod(path, 0o755)  # drwxr-xr-x for directories
        else:
            os.chmod(path, 0o644)  # -rw-r--r-- for files
    except OSError as e:
        # Log the error but don't fail - this might happen in dev environments
        logger = logging.getLogger("files")
        logger.warning(f"Failed to set ownership for {path}: {e}")


def _resolve_classroom_path(upload_dir: str, rel_path: str) -> str | None:
    """If rel_path begins with a symlink that targets /classrooms/<...>,
    map it to the corresponding host path under CLASSROOMS_ROOT.

    Returns the mapped absolute host path, or None if not a classroom symlink path.
    """
    try:
        # Normalize relative path
        safe_rel = (rel_path or "").lstrip("/")
        if not safe_rel:
            return None
        parts = safe_rel.split("/", 1)
        top = parts[0]
        remainder = parts[1] if len(parts) > 1 else ""
        top_abs = os.path.join(upload_dir, top)
        if not os.path.islink(top_abs):
            return None
        target = os.readlink(top_abs)
        if target.startswith("/classrooms/"):
            tail = target[len("/classrooms/") :].lstrip("/")
        elif target.startswith(CLASSROOMS_ROOT):
            tail = target[len(CLASSROOMS_ROOT) :].lstrip("/")
        else:
            return None
        host_base = os.path.join(CLASSROOMS_ROOT, tail)
        candidate = os.path.join(host_base, remainder) if remainder else host_base

        try:
            resolved = os.path.realpath(candidate)
        except OSError:
            resolved = candidate

        translated = _translate_container_path(resolved)
        normalized = os.path.normpath(translated)

        # Ensure the final path stays within the classrooms root
        try:
            if os.path.commonpath([CLASSROOMS_ROOT, normalized]) != CLASSROOMS_ROOT:
                return None
        except ValueError:
            return None

        return normalized
    except OSError:
        return None


def _append_classroom_tree_entries(
    file_list: list[str], slug_name: str, host_base: str, _visited_paths=None
):
    """Append directory and file entries for a classroom mount under the given slug name."""
    if not os.path.isdir(host_base):
        return

    # Track visited paths to avoid infinite symlink loops
    if _visited_paths is None:
        _visited_paths = set()

    # Resolve to canonical path to detect loops
    try:
        canonical = os.path.realpath(host_base)
        if canonical in _visited_paths:
            return
        _visited_paths.add(canonical)
    except OSError:
        return

    # Root of the classroom under this slug
    file_list.append(f"{slug_name}/")

    # First pass: handle symlinks specially at this level
    try:
        for entry in os.listdir(host_base):
            full_path = os.path.join(host_base, entry)
            if os.path.islink(full_path):
                try:
                    # Check if symlink target exists and is a directory
                    target = os.readlink(full_path)
                    # Try to resolve container paths to host paths
                    if target.startswith("/classrooms/"):
                        target_host = target.replace(
                            "/classrooms/", f"{CLASSROOMS_ROOT}/"
                        )
                    else:
                        # Relative or other absolute path
                        if not os.path.isabs(target):
                            target_host = os.path.join(host_base, target)
                        else:
                            target_host = target

                    # Check if it points to a directory
                    if os.path.isdir(target_host):
                        # Add as directory
                        dir_entry = f"{slug_name}/{entry}/"
                        if dir_entry not in file_list:
                            file_list.append(dir_entry)
                            # Recursively add contents
                            _append_classroom_tree_entries(
                                file_list,
                                f"{slug_name}/{entry}",
                                target_host,
                                _visited_paths,
                            )
                    else:
                        # Symlink to file
                        file_entry = f"{slug_name}/{entry}"
                        if file_entry not in file_list:
                            file_list.append(file_entry)
                except (OSError, IOError) as e:
                    logger = logging.getLogger("files")
                    logger.debug(f"Failed to process symlink {full_path}: {e}")
    except Exception as e:
        logger = logging.getLogger("files")
        logger.warning(f"Failed to process top-level symlinks in {host_base}: {e}")

    # Second pass: use os.walk for regular files and directories (skip symlinks)
    for root, dirs, files in os.walk(host_base, followlinks=False):
        rel = os.path.relpath(root, host_base)
        prefix = slug_name if rel == "." else f"{slug_name}/{rel}"

        # Filter out symlinks from dirs since we already handled them above
        for d in list(dirs):
            full_path = os.path.join(root, d)
            if not os.path.islink(full_path):
                entry = f"{prefix}/{d}/"
                if entry not in file_list:
                    file_list.append(entry)
            else:
                # Remove from dirs to prevent os.walk from descending
                dirs.remove(d)

        # Add regular files (not symlinks)
        for name in files:
            full_path = os.path.join(root, name)
            if not os.path.islink(full_path):
                entry = f"{prefix}/{name}"
                if entry not in file_list:
                    file_list.append(entry)


@files_bp.post("/upload")
def upload():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400
    for f in files:
        file_path = os.path.join(upload_dir, f.filename)
        f.save(file_path)
        set_container_ownership(file_path)

    return "File uploaded successfully", 200


@files_bp.post("/upload-folder")
def upload_folder():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400

    for f in files:
        safe_path = os.path.normpath(os.path.join(upload_dir, f.filename))
        if not safe_path.startswith(upload_dir):
            continue  # prevent directory traversal
        # Resolve classroom symlink destinations to host paths if needed
        classroom_target = _resolve_classroom_path(upload_dir, f.filename)
        dest_path = classroom_target if classroom_target else safe_path
        dir_path = os.path.dirname(dest_path)
        os.makedirs(dir_path, exist_ok=True)
        set_container_ownership(dir_path)
        f.save(dest_path)
        set_container_ownership(dest_path)

    # Check if move-into parameter is provided
    move_into = request.form.get("move-into")
    if move_into:
        # Execute an Enter before the cd command in the user's container using tmux send-keys
        container_name = f"user-container-{user_id}"
        try:
            # First, send an Enter key
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_name,
                    "tmux",
                    "send-keys",
                    "-t",
                    "3compute",
                    "Enter",
                ],
                check=True,
            )
            # Then, send the cd command
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_name,
                    "tmux",
                    "send-keys",
                    "-t",
                    "3compute",
                    f"cd /app/{move_into}",
                    "Enter",
                ],
                check=True,
            )
        except subprocess.CalledProcessError:
            # If the directory doesn't exist or cd fails, continue without error
            pass

    return "Folder uploaded successfully", 200


@files_bp.get("/list-files")
def list_files():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"

    if not os.path.exists(upload_dir):
        return {"files": []}, 200

    file_tree = []
    expanded_symlinks: set[str] = set()
    classroom_symlinks: dict[str, str] = {}

    logger = logging.getLogger("files")
    logger.debug(f"[{user_id}] Listing files in {upload_dir}")

    top_level_symlinks: set[str] = set()

    # Detect top-level classroom symlinks first so the backend knows about them
    try:
        for entry in os.listdir(upload_dir):
            full_path = os.path.join(upload_dir, entry)
            if not os.path.islink(full_path):
                continue

            target = os.readlink(full_path)
            logger.debug(f"[{user_id}] Found top-level symlink: {entry} -> {target}")

            tail = None
            if target.startswith(CLASSROOMS_ROOT):
                tail = target[len(CLASSROOMS_ROOT) :].lstrip("/")
            elif target.startswith("/classrooms/"):
                tail = target[len("/classrooms/") :].lstrip("/")
            else:
                logger.debug(
                    f"[{user_id}] Symlink {entry} does not target classrooms directory, skipping"
                )
                continue

            if not tail:
                continue

            host_base = os.path.join(CLASSROOMS_ROOT, tail)
            if not os.path.exists(host_base):
                logger.warning(
                    f"[{user_id}] Host classroom path missing for symlink {entry}: {host_base}"
                )
                continue

            _append_classroom_tree_entries(file_tree, entry, host_base)
            expanded_symlinks.add(f"{entry}/")
            top_level_symlinks.add(entry)

            classroom_id = tail.split("/", 1)[0]
            logger.debug(
                f"[{user_id}] Recording classroom symlink: {entry} -> {classroom_id}"
            )
            classroom_symlinks[entry] = classroom_id
    except FileNotFoundError:
        pass

    # Include user files under /tmp/uploads/<id>
    for root, dirs, files in os.walk(upload_dir):
        # Include directories (with trailing slash) so empty folders are discoverable
        for d in list(dirs):
            full_path = os.path.join(root, d)
            relative_path = os.path.relpath(full_path, upload_dir)

            # Skip top-level classroom symlinks already processed
            if relative_path.split(os.sep)[0] in top_level_symlinks:
                dirs.remove(d)
                continue

            # If this directory is a symlink to a classroom, expand its tree from the host path
            if os.path.islink(full_path):
                target = os.readlink(full_path)
                logger.debug(f"[{user_id}] Found symlink: {relative_path} -> {target}")
                if target.startswith("/classrooms/"):
                    tail = target[len("/classrooms/") :].lstrip("/")
                    host_base = os.path.join(CLASSROOMS_ROOT, tail)
                    _append_classroom_tree_entries(file_tree, relative_path, host_base)
                    expanded_symlinks.add(f"{relative_path}/")
                    if "/" not in relative_path:
                        classroom_id = tail.split("/", 1)[0]
                        logger.debug(
                            f"[{user_id}] Recording classroom symlink: {relative_path} -> {classroom_id}"
                        )
                        classroom_symlinks[relative_path] = classroom_id
                    # Prevent os.walk from descending into this symlink path
                    dirs.remove(d)
                    continue
            file_tree.append(f"{relative_path}/")

        # Include files
        for name in files:
            full_path = os.path.join(root, name)
            relative_path = os.path.relpath(full_path, upload_dir)
            if os.path.islink(full_path):
                target = os.readlink(full_path)
                if target.startswith("/classrooms/"):
                    tail = target[len("/classrooms/") :].lstrip("/")
                    host_base = os.path.join(CLASSROOMS_ROOT, tail)
                    _append_classroom_tree_entries(file_tree, relative_path, host_base)
                    expanded_symlinks.add(relative_path)
                    continue
            file_tree.append(relative_path)

    if expanded_symlinks:
        file_tree = [entry for entry in file_tree if entry not in expanded_symlinks]

    classroom_meta: dict[str, dict] = {}
    logger.debug(f"[{user_id}] Found classroom_symlinks: {classroom_symlinks}")

    if classroom_symlinks:
        all_classrooms = {}
        try:
            if os.path.exists(CLASSROOMS_JSON_FILE):
                with open(CLASSROOMS_JSON_FILE, "r") as f:
                    all_classrooms = json.load(f)
                logger.debug(
                    f"[{user_id}] Loaded classrooms.json with {len(all_classrooms)} classrooms"
                )
        except Exception as e:
            logger.warning(f"[{user_id}] Failed loading classrooms metadata: {e}")

        for slug, cid in classroom_symlinks.items():
            info = {}
            if isinstance(all_classrooms, dict):
                info = all_classrooms.get(cid, {}) or {}
            classroom_meta[slug] = {
                "id": cid,
                "name": info.get("name"),
                "archived": info.get("archived", False),
            }
            logger.debug(
                f"[{user_id}] Added classroom_meta[{slug}] = {classroom_meta[slug]}"
            )

    logger.debug(f"[{user_id}] Returning classroom_meta: {classroom_meta}")
    return {"files": file_tree, "classroomMeta": classroom_meta}, 200


@files_bp.post("/move")
def move_file_or_folder():
    """Move/rename a file or directory within the user's workspace.

    Expects JSON body: { "source": "/path/from", "destination": "/path/to" }
    Both paths are relative to the user's upload directory. Leading slashes are allowed.
    """
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    data = request.get_json(silent=True) or {}
    source_param = (data.get("source") or "").lstrip("/")
    destination_param = (data.get("destination") or "").lstrip("/")
    overwrite = bool(data.get("overwrite"))

    if not source_param or not destination_param:
        return "Invalid path", 400

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"

    src_path = os.path.normpath(os.path.join(upload_dir, source_param))
    dst_path = os.path.normpath(os.path.join(upload_dir, destination_param))

    # Security: ensure resulting paths stay within the user's directory
    if not src_path.startswith(upload_dir) or not dst_path.startswith(upload_dir):
        return "Invalid path", 400

    if not os.path.exists(src_path):
        return "Source not found", 404

    # Disallow moving a folder into itself or its descendants
    try:
        src_rel = os.path.relpath(src_path, upload_dir)
        dst_rel = os.path.relpath(dst_path, upload_dir)
        if dst_rel == src_rel or dst_rel.startswith(src_rel + os.sep):
            return {
                "error": "Cannot move a folder into itself or its subdirectory"
            }, 400
    except ValueError:
        # relpath can throw on different drives; unlikely in Linux containers, but guard anyway
        pass

    # Ensure destination parent exists
    dst_parent = os.path.dirname(dst_path)
    if dst_parent and not os.path.exists(dst_parent):
        try:
            os.makedirs(dst_parent, exist_ok=True)
            set_container_ownership(dst_parent)
        except NotADirectoryError:
            return {"error": "A file exists in the destination path"}, 409

    # Prevent overwriting existing files/folders unless overwrite flag is set
    if os.path.exists(dst_path):
        if not overwrite:
            return {"error": "Destination already exists"}, 409
        # If overwriting, remove existing destination first
        try:
            if os.path.isdir(dst_path):
                import shutil

                shutil.rmtree(dst_path)
            else:
                os.remove(dst_path)
        except OSError as e:
            return {"error": f"Failed to replace destination: {e}"}, 500

    try:
        os.rename(src_path, dst_path)
        # Set ownership on the moved item (best-effort)
        set_container_ownership(dst_path)
    except OSError as e:
        return {"error": f"Failed to move: {e}"}, 500

    return "Moved successfully", 200


@files_bp.route("/file/<path:filename>", methods=["GET", "PUT", "DELETE", "POST"])
def handle_file(filename):
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    # Map classroom symlink paths to host filesystem if applicable
    mapped = _resolve_classroom_path(upload_dir, filename)
    file_path = mapped if mapped else os.path.join(upload_dir, filename)
    file_path = os.path.normpath(file_path)

    # Guard against breaking out of upload_dir / classrooms root
    try:
        allowed_roots = [upload_dir, CLASSROOMS_ROOT]
        if not any(
            os.path.commonpath([root, file_path]) == root for root in allowed_roots
        ):
            return "Invalid path", 400
    except ValueError:
        return "Invalid path", 400

    # Prevent writes to templates folders (read-only for participants)
    # Templates can only be modified by instructors via the dedicated upload endpoint
    if request.method in ("POST", "PUT", "DELETE"):
        # Check if path is in a templates folder (either directly or via classroom-templates symlink)
        rel_to_classrooms = ""
        if file_path.startswith(CLASSROOMS_ROOT):
            rel_to_classrooms = file_path[len(CLASSROOMS_ROOT):].lstrip("/")
        is_templates_path = (
            "/templates/" in f"/{rel_to_classrooms}" or
            rel_to_classrooms.endswith("/templates") or
            "/classroom-templates/" in filename or
            filename.startswith("classroom-templates/")
        )
        if is_templates_path:
            return {"error": "Templates folder is read-only. Use 'Copy to Workspace' instead."}, 403

    if request.method == "POST":
        # Create a new directory or file
        if filename.endswith("/"):
            # It's a directory
            # Normalize: avoid trailing slash for existence checks
            normalized_path = file_path[:-1]
            # If a file exists with the same name, return conflict
            if os.path.isfile(normalized_path):
                return {"error": "A file with the same name already exists"}, 409
            try:
                os.makedirs(file_path, exist_ok=True)
            except NotADirectoryError:
                # One of the parents is a file; cannot create directory path
                return {
                    "error": "A file exists in the path; cannot create directory"
                }, 409
            set_container_ownership(file_path)
            return "Directory created successfully", 200
        else:
            # It's a file - check if the directory exists, if not, create it
            dir_path = os.path.dirname(file_path)
            if dir_path and dir_path != upload_dir:
                os.makedirs(dir_path, exist_ok=True)
                set_container_ownership(dir_path)
        # create an empty file if it doesn't exist
        # If a directory with the same name exists, return conflict
        if os.path.isdir(file_path):
            return {"error": "A folder with the same name already exists"}, 409
        if os.path.exists(file_path):
            return "File already exists", 400
        with open(file_path, "w") as f:
            f.write("")
            set_container_ownership(file_path)
        return "File created successfully", 200

    elif not os.path.exists(file_path):
        return "File not found", 404

    elif request.method == "GET":
        image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"]
        file_ext = filename.split(".")[-1].lower() if "." in filename else ""

        if file_ext in image_extensions:
            from flask import send_file

            return send_file(file_path)
        else:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                return content, 200
            except UnicodeDecodeError:
                from flask import send_file

                return send_file(file_path)

    elif request.method == "PUT":
        content = request.data.decode("utf-8")
        with open(file_path, "w") as f:
            f.write(content)
        set_container_ownership(file_path)
        return "File updated successfully", 200

    elif request.method == "DELETE":
        if os.path.isdir(file_path):
            import shutil

            shutil.rmtree(file_path)
        else:
            os.remove(file_path)
        return "File deleted successfully", 200
