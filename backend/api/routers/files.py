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
from ..terminal import notify_files_changed

logger = logging.getLogger("files")

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def set_container_ownership(path: str) -> None:
    """Set ownership/permissions so both www-data and container user 999:995
    can access a path.

    Directories: 2775 — setgid-group-writable so children inherit GID 995.
    Files: 664 — group-writable so the backend (www-data, member of
    3compute-container / GID 995) and the container user can both edit.
    chown to 999:995 requires CAP_CHOWN; if unavailable we fall back to a
    group-only chgrp so group access still survives.
    """
    try:
        # chown applies to both dirs and files. Try the full chown first,
        # fall back to group-only (survives non-root).
        try:
            os.chown(path, CONTAINER_USER_UID, CONTAINER_USER_GID)
        except OSError:
            try:
                os.chown(path, -1, CONTAINER_USER_GID)
            except OSError:
                pass
        if os.path.isdir(path):
            os.chmod(path, 0o2775)
        else:
            os.chmod(path, 0o664)
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


# Directories that are always hidden from the file explorer.
_HIDDEN_DIRS = frozenset({"__pycache__", ".git", "node_modules"})


def _is_hidden(name: str) -> bool:
    """Return True if *name* should be hidden from the file explorer.

    Hidden = starts with '.' (except .env*) or is in _HIDDEN_DIRS.
    """
    if name in _HIDDEN_DIRS:
        return True
    if name.startswith(".") and not name.startswith(".env") and not name.startswith(".git"):
        return True
    return False


