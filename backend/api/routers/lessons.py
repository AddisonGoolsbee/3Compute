from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..database import User
from ..dependencies import get_current_user

router = APIRouter()

_SOLUTIONS_DIR = Path(__file__).parent.parent.parent / "solutions"


def _safe_path(rel: str) -> Path:
    """Resolve rel against the solutions dir and reject path traversal."""
    target = (_SOLUTIONS_DIR / rel).resolve()
    if not target.is_relative_to(_SOLUTIONS_DIR.resolve()):
        raise HTTPException(status_code=400, detail="Invalid path")
    return target


@router.get("/solution/{path:path}")
def download_solution(
    path: str,
    user: User = Depends(get_current_user),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    target = _safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Solution not found")
    return FileResponse(target, filename=target.name)
