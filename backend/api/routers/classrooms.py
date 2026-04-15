import logging
import os
import re
import secrets
import shutil
import string
import subprocess

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.docker import (
    CLASSROOMS_ROOT,
    CONTAINER_USER_GID,
    CONTAINER_USER_UID,
    container_exists,
    spawn_container,
)

from ..database import AssignmentWeight, Classroom, ClassroomMember, ManualScore, TestResult, User
from ..dependencies import get_current_user, get_db
from ..terminal import notify_files_changed

try:
    from backend.api.terminal import user_containers
except ImportError:
    user_containers: dict = {}

logger = logging.getLogger("classrooms")

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _slugify(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "-", name).strip("-")
    return name or "classroom"


def _generate_access_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _ensure_classroom_dirs(classroom_id: str) -> str:
    """Create the classroom's directory skeleton with 33:995 ownership and
    setgid-group-writable perms (mode 2775), so that both the backend
    (www-data / 33) and the container user (999:995) can read/write, and new
    entries created inside inherit GID 995 automatically.
    """
    base = os.path.join(CLASSROOMS_ROOT, classroom_id)
    templates_dir = os.path.join(base, "assignments")
    participants_dir = os.path.join(base, "participants")
    drafts_dir = os.path.join(base, "drafts")
    os.makedirs(templates_dir, exist_ok=True)
    os.makedirs(participants_dir, exist_ok=True)
    os.makedirs(drafts_dir, exist_ok=True)
    try:
        for root, dirs, files in os.walk(base):
            os.chown(root, os.getuid(), CONTAINER_USER_GID)
            os.chmod(root, 0o2775)
            for d in dirs:
                p = os.path.join(root, d)
                os.chown(p, os.getuid(), CONTAINER_USER_GID)
                os.chmod(p, 0o2775)
            for f in files:
                fp = os.path.join(root, f)
                os.chown(fp, os.getuid(), CONTAINER_USER_GID)
                os.chmod(fp, 0o664)
    except PermissionError as e:
        logger.warning(f"Failed chown classroom dir {base}: {e}")
    return base


def _populate_templates_for_participant(
    classroom_id: str, participant_email: str
) -> None:
    """Copy all existing classroom assignments into a participant's workspace."""
    sanitized = (participant_email or "participant").replace("/", "_")
    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "assignments")
    participant_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "participants", sanitized
    )

    if not os.path.isdir(templates_dir):
        return

    os.makedirs(participant_dir, exist_ok=True)

    for entry in os.listdir(templates_dir):
        src = os.path.join(templates_dir, entry)
        dst = os.path.join(participant_dir, entry)
        if not os.path.isdir(src) or os.path.exists(dst):
            continue
        try:
            shutil.copytree(src, dst)
            for dirpath, _dirnames, filenames in os.walk(dst):
                try:
                    os.chown(dirpath, CONTAINER_USER_UID, CONTAINER_USER_GID)
                    os.chmod(dirpath, 0o775)
                except OSError:
                    pass
                for fn in filenames:
                    try:
                        fp = os.path.join(dirpath, fn)
                        os.chown(fp, CONTAINER_USER_UID, CONTAINER_USER_GID)
                        os.chmod(fp, 0o664)
                    except OSError:
                        pass
        except Exception as e:
            logger.warning(
                "Failed to copy template %s for %s: %s", entry, sanitized, e
            )


def _is_instructor(db: Session, classroom_id: str, user_id: str) -> bool:
    member = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == user_id,
            ClassroomMember.role == "instructor",
        )
    ).first()
    return member is not None


def _classroom_to_dict(
    classroom: Classroom, members: list[ClassroomMember]
) -> dict:
    """Build a response dict matching the legacy JSON shape."""
    instructors = [m.user_id for m in members if m.role == "instructor"]
    participants = [m.user_id for m in members if m.role == "participant"]
    archived_by = [m.user_id for m in members if m.archived]
    return {
        "id": classroom.id,
        "name": classroom.name,
        "created_at": classroom.created_at.isoformat() + "Z",
        "instructors": instructors,
        "participants": participants,
        "access_code": classroom.access_code,
        "archived": False,
        "archived_by": archived_by,
        "joins_paused": getattr(classroom, "joins_paused", False),
        "grading_mode": getattr(classroom, "grading_mode", "equal"),
    }


def _restart_user_container(
    user_id: str,
    user_email: str | None = None,
    port_range: tuple[int, int] | None = None,
) -> bool:
    container_name = f"user-container-{user_id}"
    restarted = False
    if container_exists(container_name):
        try:
            subprocess.run(["docker", "rm", "-f", container_name], check=False)
        except Exception as e:
            logger.warning(f"Failed to remove container {container_name}: {e}")
        user_containers.pop(user_id, None)
    try:
        spawn_container(user_id, None, container_name, port_range, user_email)
        restarted = True
        user_containers[user_id] = {
            "container_name": container_name,
            "port_range": port_range,
        }
    except Exception as e:
        logger.error(f"Failed to spawn container after operation: {e}")
    return restarted


