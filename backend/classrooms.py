import json
import logging
import os
import secrets
import shutil
import string
import subprocess
import uuid
from datetime import datetime

from flask import Blueprint, request
from flask_login import current_user

from .auth import load_users_from_json
from .docker import (
    CONTAINER_USER_GID,
    CONTAINER_USER_UID,
    container_exists,
    spawn_container,
)
from .terminal import user_containers

logger = logging.getLogger("classrooms")

classrooms_bp = Blueprint("classrooms", __name__)

CLASSROOMS_JSON_FILE = "backend/classrooms.json"
CLASSROOMS_ROOT = "/tmp/classrooms"


def _load_classrooms():
    try:
        if os.path.exists(CLASSROOMS_JSON_FILE):
            with open(CLASSROOMS_JSON_FILE, "r") as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading classrooms: {e}")
        return {}


def _save_classrooms(data):
    try:
        with open(CLASSROOMS_JSON_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving classrooms: {e}")


def _generate_classroom_id(existing):
    return str(uuid.uuid4())


def _generate_access_code():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _ensure_classroom_dirs(classroom_id: str):
    base = os.path.join(CLASSROOMS_ROOT, classroom_id)
    templates_dir = os.path.join(base, "templates")
    participants_dir = os.path.join(base, "participants")
    os.makedirs(templates_dir, exist_ok=True)
    os.makedirs(participants_dir, exist_ok=True)
    try:
        # set ownership recursively
        for root, dirs, files in os.walk(base):
            os.chown(root, CONTAINER_USER_UID, CONTAINER_USER_GID)
            for d in dirs:
                os.chown(os.path.join(root, d), CONTAINER_USER_UID, CONTAINER_USER_GID)
            for f in files:
                os.chown(os.path.join(root, f), CONTAINER_USER_UID, CONTAINER_USER_GID)
    except PermissionError as e:
        logger.warning(f"Failed chown classroom dir {base}: {e}")
    return base


def _user_is_instructor(classroom: dict, user_id: str) -> bool:
    """Return True if the given user_id is an instructor for the classroom."""
    return user_id in classroom.get("instructors", [])


def _find_user_by_email(email: str) -> tuple[str, dict] | None:
    try:
        users = load_users_from_json()
        for uid, info in users.items():
            if info.get("email", "").lower() == email.lower():
                return str(uid), info
    except Exception:
        pass
    return None


def _get_classroom(data: dict, classroom_id: str) -> dict | None:
    return data.get(classroom_id)


def _is_archived_for_user(classroom: dict, user_id: str) -> bool:
    """Check if a classroom is archived for a specific user (per-user setting)."""
    archived_by = classroom.get("archived_by", [])
    return user_id in archived_by


@classrooms_bp.route("/classrooms", methods=["GET"])
def list_classrooms():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    user_id = str(current_user.id)
    owner_all = [c for c in data.values() if user_id in c.get("instructors", [])]
    joined_all = [c for c in data.values() if user_id in c.get("participants", [])]

    # Per-user archived state for both instructors and participants
    owner = [c for c in owner_all if not _is_archived_for_user(c, user_id)]
    owner_archived = [c for c in owner_all if _is_archived_for_user(c, user_id)]

    joined = [c for c in joined_all if not _is_archived_for_user(c, user_id)]
    joined_archived = [c for c in joined_all if _is_archived_for_user(c, user_id)]

    return {
        "owner": owner,
        "owner_archived": owner_archived,
        "joined": joined,
        "joined_archived": joined_archived,
    }


@classrooms_bp.route("/classrooms", methods=["POST"])
def create_classroom():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401

    try:
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        if not name:
            return {"error": "Name required"}, 400

        data = _load_classrooms()

        # Uniqueness check (case-insensitive) among instructor's own classrooms
        for c in data.values():
            if (
                current_user.id in c.get("instructors", [])
                and c.get("name", "").lower() == name.lower()
            ):
                return {"error": "Name already used"}, 400

        classroom_id = _generate_classroom_id(data)
        access_code = _generate_access_code()

        data[classroom_id] = {
            "id": classroom_id,
            "name": name,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "instructors": [current_user.id],
            "participants": [],
            "access_code": access_code,
            "archived": False,
        }

        _save_classrooms(data)

        # Create directories
        _ensure_classroom_dirs(classroom_id)

        # Restart container with new mounts if user has a container
        user_id = current_user.id
        container_name = f"user-container-{user_id}"
        restarted = False
        port_range = getattr(current_user, "port_range", None)
        if container_exists(container_name):
            # stop/remove existing first
            try:
                subprocess.run(["docker", "rm", "-f", container_name], check=False)
            except Exception as e:
                logger.warning(f"Failed to remove old container {container_name}: {e}")
            # Remove tracking entry
            if user_id in user_containers:
                user_containers.pop(user_id, None)
        try:
            spawn_container(
                user_id,
                None,
                container_name,
                port_range,
                getattr(current_user, "email", None),
            )
            restarted = True
            user_containers[user_id] = {
                "container_name": container_name,
                "port_range": port_range,
            }
        except Exception as e:
            logger.error(f"Failed to spawn container after classroom creation: {e}")

        logger.info(f"Created classroom {classroom_id} by user {current_user.id}")
        return {
            "id": classroom_id,
            "access_code": access_code,
            "name": name,
            "restarted": restarted,
        }, 201
    except Exception as e:
        logger.error(f"Failed to create classroom: {e}")
        return {"error": "Internal server error"}, 500


@classrooms_bp.route("/classrooms/join", methods=["POST"])
def join_classroom():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    try:
        payload = request.get_json(silent=True) or {}
        code = (payload.get("code") or "").strip().upper()
        if not code:
            return {"error": "Code required"}, 400
        data = _load_classrooms()
        target = None
        for c in data.values():
            if c.get("access_code") == code:
                target = c
                break
        if not target:
            # Delay response slightly could be client-side; we keep backend fast
            return {"error": "Invalid code"}, 404
        # Normalize user id to string for consistent comparisons
        user_id_str = str(current_user.id)
        # Prevent instructors from attempting to "join" their own classroom as a participant.
        if _user_is_instructor(target, user_id_str):
            return {"error": "You are the instructor of this classroom"}, 400
        # If already a participant, block with distinct message
        if user_id_str in [str(u) for u in target.get("participants", [])]:
            return {"error": "You already joined this classroom"}, 400
        # Add user as participant if not already instructor/participant
        changed = False
        if user_id_str not in [
            str(u) for u in target.get("instructors", [])
        ] and user_id_str not in [str(u) for u in target.get("participants", [])]:
            target.setdefault("participants", []).append(user_id_str)
            data[target["id"]] = target
            _save_classrooms(data)
            changed = True
        # Restart container to include participant classroom mount/symlink
        user_id = current_user.id  # keep original type for container naming
        container_name = f"user-container-{user_id_str}"
        restarted = False
        port_range = getattr(current_user, "port_range", None)
        if container_exists(container_name):
            try:
                subprocess.run(["docker", "rm", "-f", container_name], check=False)
            except Exception as e:
                logger.warning(f"Failed to remove old container {container_name}: {e}")
            if user_id in user_containers:
                user_containers.pop(user_id, None)
        try:
            spawn_container(
                user_id,
                None,
                container_name,
                port_range,
                getattr(current_user, "email", None),
            )
            restarted = True
            user_containers[user_id] = {
                "container_name": container_name,
                "port_range": port_range,
            }
        except Exception as e:
            logger.error(f"Failed to spawn container after classroom join: {e}")
        logger.info(
            f"JOIN: user {current_user.id} joined classroom {target['id']} (added_participant={changed}, restarted={restarted})"
        )
        return {
            "joined": True,
            "classroom_id": target["id"],
            "name": target.get("name"),
            "restarted": restarted,
        }, 200
    except Exception as e:
        logger.error(f"Failed to join classroom: {e}")
        return {"error": "Internal server error"}, 500


@classrooms_bp.route("/classrooms/validate-code", methods=["POST"])
def validate_classroom_code():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    try:
        payload = request.get_json(silent=True) or {}
        code = (payload.get("code") or "").strip().upper()
        if not code:
            return {"valid": False}, 200
        data = _load_classrooms()
        for c in data.values():
            if c.get("access_code") == code:
                return {"valid": True}, 200
        return {"valid": False}, 200
    except Exception as e:
        logger.error(f"Failed to validate classroom code: {e}")
        return {"valid": False}, 200


@classrooms_bp.route("/classrooms/<classroom_id>/access-code", methods=["GET", "POST"])
def access_code(classroom_id):
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403
    if request.method == "GET":
        return {"access_code": c.get("access_code")}
    # POST -> regenerate
    new_code = _generate_access_code()
    c["access_code"] = new_code
    data[classroom_id] = c
    _save_classrooms(data)
    return {"access_code": new_code}


@classrooms_bp.route("/classrooms/<classroom_id>", methods=["PATCH", "DELETE"])
def update_or_delete_classroom(classroom_id):
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403
    if request.method == "DELETE":
        # Remove classroom directories and entry
        try:
            base = os.path.join(CLASSROOMS_ROOT, classroom_id)
            if os.path.isdir(base):
                shutil.rmtree(base)
        except Exception as e:
            logger.warning(f"Failed removing classroom dir {classroom_id}: {e}")
        data.pop(classroom_id, None)
        _save_classrooms(data)
        return {"deleted": True}
    # PATCH -> rename
    payload = request.get_json(silent=True) or {}
    new_name = (payload.get("name") or "").strip()
    if not new_name:
        return {"error": "Name required"}, 400
    c["name"] = new_name
    data[classroom_id] = c
    _save_classrooms(data)
    return {"id": classroom_id, "name": new_name}


def _restart_user_container(user_id, user_email=None, port_range=None):
    """Restart a user's container to apply new mounts/symlinks."""
    container_name = f"user-container-{user_id}"
    restarted = False
    if container_exists(container_name):
        try:
            subprocess.run(["docker", "rm", "-f", container_name], check=False)
        except Exception as e:
            logger.warning(f"Failed to remove container {container_name}: {e}")
        if user_id in user_containers:
            user_containers.pop(user_id, None)
    try:
        spawn_container(user_id, None, container_name, port_range, user_email)
        restarted = True
        user_containers[user_id] = {
            "container_name": container_name,
            "port_range": port_range,
        }
    except Exception as e:
        logger.error(f"Failed to spawn container after operation: {e}")
    return restarted


@classrooms_bp.route("/classrooms/<classroom_id>/archive", methods=["POST"])
def archive_classroom(classroom_id):
    """Archive/unarchive a classroom for the current user.

    This is a per-user setting - archiving just moves the classroom
    to the user's archive folder. Other users are not affected.
    """
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404

    user_id = str(current_user.id)
    is_instructor = user_id in c.get("instructors", [])
    is_participant = user_id in c.get("participants", [])

    if not is_instructor and not is_participant:
        return {"error": "Forbidden"}, 403

    payload = request.get_json(silent=True) or {}
    archived = bool(payload.get("archived", True))

    # Per-user archive state - stored in archived_by list
    archived_by = c.get("archived_by", [])
    if archived:
        if user_id not in archived_by:
            archived_by.append(user_id)
    else:
        archived_by = [u for u in archived_by if u != user_id]
    c["archived_by"] = archived_by
    data[classroom_id] = c
    _save_classrooms(data)

    # Restart container to update symlinks
    port_range = getattr(current_user, "port_range", None)
    restarted = _restart_user_container(
        current_user.id,
        getattr(current_user, "email", None),
        port_range,
    )
    return {"archived": archived, "restarted": restarted}


@classrooms_bp.route("/classrooms/restore-by-slug", methods=["POST"])
def restore_by_slug():
    """Restore an archived classroom by its slugified name.

    Used when restoring from the archive folder where we only have the slug.
    """
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401

    payload = request.get_json(silent=True) or {}
    slug = (payload.get("slug") or "").strip().lower()
    if not slug:
        return {"error": "Slug required"}, 400

    user_id = str(current_user.id)
    data = _load_classrooms()

    # Find the classroom that matches this slug
    target = None
    for c in data.values():
        is_instructor = user_id in c.get("instructors", [])
        is_participant = user_id in c.get("participants", [])
        if not is_instructor and not is_participant:
            continue

        # Check if classroom is archived for this user
        archived_by = c.get("archived_by", [])
        if user_id not in archived_by:
            continue

        # Check if the slug matches
        name = c.get("name") or c.get("id")
        classroom_slug = _slugify(name)
        if classroom_slug == slug:
            target = c
            break

    if not target:
        return {"error": "Archived classroom not found"}, 404

    classroom_id = target.get("id")

    # Restore: remove user from archived_by list
    archived_by = target.get("archived_by", [])
    archived_by = [u for u in archived_by if u != user_id]
    target["archived_by"] = archived_by
    data[classroom_id] = target
    _save_classrooms(data)

    # Restart container
    port_range = getattr(current_user, "port_range", None)
    restarted = _restart_user_container(
        current_user.id,
        getattr(current_user, "email", None),
        port_range,
    )

    logger.info(f"User {user_id} restored classroom {classroom_id} from archive")
    return {"restored": True, "classroom_id": classroom_id, "restarted": restarted}


def _slugify(name: str) -> str:
    import re
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "-", name).strip("-")
    return name or "classroom"


