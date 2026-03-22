import io
import logging
import os
import shutil
import subprocess
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.docker import CLASSROOMS_ROOT, UPLOADS_ROOT, CONTAINER_USER_UID, CONTAINER_USER_GID

from ..database import Classroom, ClassroomMember, User
from ..dependencies import get_current_user, get_db

logger = logging.getLogger("files")

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def set_container_ownership(path: str) -> None:
    """Set ownership/permissions so both www-data and container user 999:995 can access.

    Directories stay owned by www-data with mode 777 (world-writable) so both
    principals can traverse and create files without needing CAP_CHOWN.
    Files are chowned to 999:995 so the container user owns what it creates.
    """
    try:
        if os.path.isdir(path):
            os.chmod(path, 0o777)
        else:
            os.chown(path, CONTAINER_USER_UID, CONTAINER_USER_GID)
            os.chmod(path, 0o644)
    except OSError as e:
        logger.warning(f"Failed to set ownership for {path}: {e}")


def _translate_container_path(path: str) -> str:
    """Convert absolute container classroom paths to host paths."""
    if not path:
        return path
    if path.startswith("/classrooms/"):
        tail = path[len("/classrooms/") :].lstrip("/")
        return os.path.join(CLASSROOMS_ROOT, tail)
    return path


def _resolve_classroom_path(upload_dir: str, rel_path: str) -> str | None:
    """If *rel_path* begins with a symlink targeting ``/classrooms/<…>``,
    map it to the corresponding host path under ``CLASSROOMS_ROOT``.

    Returns the mapped absolute host path, or ``None`` if not a classroom
    symlink path.
    """
    try:
        safe_rel = (rel_path or "").lstrip("/")
        if not safe_rel:
            return None
        parts = safe_rel.split("/", 1)
        top = parts[0]
        remainder = parts[1] if len(parts) > 1 else ""
        top_abs = os.path.join(upload_dir, top)
        if not os.path.islink(top_abs):
            return None
        target = os.readlink(top_abs)
        if target.startswith("/classrooms/"):
            tail = target[len("/classrooms/") :].lstrip("/")
        elif target.startswith(CLASSROOMS_ROOT):
            tail = target[len(CLASSROOMS_ROOT) :].lstrip("/")
        else:
            return None
        host_base = os.path.join(CLASSROOMS_ROOT, tail)
        candidate = os.path.join(host_base, remainder) if remainder else host_base

        normalized = os.path.normpath(candidate)

        real_root = os.path.realpath(CLASSROOMS_ROOT)
        real_norm = os.path.realpath(normalized)
        try:
            if (
                os.path.commonpath([CLASSROOMS_ROOT, normalized]) != CLASSROOMS_ROOT
                and os.path.commonpath([real_root, real_norm]) != real_root
            ):
                return None
        except ValueError:
            return None

        return normalized
    except OSError:
        return None


def _is_reserved_name(name: str) -> bool:
    """Check if a file/folder name is reserved."""
    return name.lower() == "archive"


def _append_classroom_tree_entries(
    file_list: list[str],
    slug_name: str,
    host_base: str,
    _visited_paths: set[str] | None = None,
) -> None:
    """Append directory and file entries for a classroom mount under the
    given slug name."""
    if not os.path.isdir(host_base):
        return

    if _visited_paths is None:
        _visited_paths = set()

    try:
        canonical = os.path.realpath(host_base)
        if canonical in _visited_paths:
            return
        _visited_paths.add(canonical)
    except OSError:
        return

    file_list.append(f"{slug_name}/")

    # First pass: handle symlinks specially at this level
    try:
        for entry in os.listdir(host_base):
            full_path = os.path.join(host_base, entry)
            if os.path.islink(full_path):
                try:
                    target = os.readlink(full_path)
                    if target.startswith("/classrooms/"):
                        target_host = target.replace(
                            "/classrooms/", f"{CLASSROOMS_ROOT}/"
                        )
                    else:
                        if not os.path.isabs(target):
                            target_host = os.path.join(host_base, target)
                        else:
                            target_host = target

                    if os.path.isdir(target_host):
                        dir_entry = f"{slug_name}/{entry}/"
                        if dir_entry not in file_list:
                            file_list.append(dir_entry)
                            _append_classroom_tree_entries(
                                file_list,
                                f"{slug_name}/{entry}",
                                target_host,
                                _visited_paths,
                            )
                    else:
                        file_entry = f"{slug_name}/{entry}"
                        if file_entry not in file_list:
                            file_list.append(file_entry)
                except (OSError, IOError) as e:
                    logger.debug(f"Failed to process symlink {full_path}: {e}")
    except Exception as e:
        logger.warning(f"Failed to process top-level symlinks in {host_base}: {e}")

    # Second pass: os.walk for regular files and directories (skip symlinks)
    for root, dirs, files_in_dir in os.walk(host_base, followlinks=False):
        rel = os.path.relpath(root, host_base)
        prefix = slug_name if rel == "." else f"{slug_name}/{rel}"

        for d in list(dirs):
            full_path = os.path.join(root, d)
            if not os.path.islink(full_path):
                entry = f"{prefix}/{d}/"
                if entry not in file_list:
                    file_list.append(entry)
            else:
                dirs.remove(d)

        for name in files_in_dir:
            full_path = os.path.join(root, name)
            if not os.path.islink(full_path):
                entry = f"{prefix}/{name}"
                if entry not in file_list:
                    file_list.append(entry)


