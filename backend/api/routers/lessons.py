from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..database import User
from ..dependencies import require_teacher

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
    user: User = Depends(require_teacher),
):
    target = _safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Solution not found")
    return FileResponse(target, filename=target.name)
