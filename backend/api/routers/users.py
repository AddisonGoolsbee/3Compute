import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from ..config import Settings
from ..database import User
from ..dependencies import get_db, get_current_user

logger = logging.getLogger("users")
router = APIRouter()

# users.py is backend/api/routers/ — allowlist lives in backend/
_ALLOWLIST_PATH = Path(__file__).resolve().parent.parent.parent / "allowlist.json"


def _get_allowed_roles(email: str) -> list[str]:
    settings = Settings()
    if settings.flask_env == "development":
        return ["teacher", "student"]

    try:
        with _ALLOWLIST_PATH.open() as f:
            allowlist = json.load(f)
    except Exception as e:
        logger.error("Failed to load allowlist: %s", e)
        return []

    roles = []
    for role in ("teacher", "student"):
        allowed = allowlist.get(role, [])
        if allowed == "*" or (isinstance(allowed, list) and ("*" in allowed or email in allowed)):
            roles.append(role)
    return roles


class RoleRequest(BaseModel):
    role: str


@router.get("/allowed-roles")
async def get_allowed_roles(user: User = Depends(get_current_user)):
    return {"roles": _get_allowed_roles(user.email)}


@router.post("/role")
async def set_role(
    body: RoleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.role not in ("teacher", "student"):
        raise HTTPException(
            status_code=400, detail="Role must be 'teacher' or 'student'"
        )
    if body.role not in _get_allowed_roles(user.email):
        raise HTTPException(status_code=403, detail="Not authorized for this role")
    user.role = body.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"ok": True, "role": user.role}