@classrooms_bp.route(
    "/classrooms/<classroom_id>/participants", methods=["GET", "POST", "DELETE"]
)
def manage_participants(classroom_id):
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403
    if request.method == "GET":
        return {"participants": c.get("participants", [])}
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("user_id") or "").strip()
    if request.method == "POST":
        if not user_id:
            # allow email lookup
            email = (payload.get("email") or "").strip()
            if not email:
                return {"error": "user_id or email required"}, 400
            found = _find_user_by_email(email)
            if not found:
                return {"error": "User not found"}, 404
            user_id = found[0]
        if user_id in c.get("participants", []):
            return {"error": "Already a participant"}, 400
        if user_id in c.get("instructors", []):
            return {"error": "User is an instructor"}, 400
        c.setdefault("participants", []).append(user_id)
        data[classroom_id] = c
        _save_classrooms(data)
        return {"added": True}
    # DELETE
    if not user_id:
        return {"error": "user_id required"}, 400
    if user_id in c.get("participants", []):
        c["participants"] = [u for u in c.get("participants", []) if u != user_id]
        data[classroom_id] = c
        _save_classrooms(data)
        return {"removed": True}
    return {"error": "Not a participant"}, 404


@classrooms_bp.route(
    "/classrooms/<classroom_id>/instructors", methods=["GET", "POST", "DELETE"]
)
def manage_instructors(classroom_id):
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403
    if request.method == "GET":
        return {"instructors": c.get("instructors", [])}
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("user_id") or "").strip()
    if request.method == "POST":
        if not user_id:
            email = (payload.get("email") or "").strip()
            if not email:
                return {"error": "user_id or email required"}, 400
            found = _find_user_by_email(email)
            if not found:
                return {"error": "User not found"}, 404
            user_id = found[0]
        if user_id in c.get("instructors", []):
            return {"error": "Already an instructor"}, 400
        c.setdefault("instructors", []).append(user_id)
        # If they were a participant, remove that role
        if user_id in c.get("participants", []):
            c["participants"] = [u for u in c.get("participants", []) if u != user_id]
        data[classroom_id] = c
        _save_classrooms(data)
        return {"added": True}
    # DELETE
    if not user_id:
        return {"error": "user_id required"}, 400
    if user_id in c.get("instructors", []):
        # prevent removing last instructor
        if len([u for u in c.get("instructors", []) if u != user_id]) == 0:
            return {"error": "Cannot remove the last instructor"}, 400
        c["instructors"] = [u for u in c.get("instructors", []) if u != user_id]
        data[classroom_id] = c
        _save_classrooms(data)
        return {"removed": True}
    return {"error": "Not an instructor"}, 404