def _get_user_port_range(user: User) -> tuple[int, int] | None:
    if user.port_start and user.port_end:
        return (user.port_start, user.port_end)
    return None


def _require_classroom(db: Session, classroom_id: str) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Not found")
    return classroom


def _require_instructor(db: Session, classroom_id: str, user_id: str) -> None:
    if not _is_instructor(db, classroom_id, user_id):
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class CreateClassroomRequest(BaseModel):
    name: str


class JoinClassroomRequest(BaseModel):
    code: str


class ValidateCodeRequest(BaseModel):
    code: str = ""


class UpdateClassroomRequest(BaseModel):
    name: str | None = None
    joins_paused: bool | None = None
    grading_mode: str | None = None  # "equal", "weighted", "manual"


class ArchiveClassroomRequest(BaseModel):
    archived: bool = True


class RestoreBySlugRequest(BaseModel):
    slug: str


class ManageMemberRequest(BaseModel):
    user_id: str = ""
    email: str = ""


# ---------------------------------------------------------------------------
# Routes — static paths first (before {classroom_id} catch-all)
# ---------------------------------------------------------------------------


@router.get("/")
async def list_classrooms(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(user.id)

    memberships = db.exec(
        select(ClassroomMember).where(ClassroomMember.user_id == user_id)
    ).all()

    if not memberships:
        return {
            "owner": [],
            "owner_archived": [],
            "joined": [],
            "joined_archived": [],
        }

    classroom_ids = list({m.classroom_id for m in memberships})

    classrooms = db.exec(
        select(Classroom).where(Classroom.id.in_(classroom_ids))
    ).all()
    classroom_map = {c.id: c for c in classrooms}

    all_members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id.in_(classroom_ids)
        )
    ).all()
    members_by_classroom: dict[str, list[ClassroomMember]] = {}
    for m in all_members:
        members_by_classroom.setdefault(m.classroom_id, []).append(m)

    owner: list[dict] = []
    owner_archived: list[dict] = []
    joined: list[dict] = []
    joined_archived: list[dict] = []

    for membership in memberships:
        classroom = classroom_map.get(membership.classroom_id)
        if not classroom:
            continue
        members = members_by_classroom.get(classroom.id, [])
        classroom_dict = _classroom_to_dict(classroom, members)

        if membership.role == "instructor":
            if membership.archived:
                owner_archived.append(classroom_dict)
            else:
                owner.append(classroom_dict)
        elif membership.role == "participant":
            if membership.archived:
                joined_archived.append(classroom_dict)
            else:
                joined.append(classroom_dict)

    return {
        "owner": owner,
        "owner_archived": owner_archived,
        "joined": joined,
        "joined_archived": joined_archived,
    }


