import fnmatch
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..database import AllowlistEntry, SignupCode, User
from ..dependencies import get_current_user, get_db

logger = logging.getLogger("users")
router = APIRouter()


# Mirrors backend/api/routers/admin.py — admins are allowed everywhere by
# default, including when the allowlist is otherwise empty.
ADMIN_EMAIL_DOMAIN = "@birdflop.com"


def _is_admin(email: str) -> bool:
    return (email or "").lower().endswith(ADMIN_EMAIL_DOMAIN)


def _email_matches(email: str, pattern: str) -> bool:
    """Exact match, '*' wildcard, or fnmatch glob like '*@school.edu'."""
    if pattern == "*":
        return True
    if "*" in pattern or "?" in pattern or "[" in pattern:
        return fnmatch.fnmatch(email.lower(), pattern.lower())
    return email.lower() == pattern.lower()


def _get_allowed_roles(email: str, db: Session) -> list[str]:
    if _is_admin(email):
        return ["teacher", "student"]

    entries = db.exec(select(AllowlistEntry)).all()
    matched = {e.role for e in entries if _email_matches(email, e.pattern)}
    # Preserve a stable order so the onboarding UI renders buttons consistently.
    return [r for r in ("teacher", "student") if r in matched]


class RoleRequest(BaseModel):
    role: str


class RedeemCodeRequest(BaseModel):
    code: str


@router.get("/allowed-roles")
async def get_allowed_roles(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"roles": _get_allowed_roles(user.email, db)}


@router.post("/role")
async def set_role(
    body: RoleRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.role not in ("teacher", "student"):
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")
    if body.role not in _get_allowed_roles(user.email, db):
        raise HTTPException(status_code=403, detail="Not authorized for this role")
    user.role = body.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"ok": True, "role": user.role}


@router.post("/redeem-code")
async def redeem_code(
    body: RedeemCodeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange a signup code for a role. Codes can be used by any signed-in
    user without a role yet; admins use the admin UI to manage them."""
    code = (body.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")

    entry = db.exec(select(SignupCode).where(SignupCode.code == code)).first()
    if not entry:
        raise HTTPException(status_code=404, detail="That code isn't valid")

    if entry.expires_at and entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="That code has expired")
    if entry.max_uses is not None and entry.times_used >= entry.max_uses:
        raise HTTPException(status_code=410, detail="That code has been used up")
    if entry.role not in ("teacher", "student"):
        # Defensive: an admin somehow saved a malformed role
        raise HTTPException(status_code=500, detail="Code role is invalid")

    user.role = entry.role
    entry.times_used += 1
    entry.last_used_at = datetime.utcnow()
    db.add(user)
    db.add(entry)
    db.commit()
    db.refresh(user)
    return {"ok": True, "role": user.role}
