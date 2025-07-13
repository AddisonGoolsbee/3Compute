from flask import Blueprint, request
from flask_login import current_user
import os
import subprocess

upload_bp = Blueprint("upload", __name__)


@upload_bp.post("/upload")
def upload():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400
    for f in files:
        f.save(os.path.join(upload_dir, f.filename))

    return "File uploaded successfully", 200


@upload_bp.post("/upload-folder")
def upload_folder():
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    os.makedirs(upload_dir, exist_ok=True)

    files = request.files.getlist("files")
    if not files:
        return "No files provided", 400

    for f in files:
        safe_path = os.path.normpath(os.path.join(upload_dir, f.filename))
        if not safe_path.startswith(upload_dir):
            continue  # prevent directory traversal
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        f.save(safe_path)

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


@upload_bp.get("/list-files")
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

@upload_bp.route("/file/<path:filename>", methods=["GET", "PUT", "DELETE"])
def handle_file(filename):
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    file_path = os.path.join(upload_dir, filename)

    if not os.path.exists(file_path):
        return "File not found", 404

    if request.method == "GET":
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
        return "File updated successfully", 200

    elif request.method == "DELETE":
        if os.path.isdir(file_path):
            import shutil
            shutil.rmtree(file_path)
        else:
            os.remove(file_path)
        return "File deleted successfully", 200