@classrooms_bp.route("/classrooms/templates", methods=["GET"])
def list_classroom_templates():
    """List all available classroom templates for the current user."""
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401

    user_id = str(current_user.id)
    data = _load_classrooms()
    result = []

    # Find all classrooms where user is a participant or instructor
    for classroom in data.values():
        is_participant = user_id in classroom.get("participants", [])
        is_instructor = user_id in classroom.get("instructors", [])

        if not (is_participant or is_instructor):
            continue

        # Check if templates directory exists and has content
        classroom_id = classroom.get("id")
        templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "templates")

        if not os.path.isdir(templates_dir):
            continue

        # List template folders
        templates = []
        try:
            for entry in os.listdir(templates_dir):
                template_path = os.path.join(templates_dir, entry)
                if os.path.isdir(template_path):
                    # List files in the template
                    files = []
                    for root, dirs, filenames in os.walk(template_path):
                        for filename in filenames:
                            rel_path = os.path.relpath(
                                os.path.join(root, filename), template_path
                            )
                            files.append(rel_path)

                    if files:  # Only include non-empty templates
                        templates.append({"name": entry, "files": files})
        except Exception as e:
            logger.warning(
                f"Failed to list templates for classroom {classroom_id}: {e}"
            )
            continue

        # Only include classroom if it has templates
        if templates:
            result.append(
                {
                    "id": classroom_id,
                    "name": classroom.get("name", classroom_id),
                    "templates": templates,
                }
            )

    return {"classrooms": result}, 200


