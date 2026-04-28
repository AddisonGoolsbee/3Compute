"""Cloudflare Turnstile token verification.

Frontend renders a Turnstile widget which produces a one-time token; the
backend POSTs that token (plus the site secret) to Cloudflare's siteverify
endpoint. https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
"""
import logging

import httpx

from .config import Settings

logger = logging.getLogger("turnstile")

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_token(token: str, remote_ip: str | None = None) -> bool:
    if not token:
        return False
    settings = Settings()
    data = {"secret": settings.turnstile_secret_key, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(SITEVERIFY_URL, data=data)
            r.raise_for_status()
            payload = r.json()
    except Exception as e:
        logger.error("Turnstile verify failed: %s", e)
        return False
    if not payload.get("success"):
        logger.warning("Turnstile token rejected: %s", payload.get("error-codes"))
    return bool(payload.get("success"))