def _is_instructor_for_classroom(
    db: Session, classroom_id: str, user_id: str
) -> bool:
    """Return True if the user is an instructor for the given classroom."""
    member = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == user_id,
            ClassroomMember.role == "instructor",
        )
    ).first()
    return member is not None


def _check_templates_write_access(
    file_path: str, filename: str, user_id: str, db: Session
) -> str | None:
    """Return an error message if writing to a templates path is denied,
    or ``None`` if the write is allowed."""
    rel_to_classrooms = ""
    if file_path.startswith(CLASSROOMS_ROOT):
        rel_to_classrooms = file_path[len(CLASSROOMS_ROOT) :].lstrip("/")

    is_templates_path = (
        "/templates/" in f"/{rel_to_classrooms}"
        or rel_to_classrooms.endswith("/templates")
        or "/classroom-templates/" in filename
        or filename.startswith("classroom-templates/")
    )
    if not is_templates_path:
        return None

    classroom_id = None
    if rel_to_classrooms:
        parts = rel_to_classrooms.split("/")
        if parts:
            classroom_id = parts[0]

    if classroom_id and _is_instructor_for_classroom(db, classroom_id, str(user_id)):
        return None

    return "Templates folder is read-only. Use 'Copy to Workspace' instead."


def _validate_path_within_roots(abs_path: str, upload_dir: str) -> None:
    """Raise 400 if *abs_path* escapes the allowed roots."""
    allowed_roots = [upload_dir, CLASSROOMS_ROOT]
    try:
        if not any(
            os.path.commonpath([root, abs_path]) == root for root in allowed_roots
        ):
            raise HTTPException(status_code=400, detail="Invalid path")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")


