import os
import hmac
import hashlib
import subprocess
from flask import Blueprint, request, abort
import logging

logger = logging.getLogger("webhook")

webhook_bp = Blueprint("webhook", __name__)
WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "").encode()

@webhook_bp.route("/github-webhook", methods=["POST"])
def github_webhook():
    signature = request.headers.get("X-Hub-Signature-256")
    if not signature:
        logger.debug("Missing signature in request headers")
        abort(400, "Missing signature")

    try:
        sha_name, sig_hash = signature.split("=")
    except ValueError:
        logger.debug("Invalid signature format")
        abort(400, "Invalid signature format")

    mac = hmac.new(WEBHOOK_SECRET, msg=request.data, digestmod=hashlib.sha256)

    if not hmac.compare_digest(mac.hexdigest(), sig_hash):
        logger.debug("Invalid signature")
        abort(403, "Invalid signature")

    payload = request.json
    if not payload:
        logger.debug("Invalid payload: No JSON data")
        abort(400, "Invalid payload")

    if payload.get("action") != "completed":
        logger.debug(f"Skipped non-complete action: {payload.get('action')}")
        return "Skipped non-complete action", 204
    if payload.get("workflow_run", {}).get("conclusion") != "success":
        logger.debug(f"Skipped unsuccessful run: {payload.get('workflow_run', {}).get('conclusion')}")
        return "Skipped unsuccessful run", 204
    if payload.get("workflow_run", {}).get("head_branch") != "main":
        logger.debug(f"Skipped non-main branch: {payload.get('workflow_run', {}).get('head_branch')}")
        return "Skipped non-main branch", 204

    # Run deployment script asynchronously
    subprocess.Popen(["/opt/deploy.sh"])
    logger.info("Deployment script triggered")
    return "Deployment triggered", 200
