"""Public read-only endpoints for the demo classroom.

Every response is built from the constants in ``backend/api/demo.py`` —
no DB access, no disk reads. That keeps the public demo isolated from
the rest of the app: nothing it does can take a connection-pool slot,
hold a write lock, or interact with real classroom data.

These endpoints mirror the response shapes of ``routers/classrooms.py``
so the same frontend page hydrates from either with only the ``apiBase``
swapped.
"""
import logging
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from ..demo import (
    DEMO_ACCESS_CODE,
    DEMO_ASSIGNMENTS,
    DEMO_CLASSROOM_ID,
    DEMO_CLASSROOM_NAME,
    DEMO_DRAFTS,
    DEMO_GRADING_MODE,
    DEMO_INSTRUCTOR_ID,
    DEMO_STUDENT_IDS,
    DEMO_STUDENTS,
    DEMO_TEST_RESULTS,
    TESTS_PER_TEMPLATE,
    student_file_content,
)

logger = logging.getLogger("demo-router")

router = APIRouter()

# email -> student id, for the security check that gates the per-student
# endpoints. Real emails should never appear here, so a request asking
# for a real user's data via this router can never succeed.
_EMAIL_TO_STUDENT_ID = {email: sid for sid, _name, email in DEMO_STUDENTS}


def _reject_traversal(*parts: str) -> None:
    for p in parts:
        if ".." in os.path.normpath(p).lstrip("/").split(os.sep):
            raise HTTPException(status_code=400, detail="Invalid path")


@router.get("/classroom")
async def get_demo_classroom():
    created_at = (datetime.utcnow() - timedelta(days=14)).isoformat() + "Z"
    return {
        "id": DEMO_CLASSROOM_ID,
        "name": DEMO_CLASSROOM_NAME,
        "created_at": created_at,
        "instructors": [DEMO_INSTRUCTOR_ID],
        "participants": list(DEMO_STUDENT_IDS),
        "access_code": DEMO_ACCESS_CODE,
        "archived": False,
        "archived_by": [],
        "joins_paused": True,
        "grading_mode": DEMO_GRADING_MODE,
    }


@router.get("/progress")
async def get_demo_progress():
    templates = list(DEMO_ASSIGNMENTS.keys())
    students = []
    for sid, name, email in DEMO_STUDENTS:
        student_results = DEMO_TEST_RESULTS.get(sid, {})
        students.append({
            "id": sid,
            "email": email,
            "name": name,
            "results": {
                t: {
                    "passed": student_results.get(t, 0),
                    "total": TESTS_PER_TEMPLATE.get(t, 0),
                }
                for t in templates
            },
        })
    students.sort(key=lambda p: (p["name"] or p["email"] or "").lower())
    return {"students": students, "templates": templates}


@router.get("/weights")
async def get_demo_weights():
    return {"grading_mode": DEMO_GRADING_MODE, "weights": {}}


@router.get("/manual-scores")
async def get_demo_manual_scores():
    return {"scores": {}}


@router.get("/student-files")
async def list_demo_student_files(email: str, template: str):
    """List files in a demo participant's assignment directory."""
    if email not in _EMAIL_TO_STUDENT_ID:
        raise HTTPException(status_code=404, detail="Student not found")
    template_files = DEMO_ASSIGNMENTS.get(template)
    if template_files is None:
        return {"files": []}
    return {"files": sorted(template_files.keys())}


@router.get("/student-file")
async def get_demo_student_file(email: str, path: str):
    student_id = _EMAIL_TO_STUDENT_ID.get(email)
    if student_id is None:
        raise HTTPException(status_code=404, detail="Student not found")
    _reject_traversal(path)
    content = student_file_content(student_id, path.lstrip("/"))
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": content, "path": path}


@router.get("/draft-file")
async def get_demo_draft_file(draft: str, path: str):
    _reject_traversal(draft, path)
    files = DEMO_DRAFTS.get(draft)
    rel = path.lstrip("/")
    if files is None or rel not in files:
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": files[rel], "path": path}


@router.get("/assignment-file")
async def get_demo_assignment_file(template: str, path: str):
    """Read a file directly out of the demo classroom's assignments
    directory (no per-student copy). Used by the student-perspective
    demo where there is no signed-in user to attribute submissions to."""
    _reject_traversal(template, path)
    files = DEMO_ASSIGNMENTS.get(template)
    rel = path.lstrip("/")
    if files is None or rel not in files:
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": files[rel], "path": path}


@router.get("/drafts")
async def list_demo_drafts():
    return {
        "drafts": [
            {"name": name, "files": sorted(files.keys())}
            for name, files in DEMO_DRAFTS.items()
        ],
    }


@router.get("/assignments")
async def list_demo_assignments():
    return {
        "templates": [
            {"name": name, "files": sorted(files.keys())}
            for name, files in DEMO_ASSIGNMENTS.items()
        ],
    }
