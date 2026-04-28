"""Public read-only endpoints for the demo classroom.

These mirror the response shapes of ``routers/classrooms.py`` so the same
frontend page can render either with only the ``apiBase`` swapped. They
intentionally accept no auth, expose no mutating verbs, and hardcode the
demo classroom ID so a passed-in classroom id can never leak data from a
real classroom.
"""
import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from backend.docker import CLASSROOMS_ROOT

from ..database import (
    AssignmentWeight,
    Classroom,
    ClassroomMember,
    ManualScore,
    TestResult,
    User,
)
from ..demo import DEMO_CLASSROOM_ID, get_demo_user
from ..dependencies import get_db

logger = logging.getLogger("demo-router")

router = APIRouter()


def _require_demo_classroom(db: Session) -> Classroom:
    classroom = db.get(Classroom, DEMO_CLASSROOM_ID)
    if not classroom:
        # Should never happen post-seed; surface as 503 so the frontend
        # can show a "demo unavailable" state rather than a crash.
        raise HTTPException(status_code=503, detail="Demo classroom not seeded")
    return classroom


@router.get("/classroom")
async def get_demo_classroom(db: Session = Depends(get_db)):
    """Single-classroom shape matching one entry of the regular
    ``GET /classrooms/`` response, so the frontend can hydrate the same
    state with no special casing."""
    classroom = _require_demo_classroom(db)

    members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == DEMO_CLASSROOM_ID
        )
    ).all()

    return {
        "id": classroom.id,
        "name": classroom.name,
        "created_at": classroom.created_at.isoformat() + "Z",
        "instructors": [m.user_id for m in members if m.role == "instructor"],
        "participants": [m.user_id for m in members if m.role == "participant"],
        "access_code": classroom.access_code,
        "archived": False,
        "archived_by": [],
        "joins_paused": classroom.joins_paused,
        "grading_mode": classroom.grading_mode,
    }


@router.get("/progress")
async def get_demo_progress(db: Session = Depends(get_db)):
    classroom = _require_demo_classroom(db)

    participant_members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom.id,
            ClassroomMember.role == "participant",
        )
    ).all()

    participant_ids = [m.user_id for m in participant_members]
    users = db.exec(
        select(User).where(User.id.in_(participant_ids))
    ).all() if participant_ids else []
    user_map = {u.id: u for u in users}

    participants_info = []
    for pid in participant_ids:
        u = user_map.get(pid)
        participants_info.append({
            "id": pid,
            "email": u.email if u else pid,
            "name": u.name if u else pid,
        })
    participants_info.sort(key=lambda p: (p["name"] or p["email"] or "").lower())

    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom.id, "assignments")
    templates: list[str] = []
    if os.path.isdir(templates_dir):
        templates = sorted(
            e for e in os.listdir(templates_dir)
            if os.path.isdir(os.path.join(templates_dir, e))
        )

    results = db.exec(
        select(TestResult).where(TestResult.classroom_id == classroom.id)
    ).all()
    result_map: dict[str, dict[str, dict]] = {}
    for r in results:
        result_map.setdefault(r.user_id, {})[r.template_name] = {
            "passed": r.tests_passed,
            "total": r.tests_total,
        }

    students = []
    for p in participants_info:
        student_results = result_map.get(p["id"], {})
        students.append({
            "id": p["id"],
            "email": p["email"],
            "name": p["name"],
            "results": {
                t: student_results.get(t, {"passed": 0, "total": 0})
                for t in templates
            },
        })

    return {"students": students, "templates": templates}


@router.get("/weights")
async def get_demo_weights(db: Session = Depends(get_db)):
    classroom = _require_demo_classroom(db)
    weights = db.exec(
        select(AssignmentWeight).where(
            AssignmentWeight.classroom_id == classroom.id
        )
    ).all()
    return {
        "grading_mode": classroom.grading_mode,
        "weights": {w.template_name: w.weight for w in weights},
    }


@router.get("/manual-scores")
async def get_demo_manual_scores(db: Session = Depends(get_db)):
    _require_demo_classroom(db)
    scores = db.exec(
        select(ManualScore).where(ManualScore.classroom_id == DEMO_CLASSROOM_ID)
    ).all()
    result: dict[str, dict[str, float]] = {}
    for s in scores:
        result.setdefault(s.user_id, {})[s.template_name] = s.score
    return {"scores": result}


