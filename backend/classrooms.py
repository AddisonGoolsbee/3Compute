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


@classrooms_bp.route("/classrooms", methods=["GET"])
def list_classrooms():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    user_id = str(current_user.id)
    owner_all = [c for c in data.values() if user_id in c.get("instructors", [])]
    joined_all = [c for c in data.values() if user_id in c.get("participants", [])]
    owner = [c for c in owner_all if not c.get("archived")]
    owner_archived = [c for c in owner_all if c.get("archived")]
    joined = [c for c in joined_all if not c.get("archived")]
    joined_archived = [c for c in joined_all if c.get("archived")]
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


@classrooms_bp.route("/classrooms/<classroom_id>/archive", methods=["POST"])
def archive_classroom(classroom_id):
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    c = _get_classroom(data, classroom_id)
    if not c:
        return {"error": "Not found"}, 404
    if str(current_user.id) not in c.get("instructors", []):
        return {"error": "Forbidden"}, 403
    payload = request.get_json(silent=True) or {}
    archived = bool(payload.get("archived", True))
    c["archived"] = archived
    data[classroom_id] = c
    _save_classrooms(data)
    return {"archived": archived}


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
