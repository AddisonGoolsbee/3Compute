from flask import Blueprint, request
from flask_login import current_user
import os
import subprocess

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/upload", methods=["POST"])
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


@upload_bp.route("/upload-folder", methods=["POST"])
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


@upload_bp.route("/list-files", methods=["GET"])
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

@upload_bp.route("/file/<path:filename>", methods=["GET"])
def get_file(filename):
    if not current_user.is_authenticated:
        return "Unauthorized", 401

    user_id = current_user.id
    upload_dir = f"/tmp/uploads/{user_id}"
    file_path = os.path.join(upload_dir, filename)

    if not os.path.exists(file_path):
        return "File not found", 404

    with open(file_path, "r") as f:
        content = f.read()

    return content, 200