@router.get("/student-files")
async def list_demo_student_files(
    email: str,
    template: str,
    db: Session = Depends(get_db),
):
    """List files in a demo participant's assignment directory. Same shape
    as ``/classrooms/{id}/student-files``, but only returns data for users
    that are actually members of the demo classroom."""
    target_user = db.exec(select(User).where(User.email == email)).first()
    if not target_user or not get_demo_user(db, target_user.id):
        raise HTTPException(status_code=404, detail="Student not found")

    safe_template = os.path.normpath(template).lstrip("/")
    if ".." in safe_template.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid template name")

    sanitized_email = (email or "").replace("/", "_")
    base = os.path.join(
        CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "participants",
        sanitized_email, safe_template,
    )
    if not os.path.isdir(base):
        return {"files": []}

    files: set[str] = set()
    for root, dirs, fnames in os.walk(base):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        for fn in fnames:
            if fn.startswith('.'):
                continue
            rel = os.path.relpath(os.path.join(root, fn), base)
            files.add(rel)

    templates_dir = os.path.join(
        CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "assignments", safe_template
    )
    if os.path.isdir(templates_dir):
        for root, dirs, fnames in os.walk(templates_dir):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
            for fn in fnames:
                if fn.startswith('.'):
                    continue
                if fn.startswith('test_'):
                    rel = os.path.relpath(os.path.join(root, fn), templates_dir)
                    files.add(rel)

    return {"files": sorted(files)}


@router.get("/student-file")
async def get_demo_student_file(
    email: str,
    path: str,
    db: Session = Depends(get_db),
):
    target_user = db.exec(select(User).where(User.email == email)).first()
    if not target_user or not get_demo_user(db, target_user.id):
        raise HTTPException(status_code=404, detail="Student not found")

    safe_path = os.path.normpath(path).lstrip("/")
    if ".." in safe_path.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")

    sanitized_email = (email or "").replace("/", "_")
    file_path = os.path.join(
        CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "participants",
        sanitized_email, safe_path,
    )

    if not os.path.isfile(file_path):
        parts = safe_path.split(os.sep)
        if len(parts) >= 2:
            template_name = parts[0]
            rel_file = os.sep.join(parts[1:])
            template_file = os.path.join(
                CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "assignments",
                template_name, rel_file,
            )
            if os.path.isfile(template_file):
                file_path = template_file

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content, "path": path}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Binary file cannot be read")


@router.get("/draft-file")
async def get_demo_draft_file(
    draft: str,
    path: str,
    db: Session = Depends(get_db),
):
    """Read a file from the demo classroom's drafts directory."""
    _require_demo_classroom(db)

    safe_draft = os.path.normpath(draft).lstrip("/")
    safe_path = os.path.normpath(path).lstrip("/")
    if ".." in safe_draft.split(os.sep) or ".." in safe_path.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")

    file_path = os.path.join(
        CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "drafts", safe_draft, safe_path,
    )
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content, "path": path}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Binary file cannot be read")


@router.get("/assignment-file")
async def get_demo_assignment_file(
    template: str,
    path: str,
    db: Session = Depends(get_db),
):
    """Read a file directly out of the demo classroom's assignments
    directory (no per-student copy). Used by the student-perspective demo
    where there is no signed-in user to attribute submissions to."""
    _require_demo_classroom(db)

    safe_template = os.path.normpath(template).lstrip("/")
    safe_path = os.path.normpath(path).lstrip("/")
    if ".." in safe_template.split(os.sep) or ".." in safe_path.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")

    file_path = os.path.join(
        CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "assignments", safe_template, safe_path,
    )
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content, "path": path}
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Binary file cannot be read")


@router.get("/drafts")
async def list_demo_drafts(db: Session = Depends(get_db)):
    """Return the demo classroom's draft assignments. Same shape as the real
    ``/classrooms/{id}/drafts`` endpoint so the existing UI hydrates with no
    code changes."""
    _require_demo_classroom(db)
    drafts_dir = os.path.join(CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "drafts")
    if not os.path.isdir(drafts_dir):
        return {"drafts": []}

    drafts = []
    for entry in sorted(os.listdir(drafts_dir)):
        ddir = os.path.join(drafts_dir, entry)
        if not os.path.isdir(ddir):
            continue
        files: list[str] = []
        for root, _dirs, fnames in os.walk(ddir):
            for fn in fnames:
                if fn.startswith('.'):
                    continue
                files.append(os.path.relpath(os.path.join(root, fn), ddir))
        drafts.append({"name": entry, "files": sorted(files)})
    return {"drafts": drafts}


@router.get("/assignments")
async def list_demo_assignments(db: Session = Depends(get_db)):
    """Return template names and their files (relative paths). Used by the
    student-view file explorer."""
    _require_demo_classroom(db)
    templates_dir = os.path.join(CLASSROOMS_ROOT, DEMO_CLASSROOM_ID, "assignments")
    if not os.path.isdir(templates_dir):
        return {"templates": []}

    out = []
    for entry in sorted(os.listdir(templates_dir)):
        tdir = os.path.join(templates_dir, entry)
        if not os.path.isdir(tdir):
            continue
        files: list[str] = []
        for root, _dirs, fnames in os.walk(tdir):
            for fn in fnames:
                if fn.startswith('.'):
                    continue
                files.append(os.path.relpath(os.path.join(root, fn), tdir))
        out.append({"name": entry, "files": sorted(files)})
    return {"templates": out}
