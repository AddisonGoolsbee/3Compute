# auth.py
import os
import json
from datetime import datetime
from flask import Blueprint, redirect, request
from flask_login import login_user, logout_user, current_user, UserMixin
from requests_oauthlib import OAuth2Session
import logging

logger = logging.getLogger("auth")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "test-client-id")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
PORT_BASE = int(os.getenv("PORT_BASE", "8000"))
if os.getenv("FLASK_ENV") == "production":
    logger.debug("Running in production mode")
    REDIRECT_URI = os.getenv("REDIRECT_URI_PROD")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_PROD")
else:
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_DEV", "http://localhost:3000")
    REDIRECT_URI = os.getenv("REDIRECT_URI_DEV", "http://localhost:5000/auth/callback")

auth_bp = Blueprint("auth", __name__)

users = {}
USERS_JSON_FILE = "backend/users.json"


def load_users_from_json():
    """Load users data from JSON file"""
    try:
        if os.path.exists(USERS_JSON_FILE):
            with open(USERS_JSON_FILE, "r") as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading users from JSON: {e}")
        return {}


def save_users_to_json(users_data):
    """Save users data to JSON file"""
    try:
        with open(USERS_JSON_FILE, "w") as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving users to JSON: {e}")


def update_user_data(user_id, user_info, ip_address):
    """Update user data in JSON file with new IP address"""
    users_data = load_users_from_json()

    if user_id not in users_data:
        # New user
        users_data[user_id] = {
            "email": user_info["email"],
            "first_login": datetime.now().isoformat(),
            "last_login": datetime.now().isoformat(),
            "ip_addresses": [ip_address],
            "login_count": 1,
        }
    else:
        # Existing user
        users_data[user_id]["last_login"] = datetime.now().isoformat()
        users_data[user_id]["login_count"] += 1

        # Add new IP address if not already present
        if ip_address not in users_data[user_id]["ip_addresses"]:
            users_data[user_id]["ip_addresses"].append(ip_address)

    save_users_to_json(users_data)
    return users_data[user_id]


def get_user_data(user_id):
    """Get user data by user ID"""
    users_data = load_users_from_json()
    return users_data.get(str(user_id))


class User(UserMixin):
    def __init__(self, id_, email, port_start):
        self.id = id_
        self.email = email
        self.port_start = port_start

    @property
    def port_end(self):
        return self.port_start + 9

    @property
    def port_range(self):
        return (self.port_start, self.port_end)


def load_user(user_id):
    return users.get(user_id)


@auth_bp.route("/login")
def login():
    google = OAuth2Session(GOOGLE_CLIENT_ID, redirect_uri=REDIRECT_URI, scope=["openid", "email", "profile"])
    auth_url, _ = google.authorization_url(
        "https://accounts.google.com/o/oauth2/auth", access_type="offline", prompt="select_account"
    )
    return redirect(auth_url)


@auth_bp.route("/callback")
def callback():
    google = OAuth2Session(GOOGLE_CLIENT_ID, redirect_uri=REDIRECT_URI)
    google.fetch_token(
        "https://oauth2.googleapis.com/token",
        client_secret=GOOGLE_CLIENT_SECRET,
        authorization_response=request.url,
    )
    user_info = google.get("https://www.googleapis.com/oauth2/v2/userinfo").json()
    is_new = user_info["id"] not in users
    if is_new:
        idx = len(users)
        port_start = PORT_BASE + idx * 10
    else:
        port_start = users[user_info["id"]].port_start

    # Check if email is verified
    if not user_info.get("verified_email", False):
        logger.info(
            f"Rejected login attempt for unverified email: {user_info.get('email')} from IP {request.remote_addr}"
        )
        return redirect(
            f"{FRONTEND_ORIGIN}/login?error=email_not_verified"
        )  # need to define this error handling in frontend

    # Update user data in JSON file
    user_data = update_user_data(user_info["id"], user_info, request.remote_addr)

    user = User(user_info["id"], user_info["email"], port_start)
    users[user.id] = user
    login_user(user)
    logger.info(f"User {user.id} logged in from IP {request.remote_addr}")
    return redirect(f"{FRONTEND_ORIGIN}/")


@auth_bp.route("/logout")
def logout():
    logout_user()
    return "", 200


@auth_bp.route("/me")
def me():
    if current_user.is_authenticated:
        return {"email": current_user.email, "port_start": current_user.port_start, "port_end": current_user.port_end}
    return {"error": "unauthenticated"}, 401


@auth_bp.route("/users")
def get_users():
    """Get all users data from JSON file (for debugging/admin purposes)"""
    try:
        users_data = load_users_from_json()
        return users_data
    except Exception as e:
        logger.error(f"Error retrieving users data: {e}")
        return {"error": "Failed to retrieve users data"}, 500
