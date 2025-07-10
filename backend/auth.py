# auth.py
import os
from flask import Blueprint, redirect, request
from flask_login import login_user, logout_user, current_user, UserMixin
from requests_oauthlib import OAuth2Session
import logging

logger = logging.getLogger("auth")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
PORT_BASE = int(os.getenv("PORT_BASE"))
if os.getenv("FLASK_ENV") == "production":
    logger.debug("Running in production mode")
    REDIRECT_URI = os.getenv("REDIRECT_URI_PROD")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_PROD")
else:
    if not os.getenv("FRONTEND_ORIGIN_DEV") or not os.getenv("REDIRECT_URI_DEV"):
        raise ValueError("FRONTEND_ORIGIN_DEV or REDIRECT_URI_DEV environment variable is not set.")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_DEV")
    REDIRECT_URI = os.getenv("REDIRECT_URI_DEV")

auth_bp = Blueprint("auth", __name__)

users = {}


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


@auth_bp.route("/api/login")
def login():
    google = OAuth2Session(GOOGLE_CLIENT_ID, redirect_uri=REDIRECT_URI, scope=["openid", "email", "profile"])
    auth_url, _ = google.authorization_url(
        "https://accounts.google.com/o/oauth2/auth", access_type="offline", prompt="select_account"
    )
    return redirect(auth_url)


@auth_bp.route("/api/callback")
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
        logger.info(f"Rejected login attempt for unverified email: {user_info.get('email')} from IP {request.remote_addr}")
        return redirect(f"{FRONTEND_ORIGIN}/login?error=email_not_verified") # need to define this error handling in frontend

    user = User(user_info["id"], user_info["email"], port_start)
    users[user.id] = user
    login_user(user)
    logger.info(f"User {user.id} logged in from IP {request.remote_addr}")
    return redirect(f"{FRONTEND_ORIGIN}/terminal")



@auth_bp.route("/api/logout")
def logout():
    logout_user()
    return "", 200


@auth_bp.route("/api/me")
def me():
    if current_user.is_authenticated:
        return {"email": current_user.email, "port_start": current_user.port_start, "port_end": current_user.port_end}
    return {"error": "unauthenticated"}, 401
