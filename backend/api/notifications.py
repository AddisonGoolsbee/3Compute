"""Outbound notifications to admins. Currently posts to a Discord webhook
when DISCORD_WEBHOOK_URL is set; otherwise just logs. Failures never raise
— a notification dropping should not block the user-facing request."""
import logging

import httpx

from .config import Settings

logger = logging.getLogger("notifications")


async def notify_admins(title: str, body: str) -> None:
    settings = Settings()
    url = settings.discord_webhook_url
    if not url:
        logger.info("notify_admins (no webhook configured): %s — %s", title, body)
        return

    # Discord caps message content at 2000 chars; keep headroom for the title.
    truncated = body if len(body) <= 1800 else body[:1800] + "…"
    payload = {"content": f"**{title}**\n{truncated}"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
    except Exception as e:
        logger.error("Discord webhook delivery failed: %s", e)