def _resolve_abs_path(upload_dir: str, rel_path: str) -> str:
    mapped = _resolve_classroom_path(upload_dir, rel_path)
    return os.path.normpath(mapped if mapped else os.path.join(upload_dir, rel_path))


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class MoveRequest(BaseModel):
    source: str
    destination: str
    overwrite: bool = False


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/list")
async def list_files(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"

    if not os.path.exists(upload_dir):
        return {"files": [], "classroomMeta": {}}

    file_tree: list[str] = []
    expanded_symlinks: set[str] = set()
    classroom_symlinks: dict[str, str] = {}
    top_level_symlinks: set[str] = set()

    # Detect top-level classroom symlinks
    try:
        for entry in os.listdir(upload_dir):
            full_path = os.path.join(upload_dir, entry)
            if not os.path.islink(full_path):
                continue

            target = os.readlink(full_path)
            tail: str | None = None
            if target.startswith(CLASSROOMS_ROOT):
                tail = target[len(CLASSROOMS_ROOT) :].lstrip("/")
            elif target.startswith("/classrooms/"):
                tail = target[len("/classrooms/") :].lstrip("/")
            else:
                continue

            if not tail:
                continue

            host_base = os.path.join(CLASSROOMS_ROOT, tail)
            if not os.path.exists(host_base):
                logger.warning(
                    f"[{user.id}] Host classroom path missing for symlink {entry}: {host_base}"
                )
                continue

            _append_classroom_tree_entries(file_tree, entry, host_base)
            expanded_symlinks.add(f"{entry}/")
            top_level_symlinks.add(entry)

            classroom_id = tail.split("/", 1)[0]
            classroom_symlinks[entry] = classroom_id
    except FileNotFoundError:
        pass

    # Walk user files under UPLOADS_ROOT/<id>
    for root, dirs, files_in_dir in os.walk(upload_dir):
        for d in list(dirs):
            full_path = os.path.join(root, d)
            relative_path = os.path.relpath(full_path, upload_dir)

            if relative_path.split(os.sep)[0] in top_level_symlinks:
                dirs.remove(d)
                continue

            if os.path.islink(full_path):
                target = os.readlink(full_path)
                if target.startswith("/classrooms/"):
                    tail = target[len("/classrooms/") :].lstrip("/")
                    host_base = os.path.join(CLASSROOMS_ROOT, tail)
                    _append_classroom_tree_entries(
                        file_tree, relative_path, host_base
                    )
                    expanded_symlinks.add(f"{relative_path}/")
                    if "/" not in relative_path:
                        classroom_id = tail.split("/", 1)[0]
                        classroom_symlinks[relative_path] = classroom_id
                    dirs.remove(d)
                    continue
            file_tree.append(f"{relative_path}/")

        for name in files_in_dir:
            full_path = os.path.join(root, name)
            relative_path = os.path.relpath(full_path, upload_dir)
            if os.path.islink(full_path):
                target = os.readlink(full_path)
                if target.startswith("/classrooms/"):
                    tail = target[len("/classrooms/") :].lstrip("/")
                    host_base = os.path.join(CLASSROOMS_ROOT, tail)
                    _append_classroom_tree_entries(
                        file_tree, relative_path, host_base
                    )
                    expanded_symlinks.add(relative_path)
                    continue
            file_tree.append(relative_path)

    if expanded_symlinks:
        file_tree = [e for e in file_tree if e not in expanded_symlinks]

    # Build classroom metadata from the database
    classroom_meta: dict[str, dict] = {}
    if classroom_symlinks:
        classroom_ids = list(set(classroom_symlinks.values()))
        classrooms = db.exec(
            select(Classroom).where(Classroom.id.in_(classroom_ids))
        ).all()
        classroom_name_map = {c.id: c.name for c in classrooms}

        members = db.exec(
            select(ClassroomMember).where(
                ClassroomMember.classroom_id.in_(classroom_ids),
                ClassroomMember.user_id == str(user.id),
            )
        ).all()
        member_map = {m.classroom_id: m for m in members}

        for slug, cid in classroom_symlinks.items():
            member = member_map.get(cid)
            classroom_meta[slug] = {
                "id": cid,
                "name": classroom_name_map.get(cid),
                "archived": member.archived if member else False,
                "isInstructor": (member.role == "instructor") if member else False,
            }

    return {"files": file_tree, "classroomMeta": classroom_meta}


@router.post("/move")
async def move_file_or_folder(
    body: MoveRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source_param = body.source.lstrip("/")
    destination_param = body.destination.lstrip("/")

    if not source_param or not destination_param:
        raise HTTPException(status_code=400, detail="Invalid path")

    dest_name = destination_param.rstrip("/").split("/")[-1]
    if _is_reserved_name(dest_name):
        raise HTTPException(status_code=400, detail="The name 'archive' is reserved")

    src_parts = source_param.strip("/").split("/")
    dst_parts = destination_param.strip("/").split("/")
    if src_parts and src_parts[0] == "archive":
        raise HTTPException(status_code=403, detail="The archive folder is read-only")
    if dst_parts and dst_parts[0] == "archive":
        raise HTTPException(
            status_code=403, detail="Cannot move items into the archive folder"
        )

    try:
        upload_dir = f"{UPLOADS_ROOT}/{user.id}"

        src_mapped = _resolve_classroom_path(upload_dir, source_param)
        dst_mapped = _resolve_classroom_path(upload_dir, destination_param)

        src_path = (
            src_mapped
            if src_mapped
            else os.path.normpath(os.path.join(upload_dir, source_param))
        )
        dst_path = (
            dst_mapped
            if dst_mapped
            else os.path.normpath(os.path.join(upload_dir, destination_param))
        )

        allowed_roots = [upload_dir, CLASSROOMS_ROOT]
        src_ok = dst_ok = False
        for root in allowed_roots:
            try:
                if os.path.commonpath([root, src_path]) == root:
                    src_ok = True
                if os.path.commonpath([root, dst_path]) == root:
                    dst_ok = True
            except ValueError:
                continue
        if not src_ok or not dst_ok:
            raise HTTPException(status_code=400, detail="Invalid path")

        if not os.path.exists(src_path):
            raise HTTPException(status_code=404, detail="Source not found")

        try:
            src_rel = os.path.relpath(src_path, upload_dir)
            dst_rel = os.path.relpath(dst_path, upload_dir)
            if dst_rel == src_rel or dst_rel.startswith(src_rel + os.sep):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot move a folder into itself or its subdirectory",
                )
        except ValueError:
            pass

        dst_parent = os.path.dirname(dst_path)
        if (
            dst_parent
            and not os.path.exists(dst_parent)
            and not os.path.islink(dst_parent)
        ):
            os.makedirs(dst_parent, exist_ok=True)
            set_container_ownership(dst_parent)

        if os.path.exists(dst_path):
            if not body.overwrite:
                raise HTTPException(
                    status_code=409, detail="Destination already exists"
                )
            if os.path.isdir(dst_path):
                shutil.rmtree(dst_path)
            else:
                os.remove(dst_path)

        shutil.move(src_path, dst_path)
        set_container_ownership(dst_path)

        return {"message": "Moved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"[{user.id}] Move failed: {source_param} -> {destination_param}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to move: {e}")


@router.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    destination: str = Form(default=""),
    user: User = Depends(get_current_user),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    destination = destination.strip("/")

    if destination:
        target_dir = os.path.normpath(os.path.join(upload_dir, destination))
        if not target_dir.startswith(upload_dir):
            raise HTTPException(status_code=400, detail="Invalid destination")
        if os.path.isfile(target_dir):
            os.remove(target_dir)
        os.makedirs(target_dir, exist_ok=True)
        os.chmod(target_dir, 0o777)
    else:
        target_dir = upload_dir

    for f in files:
        file_path = os.path.join(target_dir, os.path.basename(f.filename))
        content = await f.read()
        with open(file_path, "wb") as fh:
            fh.write(content)
        set_container_ownership(file_path)

    if destination:
        set_container_ownership(target_dir)

    return PlainTextResponse("File uploaded successfully")


@router.post("/upload-folder")
async def upload_folder(
    request: Request,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # When classroom_id is provided, import into that classroom's templates dir
    form = await request.form()
    classroom_id = form.get("classroom_id")
    target_base = upload_dir

    if classroom_id:
        classroom = db.exec(
            select(Classroom).where(Classroom.id == str(classroom_id))
        ).first()
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found")
        if not _is_instructor_for_classroom(db, str(classroom_id), str(user.id)):
            raise HTTPException(
                status_code=403,
                detail="Only instructors can import into classroom templates",
            )
        target_base = os.path.join(CLASSROOMS_ROOT, str(classroom_id), "templates")
        os.makedirs(target_base, exist_ok=True)
        set_container_ownership(target_base)

    for f in files:
        safe_path = os.path.normpath(os.path.join(target_base, f.filename))
        if not safe_path.startswith(target_base):
            continue

        if not classroom_id:
            classroom_target = _resolve_classroom_path(upload_dir, f.filename)
            dest_path = classroom_target if classroom_target else safe_path

            if dest_path.startswith(CLASSROOMS_ROOT):
                rel_to_classrooms = dest_path[len(CLASSROOMS_ROOT) :].lstrip("/")
                is_templates_path = (
                    "/templates/" in f"/{rel_to_classrooms}"
                    or rel_to_classrooms.endswith("/templates")
                )
                if is_templates_path:
                    parts = rel_to_classrooms.split("/")
                    cid = parts[0] if parts else None
                    if not cid or not _is_instructor_for_classroom(
                        db, cid, str(user.id)
                    ):
                        raise HTTPException(
                            status_code=403,
                            detail="Templates folder is read-only for participants",
                        )
        else:
            dest_path = safe_path

        dir_path = os.path.dirname(dest_path)
        # Ensure existing parent dirs inside CLASSROOMS_ROOT are writable.
        # Dirs are always kept www-data 777 so chown is not needed here.
        if dest_path.startswith(CLASSROOMS_ROOT):
            p = dir_path
            while p.startswith(CLASSROOMS_ROOT) and p != CLASSROOMS_ROOT:
                if os.path.exists(p):
                    try:
                        os.chmod(p, 0o777)
                    except OSError:
                        pass
                p = os.path.dirname(p)
        os.makedirs(dir_path, exist_ok=True)
        content = await f.read()
        with open(dest_path, "wb") as fh:
            fh.write(content)
        set_container_ownership(dir_path)
        set_container_ownership(dest_path)

    move_into = form.get("move-into")
    if move_into and not classroom_id:
        container_name = f"user-container-{user.id}"
        try:
            subprocess.run(
                [
                    "docker", "exec", container_name,
                    "tmux", "send-keys", "-t", "3compute", "Enter",
                ],
                check=True,
            )
            subprocess.run(
                [
                    "docker", "exec", container_name,
                    "tmux", "send-keys", "-t", "3compute",
                    f"cd '/app/{move_into}'", "Enter",
                ],
                check=True,
            )
        except subprocess.CalledProcessError:
            pass

    return PlainTextResponse("Folder uploaded successfully")


@router.get("/file/{file_path:path}")
async def read_file(
    file_path: str,
    user: User = Depends(get_current_user),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    abs_path = _resolve_abs_path(upload_dir, file_path)
    _validate_path_within_roots(abs_path, upload_dir)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    image_extensions = {"jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico"}
    file_ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""

    if file_ext in image_extensions:
        return FileResponse(abs_path)

    try:
        with open(abs_path, "r", encoding="utf-8") as fh:
            content = fh.read()
        return PlainTextResponse(content)
    except UnicodeDecodeError:
        return FileResponse(abs_path)


@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    user: User = Depends(get_current_user),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    abs_path = _resolve_abs_path(upload_dir, file_path)
    _validate_path_within_roots(abs_path, upload_dir)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Not found")

    if os.path.isfile(abs_path):
        filename = os.path.basename(abs_path)
        return FileResponse(
            abs_path,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # Folder — zip it in memory and stream back
    folder_name = os.path.basename(abs_path.rstrip("/")) or "download"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _dirs, files_in_dir in os.walk(abs_path):
            for name in files_in_dir:
                full = os.path.join(root, name)
                arcname = os.path.join(folder_name, os.path.relpath(full, abs_path))
                zf.write(full, arcname)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{folder_name}.zip"'},
    )


@router.put("/file/{file_path:path}")
async def update_file(
    file_path: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    abs_path = _resolve_abs_path(upload_dir, file_path)
    _validate_path_within_roots(abs_path, upload_dir)

    parts = file_path.strip("/").split("/")
    if parts and parts[0] == "archive":
        raise HTTPException(status_code=403, detail="The archive folder is read-only")

    err = _check_templates_write_access(abs_path, file_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    body = await request.body()
    content = body.decode("utf-8")
    with open(abs_path, "w") as fh:
        fh.write(content)
    set_container_ownership(abs_path)
    return PlainTextResponse("File updated successfully")


@router.delete("/file/{file_path:path}")
async def delete_file(
    file_path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    abs_path = _resolve_abs_path(upload_dir, file_path)
    _validate_path_within_roots(abs_path, upload_dir)

    parts = file_path.strip("/").split("/")
    if parts and parts[0] == "archive":
        raise HTTPException(status_code=403, detail="The archive folder is read-only")

    err = _check_templates_write_access(abs_path, file_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.isdir(abs_path):
        shutil.rmtree(abs_path)
    else:
        os.remove(abs_path)
    return PlainTextResponse("File deleted successfully")


@router.post("/file/{file_path:path}")
async def create_file(
    file_path: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    mapped = _resolve_classroom_path(upload_dir, file_path)
    abs_path = os.path.normpath(
        mapped if mapped else os.path.join(upload_dir, file_path)
    )
    _validate_path_within_roots(abs_path, upload_dir)

    name = file_path.rstrip("/").split("/")[-1]
    if _is_reserved_name(name):
        raise HTTPException(status_code=400, detail="The name 'archive' is reserved")

    parts = file_path.strip("/").split("/")
    if parts and parts[0] == "archive":
        raise HTTPException(status_code=403, detail="The archive folder is read-only")

    err = _check_templates_write_access(abs_path, file_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    # Re-resolve if the path starts with a symlink that wasn't resolved
    if not mapped:
        path_parts = file_path.strip("/").split("/")
        if path_parts:
            top_abs = os.path.join(upload_dir, path_parts[0])
            if os.path.islink(top_abs):
                resolved = _resolve_classroom_path(upload_dir, file_path)
                if resolved:
                    abs_path = resolved

    if file_path.endswith("/"):
        # Creating a directory
        normalized_path = abs_path.rstrip("/")
        if os.path.isfile(normalized_path):
            raise HTTPException(
                status_code=409, detail="A file with the same name already exists"
            )
        try:
            os.makedirs(abs_path, exist_ok=True)
        except NotADirectoryError:
            raise HTTPException(
                status_code=409,
                detail="A file exists in the path; cannot create directory",
            )
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")
        set_container_ownership(abs_path)
        return PlainTextResponse("Directory created successfully")

    # Creating a file
    dir_path = os.path.dirname(abs_path)
    if dir_path and dir_path != upload_dir:
        try:
            os.makedirs(dir_path, exist_ok=True)
            set_container_ownership(dir_path)
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")

    if os.path.isdir(abs_path):
        raise HTTPException(
            status_code=409, detail="A folder with the same name already exists"
        )
    if os.path.exists(abs_path):
        raise HTTPException(status_code=400, detail="File already exists")

    try:
        with open(abs_path, "w") as fh:
            fh.write("")
        set_container_ownership(abs_path)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create file: {e}")

    return PlainTextResponse("File created successfully")
