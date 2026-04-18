import logging
import subprocess
from datetime import datetime

from authlib.integrations.base_client.errors import MismatchingStateError, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlmodel import Session, select
from sqlalchemy import func

from ..database import User
from ..dependencies import get_db, get_optional_user

logger = logging.getLogger("auth")
router = APIRouter()


def _max_container_port_end() -> int | None:
    """Return the highest port_end bound by any running user-container-*, or None on failure."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=user-container-", "--format", "{{.Ports}}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return None
        max_port = None
        for line in result.stdout.splitlines():
            # Each mapping looks like: 0.0.0.0:10040-10049->10040-10049/tcp
            for part in line.split(","):
                part = part.strip()
                if "->" not in part:
                    continue
                host_side = part.split("->")[0]
                # host_side: 0.0.0.0:10040-10049 or :::10040-10049
                port_part = host_side.split(":")[-1]
                # port_part: 10040-10049 or a single port
                if "-" in port_part:
                    end = int(port_part.split("-")[1])
                else:
                    end = int(port_part)
                if max_port is None or end > max_port:
                    max_port = end
        return max_port
    except Exception:
        logger.warning("Failed to query Docker for in-use port ranges", exc_info=True)
        return None
oauth = OAuth()
_oauth_initialized = False


def setup_oauth(settings):
    global _oauth_initialized
    if _oauth_initialized:
        return
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    _oauth_initialized = True


@router.get("/login")
async def login(request: Request):
    settings = request.app.state.settings
    setup_oauth(settings)
    request.session.clear()
    redirect_uri = settings.redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    settings = request.app.state.settings
    setup_oauth(settings)
    try:
        token = await oauth.google.authorize_access_token(request)
    except (MismatchingStateError, OAuthError):
        return RedirectResponse(url=f"{request.app.state.settings.frontend_origin}/api/auth/login")
    user_info = token.get("userinfo")
    if not user_info:
        return RedirectResponse(url=settings.frontend_origin)

    if not user_info.get("email_verified", False):
        return RedirectResponse(
            url=f"{settings.frontend_origin}/?error=email_not_verified"
        )

    google_id = user_info["sub"]
    email = user_info["email"]
    name = user_info.get("name")
    avatar = user_info.get("picture")

    existing = db.get(User, google_id)
    if existing:
        existing.last_login = datetime.utcnow()
        existing.name = name
        existing.avatar_url = avatar
        db.add(existing)
        db.commit()
        request.session["user_id"] = google_id
        return RedirectResponse(url=f"{settings.frontend_origin}/ide")

    max_port_end = db.exec(select(func.max(User.port_end))).one()
    port_start = (max_port_end + 1) if max_port_end is not None else settings.port_base

    docker_max = _max_container_port_end()
    if docker_max is not None and docker_max >= port_start:
        port_start = docker_max + 1

    user = User(
        id=google_id,
        email=email,
        name=name,
        avatar_url=avatar,
        port_start=port_start,
        port_end=port_start + 9,
    )
    db.add(user)
    db.commit()

    request.session["user_id"] = google_id
    return RedirectResponse(url=f"{settings.frontend_origin}/ide")


@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
async def me(user: User | None = Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="unauthenticated")
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "port_start": user.port_start,
        "port_end": user.port_end,
        "needs_onboarding": user.role is None,
        "is_admin": (user.email or "").lower().endswith("@birdflop.com"),
    }
