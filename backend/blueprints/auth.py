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
        return []
    except Exception as e:
        logger.error(f"Error loading users from JSON: {e}")
        return []


def save_users_to_json(users_data):
    """Save users data to JSON file"""
    try:
        with open(USERS_JSON_FILE, "w") as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving users to JSON: {e}")


def update_user_data(user_id, user_info, ip_address, port_start=None):
    """Update user data in JSON file with new IP address and port assignment"""
    users_data = load_users_from_json()

    found_object = None
    for item in users_data:
        if item["id"] == user_id:
            found_object = item
            break

    if found_object is None:
        # New user - must have port_start provided
        if port_start is None:
            raise ValueError("port_start must be provided for new users")
        
        users_data.append({
            "id": user_id,
            "email": user_info["email"],
            "first_login": datetime.now().isoformat(),
            "last_login": datetime.now().isoformat(),
            "ip_addresses": [ip_address],
            "login_count": 1,
            "port_start": port_start,
            "port_end": port_start + 9,
            "volume_path": f"/tmp/uploads/{user_id}",
            "terminal_tabs": {
                "tabs": ["1"],
                "active_tab": "1"
            }
        })
    else:
        # Existing user
        found_object["last_login"] = datetime.now().isoformat()
        found_object["login_count"] += 1

        # Add new IP address if not already present
        if ip_address not in found_object["ip_addresses"]:
            found_object["ip_addresses"].append(ip_address)

        # Ensure all required fields exist for existing users
        if "terminal_tabs" not in found_object:
            found_object["terminal_tabs"] = {
                "tabs": ["1"],
                "active_tab": "1"
            }
        
        # Ensure port information exists (for backward compatibility)
        if "port_start" not in found_object and port_start is not None:
            found_object["port_start"] = port_start
            found_object["port_end"] = port_start + 9

        # Ensure volume path exists
        if "volume_path" not in found_object:
            found_object["volume_path"] = f"/tmp/uploads/{user_id}"

    for item in users_data:
        if item["id"] == user_id:
            found_object = item
            break
    save_users_to_json(users_data)
    return found_object


def get_user_data(user_id):
    """Get user data by user ID"""
    users_data = load_users_from_json()
    found_object = None
    for item in users_data:
        if item["id"] == 2:
            found_object = item
            break
    return found_object


class User(UserMixin):
    def __init__(self, id_, email, name, picture, port_start):
        self.id = id_
        self.email = email
        self.name = name
        self.picture = picture

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
    
    # In production, ensure the authorization_response URL uses HTTPS
    auth_response_url = request.url
    if os.getenv("FLASK_ENV") == "production":
        # Replace http:// with https:// if present to fix proxy forwarding issues
        auth_response_url = auth_response_url.replace("http://", "https://")
        logger.debug(f"Original request URL: {request.url}")
        logger.debug(f"Modified auth response URL: {auth_response_url}")
    
    google.fetch_token(
        "https://oauth2.googleapis.com/token",
        client_secret=GOOGLE_CLIENT_SECRET,
        authorization_response=auth_response_url,
    )
    user_info = google.get("https://www.googleapis.com/oauth2/v2/userinfo").json()
    is_new = user_info["id"] not in users
    if is_new:
        idx = len(users)
        port_start = PORT_BASE + idx * 10
    else:
        # Try to get port_start from stored user data first, fallback to in-memory user
        stored_user_data = get_user_data(user_info["id"])
        if stored_user_data and "port_start" in stored_user_data:
            port_start = stored_user_data["port_start"]
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
    update_user_data(user_info["id"], user_info, request.remote_addr, port_start)

    user = User(user_info["id"], user_info["email"], user_info["name"], user_info["picture"], port_start)
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
        return {
            "email": current_user.email,
            "name": current_user.name,
            "picture": current_user.picture,
            "port_start": current_user.port_start,
            "port_end": current_user.port_end
        }
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


@auth_bp.route("/tabs", methods=["GET"])
def get_terminal_tabs():
    """Get user's terminal tab state"""
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    
    user_data = get_user_data(current_user.id)
    if user_data and "terminal_tabs" in user_data:
        tabs_data = user_data["terminal_tabs"]
        
        # Validate the stored data
        if (isinstance(tabs_data.get("tabs"), list) and 
            isinstance(tabs_data.get("active_tab"), str) and
            tabs_data["tabs"] and 
            tabs_data["active_tab"] in tabs_data["tabs"]):
            
            # Sanitize tab IDs
            sanitized_tabs = [tab for tab in tabs_data["tabs"] if isinstance(tab, str) and tab.isalnum()]
            if sanitized_tabs and tabs_data["active_tab"] in sanitized_tabs:
                return {
                    "tabs": sanitized_tabs,
                    "active_tab": tabs_data["active_tab"]
                }
    
    # Return default tabs if none exist or data is invalid
    return {
        "tabs": ["1"],
        "active_tab": "1"
    }


@auth_bp.route("/tabs", methods=["POST"])
def save_terminal_tabs():
    """Save user's terminal tab state"""
    if not current_user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    
    try:
        data = request.get_json()
        if not data or "tabs" not in data or "active_tab" not in data:
            return {"error": "Invalid data format. Expected 'tabs' array and 'active_tab' string."}, 400
        
        # Validate data types
        if not isinstance(data["tabs"], list) or not isinstance(data["active_tab"], str):
            return {"error": "Invalid data types. 'tabs' must be array, 'active_tab' must be string."}, 400
        
        # Validate that active_tab is in tabs list
        if data["active_tab"] not in data["tabs"]:
            return {"error": "Active tab must be in the tabs list."}, 400
        
        # Validate tabs array - must be non-empty, contain only strings
        if not data["tabs"] or not all(isinstance(tab, str) for tab in data["tabs"]):
            return {"error": "Tabs array must be non-empty and contain only strings."}, 400
        
        # Sanitize tab IDs - only allow alphanumeric characters
        sanitized_tabs = []
        for tab in data["tabs"]:
            if tab.isalnum():
                sanitized_tabs.append(tab)
        
        if not sanitized_tabs:
            return {"error": "No valid tab IDs found."}, 400
        
        # Make sure active tab is still valid after sanitization
        if data["active_tab"] not in sanitized_tabs:
            data["active_tab"] = sanitized_tabs[0]
        
        # Load current user data and update terminal tabs
        users_data = load_users_from_json()
        user_id = current_user.id
        
        if user_id not in users_data:
            return {"error": "User not found"}, 404
        
        users_data[user_id]["terminal_tabs"] = {
            "tabs": sanitized_tabs,
            "active_tab": data["active_tab"]
        }
        
        save_users_to_json(users_data)
        logger.info(f"Saved terminal tabs for user {user_id}: {data}")
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error saving terminal tabs for user {current_user.id}: {e}")
        return {"error": "Internal server error"}, 500
