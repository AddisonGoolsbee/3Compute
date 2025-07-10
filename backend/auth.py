# auth.py
import os
from flask import Blueprint, redirect, request
from flask_login import login_user, logout_user, current_user, UserMixin
from requests_oauthlib import OAuth2Session

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI_DEV")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN_DEV")
PORT_BASE = int(os.getenv("PORT_BASE"))

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

    user = User(user_info["id"], user_info["email"], port_start)
    users[user.id] = user
    login_user(user)
    return redirect(f"{FRONTEND_ORIGIN}/terminal")


@auth_bp.route("/logout")
def logout():
    logout_user()
    return "", 200


@auth_bp.route("/me")
def me():
    if current_user.is_authenticated:
        return {"email": current_user.email, "port_start": current_user.port_start, "port_end": current_user.port_end}
    return {"error": "unauthenticated"}, 401