@router.post("/", status_code=201)
async def create_classroom(
    body: CreateClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")

    user_id = str(user.id)
    new_slug = _slugify(name)

    # Uniqueness check using slugified name among user's classrooms
    user_memberships = db.exec(
        select(ClassroomMember).where(ClassroomMember.user_id == user_id)
    ).all()
    if user_memberships:
        user_classroom_ids = [m.classroom_id for m in user_memberships]
        user_classrooms = db.exec(
            select(Classroom).where(Classroom.id.in_(user_classroom_ids))
        ).all()
        for c in user_classrooms:
            if _slugify(c.name) == new_slug:
                raise HTTPException(
                    status_code=400,
                    detail="A classroom with a similar name already exists",
                )

    try:
        access_code = _generate_access_code()

        classroom = Classroom(
            name=name,
            access_code=access_code,
            created_by=user_id,
        )
        db.add(classroom)
        db.flush()

        member = ClassroomMember(
            classroom_id=classroom.id,
            user_id=user_id,
            role="instructor",
        )
        db.add(member)
        db.commit()

        try:
            _ensure_classroom_dirs(classroom.id)
        except Exception as e:
            logger.error(f"Failed to ensure classroom dirs for {classroom.id}: {e}")

        port_range = _get_user_port_range(user)
        restarted = _restart_user_container(user.id, user.email, port_range)

        logger.info(f"Created classroom {classroom.id} by user {user.id}")
        return {
            "id": classroom.id,
            "access_code": access_code,
            "name": name,
            "restarted": restarted,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create classroom: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/join")
async def join_classroom(
    body: JoinClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = body.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")

    try:
        classroom = db.exec(
            select(Classroom).where(Classroom.access_code == code)
        ).first()
        if not classroom:
            raise HTTPException(status_code=404, detail="Invalid code")

        if classroom.joins_paused:
            raise HTTPException(
                status_code=403, detail="Joins are currently paused for this classroom"
            )

        user_id = str(user.id)

        existing = db.exec(
            select(ClassroomMember).where(
                ClassroomMember.classroom_id == classroom.id,
                ClassroomMember.user_id == user_id,
            )
        ).first()

        if existing:
            if existing.role == "instructor":
                raise HTTPException(
                    status_code=400,
                    detail="You are the instructor of this classroom",
                )
            raise HTTPException(
                status_code=400, detail="You already joined this classroom"
            )

        # Check for slug collision with user's existing classrooms
        target_slug = _slugify(classroom.name)
        has_collision = False
        user_memberships = db.exec(
            select(ClassroomMember).where(ClassroomMember.user_id == user_id)
        ).all()
        if user_memberships:
            user_classroom_ids = [m.classroom_id for m in user_memberships]
            user_classrooms = db.exec(
                select(Classroom).where(Classroom.id.in_(user_classroom_ids))
            ).all()
            for c in user_classrooms:
                if c.id != classroom.id and _slugify(c.name) == target_slug:
                    has_collision = True
                    break

        member = ClassroomMember(
            classroom_id=classroom.id,
            user_id=user_id,
            role="participant",
        )
        db.add(member)
        db.commit()

        port_range = _get_user_port_range(user)
        restarted = _restart_user_container(user.id, user.email, port_range)

        # Populate existing assignments into the new participant's workspace
        _populate_templates_for_participant(classroom.id, user.email)

        logger.info(
            f"JOIN: user {user.id} joined classroom {classroom.id} "
            f"(restarted={restarted})"
        )

        response: dict = {
            "joined": True,
            "classroom_id": classroom.id,
            "name": classroom.name,
            "restarted": restarted,
        }
        if has_collision:
            response["warning"] = (
                "A classroom with a similar name already exists. "
                "A suffix was added to distinguish them."
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to join classroom: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/validate-code")
async def validate_classroom_code(
    body: ValidateCodeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = (body.code or "").strip().upper()
    if not code:
        return {"valid": False}
    try:
        classroom = db.exec(
            select(Classroom).where(Classroom.access_code == code)
        ).first()
        return {"valid": classroom is not None}
    except Exception as e:
        logger.error(f"Failed to validate classroom code: {e}")
        return {"valid": False}


@router.post("/restore-by-slug")
async def restore_by_slug(
    body: RestoreBySlugRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slug = body.slug.strip().lower()
    if not slug:
        raise HTTPException(status_code=400, detail="Slug required")

    user_id = str(user.id)

    archived_memberships = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.user_id == user_id,
            ClassroomMember.archived == True,  # noqa: E712
        )
    ).all()

    if not archived_memberships:
        raise HTTPException(status_code=404, detail="Archived classroom not found")

    classroom_ids = [m.classroom_id for m in archived_memberships]
    classrooms = db.exec(
        select(Classroom).where(Classroom.id.in_(classroom_ids))
    ).all()
    classroom_map = {c.id: c for c in classrooms}

    target_membership: ClassroomMember | None = None
    target_classroom: Classroom | None = None
    for m in archived_memberships:
        c = classroom_map.get(m.classroom_id)
        if c:
            name = c.name or c.id
            if _slugify(name) == slug:
                target_membership = m
                target_classroom = c
                break

    if not target_membership or not target_classroom:
        raise HTTPException(status_code=404, detail="Archived classroom not found")

    target_membership.archived = False
    db.add(target_membership)
    db.commit()

    port_range = _get_user_port_range(user)
    restarted = _restart_user_container(user.id, user.email, port_range)

    logger.info(
        f"User {user_id} restored classroom {target_classroom.id} from archive"
    )
    return {
        "restored": True,
        "classroom_id": target_classroom.id,
        "restarted": restarted,
    }


@router.get("/assignments")
async def list_classroom_assignments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(user.id)

    memberships = db.exec(
        select(ClassroomMember).where(ClassroomMember.user_id == user_id)
    ).all()

    if not memberships:
        return {"classrooms": []}

    classroom_ids = [m.classroom_id for m in memberships]
    classrooms = db.exec(
        select(Classroom).where(Classroom.id.in_(classroom_ids))
    ).all()
    classroom_map = {c.id: c for c in classrooms}

    result = []
    for membership in memberships:
        classroom = classroom_map.get(membership.classroom_id)
        if not classroom:
            continue

        templates_dir = os.path.join(CLASSROOMS_ROOT, classroom.id, "assignments")
        if not os.path.isdir(templates_dir):
            continue

        templates = []
        try:
            for entry in os.listdir(templates_dir):
                template_path = os.path.join(templates_dir, entry)
                if os.path.isdir(template_path):
                    files: list[str] = []
                    for root, _dirs, filenames in os.walk(template_path):
                        for filename in filenames:
                            rel_path = os.path.relpath(
                                os.path.join(root, filename), template_path
                            )
                            files.append(rel_path)
                    if files:
                        templates.append({"name": entry, "files": files})
        except Exception as e:
            logger.warning(
                f"Failed to list assignments for classroom {classroom.id}: {e}"
            )
            continue

        if templates:
            result.append(
                {
                    "id": classroom.id,
                    "name": classroom.name,
                    "templates": templates,
                }
            )

    return {"classrooms": result}


# ---------------------------------------------------------------------------
# Routes — parameterized paths (must come after static paths)
# ---------------------------------------------------------------------------


@router.get("/{classroom_id}/access-code")
async def get_access_code(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))
    return {"access_code": classroom.access_code}


@router.post("/{classroom_id}/access-code")
async def regenerate_access_code(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    new_code = _generate_access_code()
    classroom.access_code = new_code
    db.add(classroom)
    db.commit()
    return {"access_code": new_code}


@router.patch("/{classroom_id}")
async def update_classroom(
    classroom_id: str,
    body: UpdateClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    if body.name is not None:
        new_name = body.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Name required")
        classroom.name = new_name

    if body.joins_paused is not None:
        classroom.joins_paused = body.joins_paused

    if body.grading_mode is not None:
        if body.grading_mode not in ("equal", "weighted", "manual"):
            raise HTTPException(status_code=400, detail="Invalid grading mode")
        classroom.grading_mode = body.grading_mode

    db.add(classroom)
    db.commit()
    return {
        "id": classroom_id,
        "name": classroom.name,
        "joins_paused": classroom.joins_paused,
        "grading_mode": classroom.grading_mode,
    }


@router.delete("/{classroom_id}")
async def delete_classroom(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    try:
        base = os.path.join(CLASSROOMS_ROOT, classroom_id)
        if os.path.isdir(base):
            shutil.rmtree(base)
    except Exception as e:
        logger.warning(f"Failed removing classroom dir {classroom_id}: {e}")

    members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id
        )
    ).all()
    for m in members:
        db.delete(m)
    db.delete(classroom)
    db.commit()
    return {"deleted": True}


@router.post("/{classroom_id}/archive")
async def archive_classroom(
    classroom_id: str,
    body: ArchiveClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)

    user_id = str(user.id)
    membership = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == user_id,
        )
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")

    membership.archived = body.archived
    db.add(membership)
    db.commit()

    port_range = _get_user_port_range(user)
    restarted = _restart_user_container(user.id, user.email, port_range)
    return {"archived": body.archived, "restarted": restarted}


@router.get("/{classroom_id}/participants")
async def list_participants(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    participants = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.role == "participant",
        )
    ).all()
    return {"participants": [m.user_id for m in participants]}


@router.post("/{classroom_id}/participants")
async def add_participant(
    classroom_id: str,
    body: ManageMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    target_user_id = body.user_id.strip()
    if not target_user_id:
        email = body.email.strip()
        if not email:
            raise HTTPException(
                status_code=400, detail="user_id or email required"
            )
        target_user = db.exec(
            select(User).where(User.email == email)
        ).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        target_user_id = target_user.id

    existing = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user_id,
        )
    ).first()

    if existing:
        if existing.role == "participant":
            raise HTTPException(status_code=400, detail="Already a participant")
        raise HTTPException(status_code=400, detail="User is an instructor")

    member = ClassroomMember(
        classroom_id=classroom_id,
        user_id=target_user_id,
        role="participant",
    )
    db.add(member)
    db.commit()
    return {"added": True}


@router.delete("/{classroom_id}/participants")
async def remove_participant(
    classroom_id: str,
    body: ManageMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    target_user_id = body.user_id.strip()
    if not target_user_id:
        raise HTTPException(status_code=400, detail="user_id required")

    membership = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user_id,
            ClassroomMember.role == "participant",
        )
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Not a participant")

    db.delete(membership)
    db.commit()
    return {"removed": True}


@router.get("/{classroom_id}/instructors")
async def list_instructors(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    instructors = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.role == "instructor",
        )
    ).all()
    return {"instructors": [m.user_id for m in instructors]}


