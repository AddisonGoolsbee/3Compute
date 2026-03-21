"""HTTP endpoints for terminal management."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..database import User
from ..dependencies import get_current_user
from ..terminal import close_tab

router = APIRouter()


class CloseTabRequest(BaseModel):
    tabId: str = "1"


@router.post("/close-tab")
async def close_tab_endpoint(
    body: CloseTabRequest,
    user: User = Depends(get_current_user),
):
    tab_id = body.tabId.strip() or "1"
    message, status_code = await close_tab(user.id, tab_id)
    if status_code == 404:
        raise HTTPException(status_code=404, detail=message)
    return {"message": message}