@classrooms_bp.route("/classrooms/<classroom_id>/templates/upload", methods=["POST"])
def upload_classroom_template(classroom_id):
    """Upload a template to a classroom's templates directory."""
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401

    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404

    # Only instructors can upload templates
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403

    try:
        # Get the template files from the request
        files = request.files.getlist("files")
        if not files:
            return {"error": "No files provided"}, 400

        # Get the template name (optional, for organizing into subdirectories)
        template_name = request.form.get("template_name", "").strip()

        # Ensure classroom directories exist
        classroom_base = os.path.join(CLASSROOMS_ROOT, classroom_id)
        templates_dir = os.path.join(classroom_base, "templates")
        os.makedirs(templates_dir, exist_ok=True)

        # If template_name is provided, create a subdirectory
        if template_name:
            target_dir = os.path.join(templates_dir, template_name)
            os.makedirs(target_dir, exist_ok=True)
        else:
            target_dir = templates_dir

        # Save each file
        saved_files = []
        for file in files:
            if file.filename:
                # Clean the filename to prevent path traversal
                filename = os.path.basename(file.filename)
                # Handle nested paths within the template (e.g., "Template/file.py")
                if "/" in file.filename:
                    parts = file.filename.split("/")
                    # Skip the first part if it matches template_name
                    if template_name and parts[0] == template_name:
                        parts = parts[1:]
                    # Create nested directories
                    nested_path = os.path.join(target_dir, *parts[:-1])
                    if nested_path != target_dir:
                        os.makedirs(nested_path, exist_ok=True)
                    filepath = os.path.join(nested_path, parts[-1])
                else:
                    filepath = os.path.join(target_dir, filename)

                file.save(filepath)
                # Set proper ownership
                try:
                    os.chown(filepath, CONTAINER_USER_UID, CONTAINER_USER_GID)
                    # Also ensure parent directories have correct permissions
                    parent = os.path.dirname(filepath)
                    while parent.startswith(templates_dir):
                        os.chown(parent, CONTAINER_USER_UID, CONTAINER_USER_GID)
                        os.chmod(parent, 0o775)
                        if parent == templates_dir:
                            break
                        parent = os.path.dirname(parent)
                except PermissionError as e:
                    logger.warning(f"Failed to chown {filepath}: {e}")

                saved_files.append(filename)

        logger.info(
            f"Uploaded {len(saved_files)} template files to classroom {classroom_id} "
            f"by user {current_user.id}"
        )
        return {"uploaded": True, "files": saved_files, "count": len(saved_files)}, 200

    except Exception as e:
        logger.error(f"Failed to upload classroom template: {e}")
        return {"error": "Internal server error"}, 500