@router.post("/{classroom_id}/instructors")
async def add_instructor(
    classroom_id: str,
    body: ManageMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    target_user_id = body.user_id.strip()
    if not target_user_id:
        email = body.email.strip()
        if not email:
            raise HTTPException(
                status_code=400, detail="user_id or email required"
            )
        target_user = db.exec(
            select(User).where(User.email == email)
        ).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        target_user_id = target_user.id

    existing = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user_id,
        )
    ).first()

    if existing:
        if existing.role == "instructor":
            raise HTTPException(status_code=400, detail="Already an instructor")
        # Upgrade participant to instructor
        existing.role = "instructor"
        db.add(existing)
        db.commit()
        return {"added": True}

    member = ClassroomMember(
        classroom_id=classroom_id,
        user_id=target_user_id,
        role="instructor",
    )
    db.add(member)
    db.commit()
    return {"added": True}


@router.delete("/{classroom_id}/instructors")
async def remove_instructor(
    classroom_id: str,
    body: ManageMemberRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    target_user_id = body.user_id.strip()
    if not target_user_id:
        raise HTTPException(status_code=400, detail="user_id required")

    membership = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user_id,
            ClassroomMember.role == "instructor",
        )
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Not an instructor")

    instructor_count = len(
        db.exec(
            select(ClassroomMember).where(
                ClassroomMember.classroom_id == classroom_id,
                ClassroomMember.role == "instructor",
            )
        ).all()
    )
    if instructor_count <= 1:
        raise HTTPException(
            status_code=400, detail="Cannot remove the last instructor"
        )

    db.delete(membership)
    db.commit()
    return {"removed": True}