def _append_classroom_tree_entries(
    file_list: list[str],
    slug_name: str,
    host_base: str,
    _visited_paths: set[str] | None = None,
    show_hidden: bool = False,
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
            if not show_hidden and _is_hidden(entry):
                continue
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
                                show_hidden=show_hidden,
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
            if not show_hidden and _is_hidden(d):
                dirs.remove(d)
                continue
            full_path = os.path.join(root, d)
            if not os.path.islink(full_path):
                entry = f"{prefix}/{d}/"
                if entry not in file_list:
                    file_list.append(entry)
            else:
                dirs.remove(d)

        for name in files_in_dir:
            if not show_hidden and _is_hidden(name):
                continue
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
    """Return an error message if writing to an assignments path is denied,
    or ``None`` if the write is allowed."""
    rel_to_classrooms = ""
    if file_path.startswith(CLASSROOMS_ROOT):
        rel_to_classrooms = file_path[len(CLASSROOMS_ROOT) :].lstrip("/")

    is_templates_path = (
        "/assignments/" in f"/{rel_to_classrooms}"
        or rel_to_classrooms.endswith("/assignments")
        or "/assignments/" in filename
        or filename.startswith("assignments/")
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

    return "Assignments folder is read-only. Use 'Copy to Workspace' instead."


def _check_participant_scope(
    abs_path: str, user_id: str, db: Session
) -> str | None:
    """Return an error if a participant writes outside template folders.

    Students can only create/modify files inside template subdirectories
    within their participant folder, not create arbitrary top-level entries.
    """
    if not abs_path.startswith(CLASSROOMS_ROOT):
        return None

    rel = abs_path[len(CLASSROOMS_ROOT) :].lstrip("/")
    parts = rel.split("/")

    # Structure: {classroom_id}/participants/{email}/{template_name}/...
    if len(parts) < 3 or parts[1] != "participants":
        return None

    classroom_id = parts[0]

    # Instructors can do anything
    if _is_instructor_for_classroom(db, classroom_id, str(user_id)):
        return None

    # Must target a path inside a known template folder
    if len(parts) < 4:
        return "You can only create files inside assignment folders."

    template_name = parts[3]
    templates_dir = os.path.join(CLASSROOMS_ROOT, classroom_id, "assignments")

    if os.path.isdir(os.path.join(templates_dir, template_name)):
        return None

    return "You can only create files inside assignment folders."


def _check_participant_remove_path(
    abs_path: str, user_id: str, db: Session
) -> str | None:
    """Return an error if a participant tries to move or delete a protected
    path inside their classroom.

    Participants may not:
      - move or delete an assignment folder (their own copy) while the
        teacher still has the assignment published in ``assignments/``. Once
        the teacher removes the assignment from the classroom, the student
        can clean up or move their copy freely.
      - move or delete the ``.templates`` symlink (or anything inside it).
    """
    if not abs_path.startswith(CLASSROOMS_ROOT):
        return None

    rel = abs_path[len(CLASSROOMS_ROOT) :].lstrip("/")
    parts = rel.split("/")

    # Structure we care about: {classroom_id}/participants/{email}/...
    if len(parts) < 4 or parts[1] != "participants":
        return None

    classroom_id = parts[0]

    # Instructors can do whatever they want.
    if _is_instructor_for_classroom(db, classroom_id, str(user_id)):
        return None

    fourth = parts[3]

    # The `.templates` symlink and anything under it are off-limits to move
    # or delete — it's a read-only reference view of the teacher's folder.
    if fourth == ".templates":
        return "The .templates folder is a read-only reference and can't be moved or removed."

    # Protect the top-level assignment folder itself (parts == 4 means the
    # path points at {email}/{assignment_name}, not a file inside it). Once
    # the teacher removes the assignment from `assignments/`, this check
    # stops applying and the student can clean up.
    if len(parts) == 4:
        assignment_path = os.path.join(
            CLASSROOMS_ROOT, classroom_id, "assignments", fourth
        )
        if os.path.isdir(assignment_path):
            return (
                f"\"{fourth}\" is still published in this classroom. "
                "Ask your teacher to remove the assignment first if you want to delete or move it."
            )

    return None


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


class CopyRequest(BaseModel):
    source: str
    destination: str


# ---------------------------------------------------------------------------
# Auto-generated README
# ---------------------------------------------------------------------------

_STUDENT_README = """\
# Welcome to 3Compute!

3Compute is a free educational platform that gives you a cloud-based development environment. No local setup required.

## Getting Started

1. **Templates**: click Templates in the file explorer to create a new project from a starter (e.g. Website, Discord Bot). The template files are copied into your workspace.
2. **Upload**: upload your own files or folders using the Upload button.
3. **New**: create new files or folders with the New button.

You also have a full Linux terminal below the editor. Some useful commands:
- `python file.py` to run a Python script
- `mkdir folder_name` to create a folder
- `rm file_name` to delete a file (irreversible!)
- `cd folder_name` to change to a folder

## Classrooms

If your teacher gave you a **join code**, go to the Classrooms page and enter it.
Once you join, assignment folders appear in your workspace automatically.
You can edit files inside assignment folders, but you cannot create new top-level folders in the classroom. Just work inside the assignments your teacher provides.
You can view or copy the assignment templates in the classroom's `.templates/` folder for reference of the original files. It is hidden by default — enable **Show hidden files** in the explorer to see it.

Files named `test_*.py` are **test files** written by your teacher for automated evaluation. You can see them but cannot modify them.

## Workspace Tour

- **File Explorer** (left): browse, upload, create, and delete files.
- **Editor** (center): edit code with syntax highlighting. Use the Save button or the language selector to change highlighting mode. Toggle Markdown preview for `.md` files.
- **Terminal** (bottom): full shell access. This is where you will type commands. Open multiple tabs; closing a tab stops its processes.

## Nice to know

Your 3Compute terminal is a window into a session running on the server. You can close the browser and your tabs will keep running. A consequence of this is that the terminal can only display as many lines as the screen is tall. If a command prints more output than fits on screen in a single burst, it will appear to overwrite some of the previous contents. The best approach for large output is to pipe it into a file (e.g. `python run_tests.py > output.txt`), then open that file in the editor.

## Learn more

Open any template's `README.md` after creating it for project-specific instructions.
"""

_TEACHER_README = """\
# Welcome to 3Compute!

3Compute is a free educational platform that gives you and your students cloud-based development environments. No local setup required.

## Getting Started

1. **Templates**: click Templates in the file explorer to create a new project from a starter (e.g. Website, Discord Bot). The template files are copied into your workspace.
2. **Upload**: upload your own files or folders using the Upload button.
3. **New**: create new files or folders with the New button.

You also have a full Linux terminal below the editor. Some useful commands:
- `python file.py` to run a Python script
- `mkdir folder_name` to create a folder
- `rm file_name` to delete a file (irreversible!)
- `cd folder_name` to change to a folder

## Managing Classrooms

### Creating a classroom
Go to the **Classrooms** page and click **Create**. Share the join code with your students.

### Adding assignments
1. Open your classroom from the **Classrooms** page, go to the **Assignments** tab, and click **Upload Folder** to upload a folder with your starter code and any `test_*.py` test files.
2. Your upload appears as a draft. Click **Edit in IDE** to refine it, then click **Publish** when ready.
3. You can also manage assignments in the IDE. Drafts are synced with the classroom's `drafts/` folder. Moving a folder into the `assignments/` folder publishes it immediately.

Every current student receives a copy when you publish. Students who join later also get all assignments automatically. Once published, edits to the original are not synced to existing students, but the template is updated for future students. Current students can view the modifications in their classroom's `.templates/` folder (hidden by default — they enable **Show hidden files** in the explorer to see it), even if it is not on their copy of the assignment.

### Deleting assignments
Delete the assignment from the **Assignments** tab, or remove the folder from your classroom's `assignments/` folder in the IDE. Students keep their existing copies, but the assignment will no longer appear in the gradebook or be distributed to new students.

### Test files & grading
Files named `test_*.py` are used for automated grading. Students can see them but cannot modify them. Run tests from the classroom detail page to see scores.

You can also import lessons with pre-written tests from the **Lessons** page.

### Writing your own tests
Test files must be named `test_*.py` (e.g. `test_math.py`). Each file is run as a standalone Python script. The last line of output must be:

```
###3COMPUTE_RESULTS:passed/total###
```

For example, `###3COMPUTE_RESULTS:4/5###` means 4 out of 5 tests passed. 3Compute reads this line to determine the score. As long as your script prints this line at the end, you can structure the rest however you like. Here is a simple pattern used by our built-in lessons:

```python
passed = 0
failed = 0

def check(description, got, expected):
    global passed, failed
    if got == expected:
        print(f"  PASS  {description}")
        passed += 1
    else:
        print(f"  FAIL  {description}")
        print(f"          expected: {expected!r}")
        print(f"          got:      {got!r}")
        failed += 1

from main import add, multiply  # import student code

check("add(2, 3) == 5", add(2, 3), 5)
check("multiply(4, 5) == 20", multiply(4, 5), 20)

total = passed + failed
print(f"Results: {passed}/{total} tests passed")
print(f"###3COMPUTE_RESULTS:{passed}/{total}###")
```

If an assignment has multiple `test_*.py` files, their results are combined into a single score.

### Tracking progress
The **Students** tab lets you view each student's progress. Select an assignment, then click on a student to see their files and test results. You can also run tests from here.

The **Gradebook** tab shows a matrix of all students and assignments with their scores. You can grade assignments automatically through test cases or use manual scoring. Students cannot see the gradebook.

### Student restrictions
Students can only create and edit files inside their assignment folders. They cannot create new top-level folders in the classroom.

## Workspace Tour

- **File Explorer** (left): browse, upload, create, and delete files.
- **Editor** (center): edit code with syntax highlighting. Use the Save button or the language selector to change highlighting mode. Toggle Markdown preview for `.md` files.
- **Terminal** (bottom): full shell access. Open multiple tabs; closing a tab stops its processes.

## Nice to know

The 3Compute terminal is a window into a session running on the server. You can close the browser and your tabs will keep running. A consequence of this is that the terminal can only display as many lines as the screen is tall. If a command prints more output than fits on screen in a single burst, it will appear to overwrite some of the previous contents. The best approach for large output is to pipe it into a file (e.g. `python run_tests.py > output.txt`), then open that file in the editor.

## Learn more

Open any template's `README.md` after creating it for project-specific instructions.
"""


def _ensure_readme(upload_dir: str, user: User) -> None:
    """Create a role-specific README.md in the user's workspace if missing."""
    if not user.role:
        return  # Don't create until onboarding sets a role
    readme_path = os.path.join(upload_dir, "README.md")
    if os.path.exists(readme_path):
        return
    os.makedirs(upload_dir, exist_ok=True)
    content = _TEACHER_README if user.role == "teacher" else _STUDENT_README
    try:
        with open(readme_path, "w") as fh:
            fh.write(content)
        set_container_ownership(readme_path)
    except OSError as e:
        logger.warning(f"Failed to create README for user {user.id}: {e}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/list")
async def list_files(
    show_hidden: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload_dir = f"{UPLOADS_ROOT}/{user.id}"
    _ensure_readme(upload_dir, user)

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

            _append_classroom_tree_entries(
                file_tree, entry, host_base, show_hidden=show_hidden
            )
            expanded_symlinks.add(f"{entry}/")
            top_level_symlinks.add(entry)

            classroom_id = tail.split("/", 1)[0]
            classroom_symlinks[entry] = classroom_id
    except FileNotFoundError:
        pass

    # Walk user files under UPLOADS_ROOT/<id>
    for root, dirs, files_in_dir in os.walk(upload_dir):
        for d in list(dirs):
            # Skip hidden directories (dotfiles except .env*, __pycache__, etc.)
            if not show_hidden and _is_hidden(d):
                dirs.remove(d)
                continue

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
                        file_tree, relative_path, host_base, show_hidden=show_hidden
                    )
                    expanded_symlinks.add(f"{relative_path}/")
                    if "/" not in relative_path:
                        classroom_id = tail.split("/", 1)[0]
                        classroom_symlinks[relative_path] = classroom_id
                    dirs.remove(d)
                    continue
            file_tree.append(f"{relative_path}/")

        for name in files_in_dir:
            # Skip hidden files (dotfiles except .env*, .pyc, etc.)
            if (not show_hidden and _is_hidden(name)) or name.endswith(".pyc"):
                continue

            full_path = os.path.join(root, name)
            relative_path = os.path.relpath(full_path, upload_dir)
            if os.path.islink(full_path):
                target = os.readlink(full_path)
                if target.startswith("/classrooms/"):
                    tail = target[len("/classrooms/") :].lstrip("/")
                    host_base = os.path.join(CLASSROOMS_ROOT, tail)
                    _append_classroom_tree_entries(
                        file_tree, relative_path, host_base, show_hidden=show_hidden
                    )
                    expanded_symlinks.add(relative_path)
                    continue
            file_tree.append(relative_path)

    # Deduplicate while preserving order. We used to unconditionally drop any
    # entry whose path also appeared in `expanded_symlinks` (i.e. the slug
    # stub that `_append_classroom_tree_entries` inserts up front), on the
    # theory that the child entries would imply the parent folder. That
    # broke the empty-classroom case: a student who just joined sees only a
    # hidden `.templates/` symlink inside their classroom, which the hidden
    # filter strips, leaving no children to imply the parent — so the whole
    # classroom folder disappeared from the explorer until "Show hidden
    # files" was toggled on. Keeping every entry (but deduped) means the
    # slug stub survives even when the classroom has no visible items yet,
    # and folders are hidden only if their own name is hidden.
    if file_tree:
        seen: set[str] = set()
        file_tree = [e for e in file_tree if not (e in seen or seen.add(e))]

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

        err = _check_participant_scope(dst_path, user.id, db)
        if err:
            raise HTTPException(status_code=403, detail=err)

        err = _check_participant_remove_path(src_path, user.id, db)
        if err:
            raise HTTPException(status_code=403, detail=err)

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

        await notify_files_changed(str(user.id))
        return {"message": "Moved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"[{user.id}] Move failed: {source_param} -> {destination_param}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to move: {e}")


@router.post("/copy")
async def copy_file_or_folder(
    body: CopyRequest,
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

    _validate_path_within_roots(src_path, upload_dir)
    _validate_path_within_roots(dst_path, upload_dir)

    err = _check_templates_write_access(dst_path, destination_param, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    err = _check_participant_scope(dst_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    if not os.path.exists(src_path):
        raise HTTPException(status_code=404, detail="Source not found")

    # Auto-rename on collision: append (1), (2), etc.
    final_dst = dst_path
    if os.path.exists(final_dst):
        base, ext = os.path.splitext(dst_path)
        if os.path.isdir(src_path):
            ext = ""
            base = dst_path.rstrip("/")
        i = 1
        while os.path.exists(f"{base} ({i}){ext}"):
            i += 1
        final_dst = f"{base} ({i}){ext}"

    try:
        if os.path.isdir(src_path):
            shutil.copytree(src_path, final_dst)
            for root, dirs, fnames in os.walk(final_dst):
                set_container_ownership(root)
                for fn in fnames:
                    set_container_ownership(os.path.join(root, fn))
        else:
            dst_parent = os.path.dirname(final_dst)
            os.makedirs(dst_parent, exist_ok=True)
            set_container_ownership(dst_parent)
            shutil.copy2(src_path, final_dst)
            set_container_ownership(final_dst)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to copy: {e}")

    await notify_files_changed(str(user.id))
    return {"message": "Copied successfully"}


@router.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    destination: str = Form(default=""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
        # Check if destination resolves through a symlink into a classroom
        classroom_dest = _resolve_classroom_path(upload_dir, destination)
        if classroom_dest:
            err = _check_participant_scope(classroom_dest, user.id, db)
            if err:
                raise HTTPException(status_code=403, detail=err)
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

    await notify_files_changed(str(user.id))
    return PlainTextResponse("File uploaded successfully")


def _collision_safe_copy(src_dir: str, dest_parent: str, name: str) -> None:
    """Copy src_dir into dest_parent as *name*, appending (1), (2), … on collision."""
    candidate = os.path.join(dest_parent, name)
    if os.path.exists(candidate):
        i = 1
        while os.path.exists(os.path.join(dest_parent, f"{name} ({i})")):
            i += 1
        candidate = os.path.join(dest_parent, f"{name} ({i})")
    shutil.copytree(src_dir, candidate)
    for root, dirs, fnames in os.walk(candidate):
        try:
            os.chmod(root, 0o775)
            os.chown(root, CONTAINER_USER_UID, CONTAINER_USER_GID)
        except OSError:
            pass
        for fn in fnames:
            fp = os.path.join(root, fn)
            try:
                os.chown(fp, CONTAINER_USER_UID, CONTAINER_USER_GID)
                os.chmod(fp, 0o664)
            except OSError:
                pass


async def _push_template_to_participants(
    cid: str,
    template_name: str,
    src: str,
    db: Session,
) -> None:
    """Copy *src* directory into every participant's workspace as *template_name*."""
    if not os.path.isdir(src):
        logger.warning("Template source not found, skipping push: %s", src)
        return

    participants = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == cid,
            ClassroomMember.role == "participant",
        )
    ).all()
    if not participants:
        return

    participant_users = db.exec(
        select(User).where(User.id.in_([p.user_id for p in participants]))
    ).all()

    for participant in participant_users:
        sanitized_email = (participant.email or "participant").replace("/", "_")
        classroom_participant_dir = os.path.join(CLASSROOMS_ROOT, cid, "participants", sanitized_email)
        if not os.path.isdir(classroom_participant_dir):
            continue
        try:
            _collision_safe_copy(src, classroom_participant_dir, template_name)
            await notify_files_changed(str(participant.id))
        except Exception as e:
            logger.warning(
                "Failed to push template %s to participant %s: %s",
                template_name, participant.id, e,
            )


async def _push_classroom_templates_to_participants(
    templates_written: set[tuple[str, str]],
    db: Session,
) -> None:
    """For each (classroom_id, template_name) push assignments/{template_name}."""
    for cid, template_name in templates_written:
        src = os.path.join(CLASSROOMS_ROOT, cid, "assignments", template_name)
        await _push_template_to_participants(cid, template_name, src, db)


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
                detail="Only instructors can import into classroom assignments",
            )
        target_base = os.path.join(CLASSROOMS_ROOT, str(classroom_id), "assignments")
        os.makedirs(target_base, exist_ok=True)
        set_container_ownership(target_base)

    # Track (classroom_id, template_name) pairs written to assignments
    classroom_templates_written: set[tuple[str, str]] = set()

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
                    "/assignments/" in f"/{rel_to_classrooms}"
                    or rel_to_classrooms.endswith("/assignments")
                )
                if is_templates_path:
                    parts = rel_to_classrooms.split("/")
                    cid = parts[0] if parts else None
                    if not cid or not _is_instructor_for_classroom(
                        db, cid, str(user.id)
                    ):
                        raise HTTPException(
                            status_code=403,
                            detail="Assignments folder is read-only for participants",
                        )

                # Check participant scope for non-assignment paths
                err = _check_participant_scope(dest_path, str(user.id), db)
                if err:
                    raise HTTPException(status_code=403, detail=err)

                # Track writes to assignments/{template_name}/
                parts = rel_to_classrooms.split("/")
                if len(parts) >= 3 and parts[1] == "assignments":
                    classroom_templates_written.add((parts[0], parts[2]))
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

    # Push to student workspaces if files landed in assignments (teacher drag-drop)
    await _push_classroom_templates_to_participants(classroom_templates_written, db)

    # Push to student workspaces for lesson imports (classroom_id + move-into provided)
    move_into_str = str(move_into) if move_into else ""
    if classroom_id and move_into_str:
        src = os.path.join(CLASSROOMS_ROOT, str(classroom_id), "assignments", move_into_str)
        await _push_template_to_participants(str(classroom_id), move_into_str, src, db)

    await notify_files_changed(str(user.id))
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
    # Take ownership before writing — the file may be owned by the container user
    # (999:995) and www-data won't have write permission without GID 995.
    # CAP_CHOWN lets us change ownership regardless of current owner.
    try:
        os.chown(abs_path, os.getuid(), os.getgid())
    except OSError:
        pass
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

    # Protect the top-level README.md (auto-generated, not deletable)
    if abs_path == os.path.join(upload_dir, "README.md"):
        raise HTTPException(status_code=403, detail="The README cannot be deleted")

    err = _check_templates_write_access(abs_path, file_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    err = _check_participant_remove_path(abs_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

    if not os.path.exists(abs_path) and not os.path.islink(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.islink(abs_path):
        # Don't recurse into a symlink's target when deleting.
        os.unlink(abs_path)
    elif os.path.isdir(abs_path):
        shutil.rmtree(abs_path)
    else:
        os.remove(abs_path)
    await notify_files_changed(str(user.id))
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

    err = _check_participant_scope(abs_path, user.id, db)
    if err:
        raise HTTPException(status_code=403, detail=err)

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

    await notify_files_changed(str(user.id))
    return PlainTextResponse("File created successfully")
