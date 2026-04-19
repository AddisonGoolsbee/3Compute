import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..config import Settings
from ..database import PortSubdomain, User
from ..dependencies import get_current_user, get_db
from ..subdomain_caddy import RESERVED, add_subdomain, is_valid_subdomain, remove_subdomain

logger = logging.getLogger("subdomains")
router = APIRouter()
_settings = Settings()


class ClaimRequest(BaseModel):
    subdomain: str
    port: int


@router.get("/")
async def list_subdomains(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.exec(
        select(PortSubdomain).where(PortSubdomain.user_id == user.id)
    ).all()
    return [{"subdomain": r.subdomain, "port": r.port} for r in rows]


@router.get("/check/{subdomain}")
async def check_subdomain(subdomain: str, db: Session = Depends(get_db)):
    subdomain = subdomain.lower().strip()
    if not is_valid_subdomain(subdomain):
        return {"available": False, "reason": "Invalid format"}
    if subdomain in RESERVED:
        return {"available": False, "reason": "Reserved name"}
    existing = db.exec(
        select(PortSubdomain).where(PortSubdomain.subdomain == subdomain)
    ).first()
    return {"available": existing is None}


@router.post("/")
async def claim_subdomain(
    body: ClaimRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subdomain = body.subdomain.lower().strip()
    port = body.port

    if not is_valid_subdomain(subdomain):
        raise HTTPException(
            400,
            "Invalid subdomain. Use 3–32 lowercase letters, numbers, or hyphens. "
            "Cannot start or end with a hyphen.",
        )
    if subdomain in RESERVED:
        raise HTTPException(400, "That subdomain name is reserved.")
    if not (user.port_start <= port <= user.port_end):
        raise HTTPException(403, "Port is not in your assigned range.")

    existing_sub = db.exec(
        select(PortSubdomain).where(PortSubdomain.subdomain == subdomain)
    ).first()
    if existing_sub:
        raise HTTPException(409, "Subdomain is already taken.")

    # One subdomain per port — same user can replace their own
    existing_port = db.exec(
        select(PortSubdomain).where(PortSubdomain.port == port)
    ).first()
    if existing_port:
        if existing_port.user_id != user.id:
            raise HTTPException(409, "That port already has a subdomain assigned.")
        if _settings.is_production:
            try:
                remove_subdomain(existing_port.subdomain)
            except Exception as e:
                logger.warning("Failed to remove old Caddy route for %s: %s", existing_port.subdomain, e)
        db.delete(existing_port)
        db.commit()

    record = PortSubdomain(subdomain=subdomain, port=port, user_id=user.id)
    db.add(record)
    db.commit()

    if _settings.is_production:
        try:
            add_subdomain(subdomain, port)
        except Exception as e:
            logger.error("Failed to add Caddy route for %s: %s", subdomain, e)
            db.delete(record)
            db.commit()
            raise HTTPException(500, "Failed to configure subdomain routing. Check server logs.")

    url = f"https://{subdomain}.{_settings.app_domain}" if _settings.is_production else f"http://localhost:{port}"
    return {"subdomain": subdomain, "port": port, "url": url}


@router.delete("/{subdomain}")
async def release_subdomain(
    subdomain: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.exec(
        select(PortSubdomain).where(PortSubdomain.subdomain == subdomain)
    ).first()
    if not record:
        raise HTTPException(404, "Subdomain not found.")
    if record.user_id != user.id:
        raise HTTPException(403, "That subdomain belongs to a different user.")

    if _settings.is_production:
        try:
            remove_subdomain(subdomain)
        except Exception as e:
            logger.error("Failed to remove Caddy route for %s: %s", subdomain, e)
            raise HTTPException(500, "Failed to remove subdomain routing.")

    db.delete(record)
    db.commit()
    return {"ok": True}
