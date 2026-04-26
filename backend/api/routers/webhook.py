import hashlib
import hmac
import logging
import os
import subprocess

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("webhook")
router = APIRouter()

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "").encode()


@router.post("/github-webhook")
async def github_webhook(request: Request):
    signature = request.headers.get("X-Hub-Signature-256")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    try:
        sha_name, sig_hash = signature.split("=")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature format")

    body = await request.body()
    mac = hmac.new(WEBHOOK_SECRET, msg=body, digestmod=hashlib.sha256)

    if not hmac.compare_digest(mac.hexdigest(), sig_hash):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid payload")

    if payload.get("action") != "completed":
        return {"message": "Skipped non-complete action"}
    if payload.get("workflow_run", {}).get("conclusion") != "success":
        return {"message": "Skipped unsuccessful run"}
    if payload.get("workflow_run", {}).get("head_branch") != "main":
        return {"message": "Skipped non-main branch"}

    # Run from /opt/deploy.sh (outside the repo) so git reset --hard
    # doesn't overwrite the script mid-execution. The deploy script
    # copies the latest repo version to /opt/deploy.sh at the end of
    # each run so it stays current.
    script_path = "/opt/deploy.sh"
    subprocess.Popen(["sudo", script_path])
    logger.info("Deployment script triggered (%s)", script_path)
    return {"message": "Deployment triggered"}
