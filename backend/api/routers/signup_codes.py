"""Admin CRUD for sign-up codes. Codes are cryptographically random and
formatted as XXXX-XXXX-XXXX (12 chars of base32, ~60 bits entropy) so they
are easy to read aloud and impossible to brute-force in practice."""
import base64
import logging
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import SignupCode, User
from ..dependencies import get_db
from .admin import require_birdflop_admin

logger = logging.getLogger("signup_codes")
router = APIRouter()


def generate_code() -> str:
    """Cryptographically random 12-char base32 code, dash-grouped 4-4-4."""
    raw = secrets.token_bytes(10)  # 80 bits → 16 base32 chars; we keep 12
    enc = base64.b32encode(raw).decode("ascii").rstrip("=")[:12]
    return f"{enc[:4]}-{enc[4:8]}-{enc[8:]}"


class CreateCode(BaseModel):
    role: str
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)


class UpdateCode(BaseModel):
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)


@router.get("")
async def list_codes(
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    rows = db.exec(select(SignupCode).order_by(SignupCode.created_at.desc())).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "role": c.role,
            "notes": c.notes,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "max_uses": c.max_uses,
            "times_used": c.times_used,
            "created_by": c.created_by,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
        }
        for c in rows
    ]


@router.post("")
async def create_signup_code(
    body: CreateCode,
    admin: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    if body.role not in ("teacher", "student"):
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")

    # Retry on the (astronomically unlikely) collision.
    for _ in range(5):
        code = generate_code()
        if not db.exec(select(SignupCode).where(SignupCode.code == code)).first():
            break
    else:
        raise HTTPException(status_code=500, detail="Could not allocate a unique code")

    entry = SignupCode(
        code=code,
        role=body.role,
        notes=(body.notes or "").strip() or None,
        expires_at=body.expires_at,
        max_uses=body.max_uses,
        created_by=admin.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id, "code": entry.code}


@router.patch("/{code_id}")
async def update_signup_code(
    code_id: int,
    body: UpdateCode,
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    entry = db.get(SignupCode, code_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    data = body.model_dump(exclude_unset=True)
    if "notes" in data:
        entry.notes = (data["notes"] or "").strip() or None
    if "expires_at" in data:
        entry.expires_at = data["expires_at"]
    if "max_uses" in data:
        entry.max_uses = data["max_uses"]
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True}


@router.delete("/{code_id}")
async def delete_signup_code(
    code_id: int,
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    entry = db.get(SignupCode, code_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
