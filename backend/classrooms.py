import os
import json
import logging
import secrets
import string
import uuid
import shutil
import subprocess
from flask import Blueprint, request
from flask_login import current_user
from datetime import datetime
from .docker import CONTAINER_USER_UID, CONTAINER_USER_GID, spawn_container, container_is_running, container_exists
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


@classrooms_bp.route("/classrooms", methods=["GET"])
def list_classrooms():
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    data = _load_classrooms()
    # Only return classrooms where user is instructor
    user_classrooms = [c for c in data.values() if current_user.id in c.get("instructors", [])]
    return {"classrooms": user_classrooms}


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
            if current_user.id in c.get("instructors", []) and c.get("name", "").lower() == name.lower():
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
            spawn_container(user_id, None, container_name, port_range)
            restarted = True
            user_containers[user_id] = {"container_name": container_name, "port_range": port_range}
        except Exception as e:
            logger.error(f"Failed to spawn container after classroom creation: {e}")

        logger.info(f"Created classroom {classroom_id} by user {current_user.id}")
        return {"id": classroom_id, "access_code": access_code, "name": name, "restarted": restarted}, 201
    except Exception as e:
        logger.error(f"Failed to create classroom: {e}")
        return {"error": "Internal server error"}, 500
