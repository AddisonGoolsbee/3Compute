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

from ..database import Classroom, ClassroomMember, User
from ..dependencies import get_current_user, get_db

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
    base = os.path.join(CLASSROOMS_ROOT, classroom_id)
    templates_dir = os.path.join(base, "templates")
    participants_dir = os.path.join(base, "participants")
    os.makedirs(templates_dir, exist_ok=True)
    os.makedirs(participants_dir, exist_ok=True)
    os.chmod(base, 0o777)
    try:
        for root, dirs, files in os.walk(base):
            os.chown(root, CONTAINER_USER_UID, CONTAINER_USER_GID)
            for d in dirs:
                os.chown(
                    os.path.join(root, d), CONTAINER_USER_UID, CONTAINER_USER_GID
                )
            for f in files:
                os.chown(
                    os.path.join(root, f), CONTAINER_USER_UID, CONTAINER_USER_GID
                )
    except PermissionError as e:
        logger.warning(f"Failed chown classroom dir {base}: {e}")
    return base


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


class RenameClassroomRequest(BaseModel):
    name: str


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


@router.get("/templates")
async def list_classroom_templates(
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

        templates_dir = os.path.join(CLASSROOMS_ROOT, classroom.id, "templates")
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
                f"Failed to list templates for classroom {classroom.id}: {e}"
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
async def rename_classroom(
    classroom_id: str,
    body: RenameClassroomRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    classroom = _require_classroom(db, classroom_id)
    _require_instructor(db, classroom_id, str(user.id))

    new_name = body.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name required")

    classroom.name = new_name
    db.add(classroom)
    db.commit()
    return {"id": classroom_id, "name": new_name}


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


@router.post("/{classroom_id}/templates/upload")
async def upload_classroom_template(
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
        templates_dir = os.path.join(classroom_base, "templates")
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