@router.post("/{classroom_id}/assignments/upload")
async def upload_classroom_assignment(
    classroom_id: str,
    files: list[UploadFile] = File(...),
    template_name: str = Form(default=""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        template_name = template_name.strip()

        classroom_base = os.path.join(CLASSROOMS_ROOT, classroom_id)
        templates_dir = os.path.join(classroom_base, "assignments")
        os.makedirs(templates_dir, exist_ok=True)

        if template_name:
            target_dir = os.path.join(templates_dir, template_name)
            os.makedirs(target_dir, exist_ok=True)
        else:
            target_dir = templates_dir

        saved_files: list[str] = []
        for file in files:
            if not file.filename:
                continue

            filename = os.path.basename(file.filename)
            if "/" in file.filename:
                parts = file.filename.split("/")
                if template_name and parts[0] == template_name:
                    parts = parts[1:]
                nested_path = os.path.join(target_dir, *parts[:-1])
                if nested_path != target_dir:
                    os.makedirs(nested_path, exist_ok=True)
                filepath = os.path.join(nested_path, parts[-1])
            else:
                filepath = os.path.join(target_dir, filename)

            content = await file.read()
            with open(filepath, "wb") as fh:
                fh.write(content)

            try:
                os.chown(filepath, CONTAINER_USER_UID, CONTAINER_USER_GID)
                parent = os.path.dirname(filepath)
                while parent.startswith(templates_dir):
                    os.chown(parent, CONTAINER_USER_UID, CONTAINER_USER_GID)
                    os.chmod(parent, 0o775)
                    if parent == templates_dir:
                        break
                    parent = os.path.dirname(parent)
            except PermissionError as e:
                logger.warning(f"Failed to chown {filepath}: {e}")

            saved_files.append(filename)

        logger.info(
            f"Uploaded {len(saved_files)} template files to classroom "
            f"{classroom_id} by user {user.id}"
        )

        return {
            "uploaded": True,
            "files": saved_files,
            "count": len(saved_files),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload classroom template: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ---------------------------------------------------------------------------
# Progress / Test results
# ---------------------------------------------------------------------------


@router.get("/{classroom_id}/progress")
async def get_classroom_progress(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all students' test results for all templates in a classroom."""
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    # Get all participants
    participant_members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.role == "participant",
        )
    ).all()

    participant_ids = [m.user_id for m in participant_members]
    participants_info: list[dict] = []
    if participant_ids:
        users = db.exec(
            select(User).where(User.id.in_(participant_ids))
        ).all()
        user_map = {u.id: u for u in users}
        for pid in participant_ids:
            u = user_map.get(pid)
            participants_info.append({
                "id": pid,
                "email": u.email if u else pid,
                "name": u.name if u else pid,
            })

    # Sort alphabetically by name
    participants_info.sort(key=lambda p: (p["name"] or p["email"] or "").lower())

    # Get assignments
    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "assignments")
    templates: list[str] = []
    if os.path.isdir(templates_dir):
        templates = sorted(
            e for e in os.listdir(templates_dir)
            if os.path.isdir(os.path.join(templates_dir, e))
        )

    # Get test results
    results = db.exec(
        select(TestResult).where(TestResult.classroom_id == classroom_id)
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

    return {
        "students": students,
        "templates": templates,
    }


class RunStudentTestsRequest(BaseModel):
    student_email: str
    template_name: str


@router.post("/{classroom_id}/run-student-tests")
async def run_student_tests(
    classroom_id: str,
    body: RunStudentTestsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run tests for a single student on a single template and return raw output."""
    from backend.test_runner import run_tests_for_student_with_output

    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from datetime import datetime

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        passed, total, output = await loop.run_in_executor(
            pool,
            run_tests_for_student_with_output,
            classroom_id, body.template_name, body.student_email,
        )

    # Also persist the result
    student_email_sanitized = (body.student_email or "").replace("/", "_")
    student_user = db.exec(
        select(User).where(User.email == body.student_email)
    ).first()
    if student_user:
        existing = db.exec(
            select(TestResult).where(
                TestResult.classroom_id == classroom_id,
                TestResult.user_id == student_user.id,
                TestResult.template_name == body.template_name,
            )
        ).first()
        if existing:
            existing.tests_passed = passed
            existing.tests_total = total
            existing.last_run = datetime.utcnow()
            db.add(existing)
        else:
            db.add(TestResult(
                classroom_id=classroom_id,
                user_id=student_user.id,
                template_name=body.template_name,
                tests_passed=passed,
                tests_total=total,
            ))
        db.commit()

    return {
        "passed": passed,
        "total": total,
        "output": output,
    }


class RunTestsRequest(BaseModel):
    template_name: str | None = None


@router.post("/{classroom_id}/run-tests")
async def run_classroom_tests(
    classroom_id: str,
    body: RunTestsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run tests for all students on a specific template (or all templates)."""
    from backend.test_runner import run_tests_for_student

    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    # Get assignments to test
    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "assignments")
    if body.template_name:
        templates = [body.template_name]
    elif os.path.isdir(templates_dir):
        templates = [
            e for e in os.listdir(templates_dir)
            if os.path.isdir(os.path.join(templates_dir, e))
        ]
    else:
        templates = []

    # Get participants
    participant_members = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.role == "participant",
        )
    ).all()

    participant_ids = [m.user_id for m in participant_members]
    users = db.exec(
        select(User).where(User.id.in_(participant_ids))
    ).all() if participant_ids else []
    user_map = {u.id: u for u in users}

    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from datetime import datetime

    # Build list of (template, participant_id, email) jobs
    jobs: list[tuple[str, str, str]] = []
    for template_name in templates:
        for pid in participant_ids:
            u = user_map.get(pid)
            if not u:
                continue
            jobs.append((template_name, pid, u.email))

    # Run all test jobs in parallel using a thread pool
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        futures = [
            loop.run_in_executor(
                pool,
                run_tests_for_student,
                classroom_id, tmpl, email,
            )
            for tmpl, _pid, email in jobs
        ]
        results = await asyncio.gather(*futures)

    # Write all results to DB
    updated_results = []
    for (template_name, pid, _email), (passed, total) in zip(jobs, results):
        existing = db.exec(
            select(TestResult).where(
                TestResult.classroom_id == classroom_id,
                TestResult.user_id == pid,
                TestResult.template_name == template_name,
            )
        ).first()

        if existing:
            existing.tests_passed = passed
            existing.tests_total = total
            existing.last_run = datetime.utcnow()
            db.add(existing)
        else:
            db.add(TestResult(
                classroom_id=classroom_id,
                user_id=pid,
                template_name=template_name,
                tests_passed=passed,
                tests_total=total,
            ))

        updated_results.append({
            "user_id": pid,
            "template_name": template_name,
            "passed": passed,
            "total": total,
        })

    db.commit()
    return {"results": updated_results}


