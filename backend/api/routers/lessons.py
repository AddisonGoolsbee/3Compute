import io
import re
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from ..database import User
from ..dependencies import require_teacher

router = APIRouter()

_SOLUTIONS_DIR = Path(__file__).parent.parent.parent / "solutions"

# Lesson directory names — strict allowlist of characters so the path join
# below can't be redirected by a clever input. Mirrors how directories are
# actually named on disk.
_LESSON_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


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


@router.get("/solutions/{lesson_name}")
def download_solutions_zip(
    lesson_name: str,
    user: User = Depends(require_teacher),
):
    """Zip and stream every file under solutions/{lesson_name}/.

    Used for lessons whose reference solution spans multiple files (e.g.
    tic-tac-toe has solution.py + warmup_factorial.py; personal-website has
    a solution/ subdir with app.py + app.js + index.html). The zip preserves
    the on-disk relative structure so teachers can extract and review without
    guessing how files relate.
    """
    if not _LESSON_NAME_RE.match(lesson_name):
        raise HTTPException(status_code=400, detail="Invalid lesson name")

    lesson_dir = (_SOLUTIONS_DIR / lesson_name).resolve()
    if not lesson_dir.is_relative_to(_SOLUTIONS_DIR.resolve()):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not lesson_dir.is_dir():
        raise HTTPException(status_code=404, detail="Lesson solutions not found")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(lesson_dir.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(lesson_dir))
    buf.seek(0)

    filename = f"{lesson_name}-solutions.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
