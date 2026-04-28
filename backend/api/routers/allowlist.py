"""Admin CRUD for the allowlist. Empty allowlist means only admins can sign
in (admins are matched in users.py without needing a row here)."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import AllowlistEntry, User
from ..dependencies import get_db
from .admin import require_birdflop_admin

logger = logging.getLogger("allowlist")
router = APIRouter()


class CreateEntry(BaseModel):
    pattern: str = Field(min_length=1, max_length=200)
    role: str
    notes: Optional[str] = None


@router.get("")
async def list_entries(
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    rows = db.exec(select(AllowlistEntry).order_by(AllowlistEntry.created_at.desc())).all()
    return [
        {
            "id": e.id,
            "pattern": e.pattern,
            "role": e.role,
            "notes": e.notes,
            "created_by": e.created_by,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]


@router.post("")
async def create_entry(
    body: CreateEntry,
    admin: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    if body.role not in ("teacher", "student"):
        raise HTTPException(status_code=400, detail="Role must be 'teacher' or 'student'")
    entry = AllowlistEntry(
        pattern=body.pattern.strip(),
        role=body.role,
        notes=(body.notes or "").strip() or None,
        created_by=admin.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id}


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: int,
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    entry = db.get(AllowlistEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