# ---------------------------------------------------------------------------
# Assignment weights
# ---------------------------------------------------------------------------


class UpdateWeightsRequest(BaseModel):
    grading_mode: str  # "equal", "weighted", "manual"
    weights: dict[str, float] = {}


@router.get("/{classroom_id}/weights")
async def get_weights(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    weights = db.exec(
        select(AssignmentWeight).where(
            AssignmentWeight.classroom_id == classroom_id
        )
    ).all()

    return {
        "grading_mode": classroom.grading_mode,
        "weights": {w.template_name: w.weight for w in weights},
    }


@router.put("/{classroom_id}/weights")
async def update_weights(
    classroom_id: str,
    body: UpdateWeightsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    if body.grading_mode not in ("equal", "weighted", "manual"):
        raise HTTPException(status_code=400, detail="Invalid grading mode")

    classroom.grading_mode = body.grading_mode
    db.add(classroom)

    # Only update stored weights when the mode actually uses them.
    # Switching to "equal" just changes the mode — existing weights are
    # preserved so nothing is lost if the teacher switches back.
    if body.grading_mode != "equal":
        existing = db.exec(
            select(AssignmentWeight).where(
                AssignmentWeight.classroom_id == classroom_id
            )
        ).all()
        for w in existing:
            db.delete(w)

        for template_name, weight in body.weights.items():
            db.add(AssignmentWeight(
                classroom_id=classroom_id,
                template_name=template_name,
                weight=weight,
            ))

    db.commit()

    # Return current weights from DB so frontend stays in sync
    weights = db.exec(
        select(AssignmentWeight).where(
            AssignmentWeight.classroom_id == classroom_id
        )
    ).all()
    return {
        "grading_mode": body.grading_mode,
        "weights": {w.template_name: w.weight for w in weights},
    }


# ---------------------------------------------------------------------------
# Manual scores (teacher only)
# ---------------------------------------------------------------------------


class UpdateManualScoreRequest(BaseModel):
    user_id: str
    template_name: str
    score: float


@router.get("/{classroom_id}/manual-scores")
async def get_manual_scores(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    scores = db.exec(
        select(ManualScore).where(ManualScore.classroom_id == classroom_id)
    ).all()

    result: dict[str, dict[str, float]] = {}
    for s in scores:
        result.setdefault(s.user_id, {})[s.template_name] = s.score

    return {"scores": result}


@router.put("/{classroom_id}/manual-score")
async def update_manual_score(
    classroom_id: str,
    body: UpdateManualScoreRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    existing = db.exec(
        select(ManualScore).where(
            ManualScore.classroom_id == classroom_id,
            ManualScore.user_id == body.user_id,
            ManualScore.template_name == body.template_name,
        )
    ).first()

    if existing:
        existing.score = body.score
        db.add(existing)
    else:
        db.add(ManualScore(
            classroom_id=classroom_id,
            user_id=body.user_id,
            template_name=body.template_name,
            score=body.score,
        ))

    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# View student file (teacher only)
# ---------------------------------------------------------------------------


@router.get("/{classroom_id}/student-files")
async def list_student_files(
    classroom_id: str,
    email: str,
    template: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List files in a student's assignment directory. Teacher-only."""
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    target_user = db.exec(select(User).where(User.email == email)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Student not found")

    member = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user.id,
            ClassroomMember.role == "participant",
        )
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Student is not in this classroom")

    safe_template = os.path.normpath(template).lstrip("/")
    if ".." in safe_template.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid template name")

    sanitized_email = (email or "").replace("/", "_")
    base = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "participants", sanitized_email, safe_template
    )
    if not os.path.isdir(base):
        return {"files": []}

    files: set[str] = set()
    for root, dirs, fnames in os.walk(base):
        # Skip hidden dirs and __pycache__
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        for fn in fnames:
            if fn.startswith('.'):
                continue
            rel = os.path.relpath(os.path.join(root, fn), base)
            files.add(rel)

    # Also include test files from the assignment directory so teachers
    # can always see them in the student file listing.
    templates_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "assignments", safe_template
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


@router.get("/{classroom_id}/student-file")
async def get_student_file(
    classroom_id: str,
    email: str,
    path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Read a student's file content. Teacher-only."""
    _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    # Validate email belongs to a participant
    target_user = db.exec(
        select(User).where(User.email == email)
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Student not found")

    member = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == target_user.id,
            ClassroomMember.role == "participant",
        )
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Student is not in this classroom")

    # Build the file path - prevent directory traversal
    safe_path = os.path.normpath(path).lstrip("/")
    if ".." in safe_path.split(os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")

    sanitized_email = (email or "").replace("/", "_")
    file_path = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "participants", sanitized_email, safe_path
    )

    # Fall back to template directory for test files
    if not os.path.isfile(file_path):
        # The path format is "template_name/file" — extract template name
        parts = safe_path.split(os.sep)
        if len(parts) >= 2:
            template_name = parts[0]
            rel_file = os.sep.join(parts[1:])
            template_file = os.path.join(
                CLASSROOMS_ROOT, classroom_id, "assignments", template_name, rel_file
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


# ---------------------------------------------------------------------------
# Draft management
# ---------------------------------------------------------------------------


def _set_ownership_recursive(path: str) -> None:
    """Set container ownership on a directory tree."""
    for dirpath, _dirnames, filenames in os.walk(path):
        try:
            os.chown(dirpath, CONTAINER_USER_UID, CONTAINER_USER_GID)
            os.chmod(dirpath, 0o775)
        except OSError:
            pass
        for fn in filenames:
            try:
                fp = os.path.join(dirpath, fn)
                os.chown(fp, CONTAINER_USER_UID, CONTAINER_USER_GID)
                os.chmod(fp, 0o664)
            except OSError:
                pass


def _list_dir_files(base: str) -> list[str]:
    """Return relative file paths under *base*."""
    result: list[str] = []
    if not os.path.isdir(base):
        return result
    for root, _dirs, files in os.walk(base):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), base)
            result.append(rel)
    return sorted(result)


@router.get("/{classroom_id}/drafts")
async def list_drafts(
    classroom_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_instructor(db, classroom_id, str(user.id)):
        raise HTTPException(status_code=403, detail="Not an instructor")

    drafts_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "drafts")
    if not os.path.isdir(drafts_dir):
        return {"drafts": []}

    drafts = []
    for entry in sorted(os.listdir(drafts_dir)):
        entry_path = os.path.join(drafts_dir, entry)
        if os.path.isdir(entry_path):
            files = _list_dir_files(entry_path)
            drafts.append({"name": entry, "files": files})
    return {"drafts": drafts}


@router.post("/{classroom_id}/drafts")
async def upload_draft(
    classroom_id: str,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_instructor(db, classroom_id, str(user.id)):
        raise HTTPException(status_code=403, detail="Not an instructor")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Derive draft name from the top-level folder in the uploaded paths
    first_name = files[0].filename or ""
    draft_name = first_name.split("/")[0] if "/" in first_name else first_name
    if not draft_name:
        raise HTTPException(status_code=400, detail="Could not determine draft name")

    _ensure_classroom_dirs(classroom_id)
    drafts_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "drafts")
    draft_path = os.path.join(drafts_dir, draft_name)

    # Remove existing draft with same name so re-uploads replace cleanly
    if os.path.exists(draft_path):
        shutil.rmtree(draft_path)

    for f in files:
        rel = f.filename or ""
        safe = os.path.normpath(os.path.join(draft_path, rel.split("/", 1)[1] if "/" in rel else rel))
        if not safe.startswith(draft_path):
            continue
        os.makedirs(os.path.dirname(safe), exist_ok=True)
        content = await f.read()
        with open(safe, "wb") as fh:
            fh.write(content)

    _set_ownership_recursive(draft_path)
    await notify_files_changed(str(user.id))
    return {"name": draft_name, "files": _list_dir_files(draft_path)}


@router.delete("/{classroom_id}/drafts/{draft_name}")
async def delete_draft(
    classroom_id: str,
    draft_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_instructor(db, classroom_id, str(user.id)):
        raise HTTPException(status_code=403, detail="Not an instructor")

    draft_path = os.path.join(CLASSROOMS_ROOT, classroom_id, "drafts", draft_name)
    if not os.path.isdir(draft_path):
        raise HTTPException(status_code=404, detail="Draft not found")

    shutil.rmtree(draft_path)
    await notify_files_changed(str(user.id))
    return {"message": "Draft deleted"}


@router.post("/{classroom_id}/drafts/{draft_name}/publish")
async def publish_draft(
    classroom_id: str,
    draft_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_instructor(db, classroom_id, str(user.id)):
        raise HTTPException(status_code=403, detail="Not an instructor")

    draft_path = os.path.join(CLASSROOMS_ROOT, classroom_id, "drafts", draft_name)
    if not os.path.isdir(draft_path):
        raise HTTPException(status_code=404, detail="Draft not found")

    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "assignments")
    os.makedirs(templates_dir, exist_ok=True)
    dest = os.path.join(templates_dir, draft_name)

    # Atomic move: draft → assignments
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.move(draft_path, dest)
    # Defensive: if shutil fell back to copy+unlink and the unlink failed
    # silently, the draft would still be listed. Ensure it is gone.
    if os.path.exists(draft_path):
        try:
            shutil.rmtree(draft_path)
        except OSError as e:
            logger.warning(
                "Publish: failed to remove leftover draft %s: %s", draft_path, e
            )
    _set_ownership_recursive(dest)

    # Push to all current participants
    participants = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.role == "participant",
        )
    ).all()

    if participants:
        participant_users = db.exec(
            select(User).where(User.id.in_([p.user_id for p in participants]))
        ).all()
        for pu in participant_users:
            sanitized = (pu.email or "participant").replace("/", "_")
            participant_dir = os.path.join(
                CLASSROOMS_ROOT, classroom_id, "participants", sanitized
            )
            student_dest = os.path.join(participant_dir, draft_name)
            if os.path.exists(student_dest):
                continue  # Don't overwrite existing student work
            try:
                os.makedirs(participant_dir, exist_ok=True)
                shutil.copytree(dest, student_dest)
                _set_ownership_recursive(student_dest)
                await notify_files_changed(str(pu.id))
            except Exception as e:
                logger.warning(
                    "Failed to push template %s to %s: %s", draft_name, pu.email, e
                )

    await notify_files_changed(str(user.id))
    return {"message": "Published", "name": draft_name}


@router.delete("/{classroom_id}/assignments/{template_name}")
async def delete_assignment(
    classroom_id: str,
    template_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _is_instructor(db, classroom_id, str(user.id)):
        raise HTTPException(status_code=403, detail="Not an instructor")

    assignment_path = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "assignments", template_name
    )
    if not os.path.isdir(assignment_path):
        raise HTTPException(status_code=404, detail="Assignment not found")

    shutil.rmtree(assignment_path)
    await notify_files_changed(str(user.id))
    return {"message": "Assignment deleted"}
