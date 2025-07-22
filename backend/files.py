from flask import Blueprint, request
from flask_login import current_user
import os
import subprocess
import stat

files_bp = Blueprint("upload", __name__)

# The UID/GID that the container user runs as
CONTAINER_USER_UID = 1000
CONTAINER_USER_GID = 1000

def set_container_ownership(path):
    """Set ownership of a file/directory to match the container user"""
    try:
        os.chown(path, CONTAINER_USER_UID, CONTAINER_USER_GID)
        # Also ensure proper permissions
        if os.path.isdir(path):
            os.chmod(path, 0o755)  # drwxr-xr-x for directories
        else:
            os.chmod(path, 0o644)  # -rw-r--r-- for files
    except OSError as e:
        # Log the error but don't fail - this might happen in dev environments
        import logging
        logger = logging.getLogger("files")
        logger.warning(f"Failed to set ownership for {path}: {e}")

@files_bp.post("/upload")
def upload():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400
    for f in files:
        file_path = os.path.join(upload_dir, f.filename)
        f.save(file_path)
        set_container_ownership(file_path)

    return "File uploaded successfully", 200


@files_bp.post("/upload-folder")
def upload_folder():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)
    set_container_ownership(upload_dir)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400

    for f in files:
        safe_path = os.path.normpath(os.path.join(upload_dir, f.filename))
        if not safe_path.startswith(upload_dir):
            continue  # prevent directory traversal
        dir_path = os.path.dirname(safe_path)
        os.makedirs(dir_path, exist_ok=True)
        set_container_ownership(dir_path)
        f.save(safe_path)
        set_container_ownership(safe_path)

    # Check if move-into parameter is provided
    move_into = request.form.get("move-into")
    if move_into:
        # Execute an Enter before the cd command in the user's container using tmux send-keys
        container_name = f"user-container-{user_id}"
        try:
            # First, send an Enter key
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_name,
                    "tmux",
                    "send-keys",
                    "-t",
                    "3compute",
                    "Enter",
                ],
                check=True,
            )
            # Then, send the cd command
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container_name,
                    "tmux",
                    "send-keys",
                    "-t",
                    "3compute",
                    f"cd /app/{move_into}",
                    "Enter",
                ],
                check=True,
            )
        except subprocess.CalledProcessError as e:
            # If the directory doesn't exist or cd fails, continue without error
            pass

    return "Folder uploaded successfully", 200


@files_bp.get("/list-files")
def list_files():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"

    if not os.path.exists(upload_dir):
        return {"files": []}, 200

    file_tree = []

    for root, dirs, files in os.walk(upload_dir):
        for name in files:
            full_path = os.path.join(root, name)
            relative_path = os.path.relpath(full_path, upload_dir)
            file_tree.append(relative_path)

    return {"files": file_tree}, 200

@files_bp.route("/file/<path:filename>", methods=["GET", "PUT", "DELETE", "POST"])
def handle_file(filename):
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    file_path = os.path.join(upload_dir, filename)

    if request.method == "POST":
        # Create a new directory or file
        if filename.endswith('/'):
            # It's a directory
            os.makedirs(file_path, exist_ok=True)
            set_container_ownership(file_path)
            return "Directory created successfully", 200
        else:
            # It's a file - check if the directory exists, if not, create it
            dir_path = os.path.dirname(file_path)
            if dir_path and dir_path != upload_dir:
                os.makedirs(dir_path, exist_ok=True)
                set_container_ownership(dir_path)
            # create an empty file if it doesn't exist
            if os.path.exists(file_path):
                return "File already exists", 400
            with open(file_path, "w") as f:
                f.write("")
            set_container_ownership(file_path)
            return "File created successfully", 200

    elif not os.path.exists(file_path):
        return "File not found", 404

    elif request.method == "GET":
        image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']
        file_ext = filename.split('.')[-1].lower() if '.' in filename else ''
        
        if file_ext in image_extensions:
            from flask import send_file
            return send_file(file_path)
        else:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                return content, 200
            except UnicodeDecodeError:
                from flask import send_file
                return send_file(file_path)

    elif request.method == "PUT":
        content = request.data.decode("utf-8")
        with open(file_path, "w") as f:
            f.write(content)
        set_container_ownership(file_path)
        return "File updated successfully", 200

    elif request.method == "DELETE":
        if os.path.isdir(file_path):
            import shutil
            shutil.rmtree(file_path)
        else:
            os.remove(file_path)
        return "File deleted successfully", 200