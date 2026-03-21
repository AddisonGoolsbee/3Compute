from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from ..database import User
from ..dependencies import get_db, get_current_user

router = APIRouter()


class RoleRequest(BaseModel):
    role: str


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
    user.role = body.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"ok": True, "role": user.role}
