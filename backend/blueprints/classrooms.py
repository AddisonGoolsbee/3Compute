# auth.py
import os
import json
from datetime import datetime
from flask import Blueprint, redirect, request
from flask_login import login_user, logout_user, current_user
from requests_oauthlib import OAuth2Session
import logging

logger = logging.getLogger("auth")

PORT_BASE = int(os.getenv("PORT_BASE", "8000"))
classrooms_bp = Blueprint("classrooms", __name__)

classrooms = {}
CLASSROOMS_JSON_FILE = "backend/classrooms.json"


def load_classrooms_from_json():
    """Load users data from JSON file"""
    try:
        if os.path.exists(CLASSROOMS_JSON_FILE):
            with open(CLASSROOMS_JSON_FILE, "r") as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading users from JSON: {e}")
        return {}


def save_classrooms_to_json(classrooms_data):
    """Save users data to JSON file"""
    try:
        with open(CLASSROOMS_JSON_FILE, "w") as f:
            json.dump(classrooms_data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving users to JSON: {e}")


def update_classroom_data(classroom_code, user_info, ip_address, port_start=None):
    """Update user data in JSON file with new IP address and port assignment"""
    classrooms_data = load_classrooms_from_json()

    if classroom_code not in classrooms_data:
        # New classroom - must have port_start provided
        if port_start is None:
            raise ValueError("port_start must be provided for new users")
        
        classrooms_data[classroom_code] = {
            "teachers": [
                user_info["email"]
            ],
            "users": {},
            "invites": [],
            "port_start": port_start,
            "port_end": port_start + 9,
            "volume_path": f"/tmp/uploads/{classroom_code}",
            "terminal_tabs": {
                "tabs": ["1"],
                "active_tab": "1"
            }
        }
    else:
        # Ensure all required fields exist
        if "terminal_tabs" not in classrooms_data[classroom_code]:
            classrooms_data[classroom_code]["terminal_tabs"] = {
                "tabs": ["1"],
                "active_tab": "1"
            }
        
        # Ensure port information exists (for backward compatibility)
        if "port_start" not in classrooms_data[classroom_code] and port_start is not None:
            classrooms_data[classroom_code]["port_start"] = port_start
            classrooms_data[classroom_code]["port_end"] = port_start + 9
        
        # Ensure volume path exists
        if "volume_path" not in classrooms_data[classroom_code]:
            classrooms_data[classroom_code]["volume_path"] = f"/tmp/uploads/{classroom_code}"

    save_classrooms_to_json(classrooms_data)
    return classrooms_data[classroom_code]


def get_classroom_data(classroom_code):
    """Get classroom data by classroom code"""
    classrooms_data = load_classrooms_from_json()
    return classrooms_data.get(str(classroom_code))


class Classroom():
    def __init__(self, classroom_code, email, name, picture, port_start):
        self.classroom_code = classroom_code
        self.teachers = [email]
        self.users = {}
        self.invites = []
        self.volume_path = f"/tmp/uploads/{classroom_code}"
        self.port_start = port_start

    @property
    def port_end(self):
        return self.port_start + 9

    @property
    def port_range(self):
        return (self.port_start, self.port_end)


def load_classroom(classroom_code):
    return classrooms.get(classroom_code)