"""Public form a teacher fills out to request access, plus admin endpoints
to review submissions and convert them into allowlist entries / signup codes.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..database import AccessRequest, AllowlistEntry, SignupCode, User
from ..dependencies import get_db
from ..notifications import notify_admins
from ..turnstile import verify_token
from .admin import require_birdflop_admin
from .signup_codes import generate_code

logger = logging.getLogger("access_requests")
router = APIRouter()


# Acceptable values for AccessRequest.student_access_method
STUDENT_METHODS = {"domain", "list", "code", "none"}


class SubmitRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    school_name: str = Field(min_length=1, max_length=200)
    school_email: str = Field(min_length=3, max_length=200)
    student_access_method: str
    student_emails_text: Optional[str] = None
    is_non_google: bool = False
    student_count_estimate: Optional[str] = None
    grade_levels: Optional[str] = None
    referral_source: Optional[str] = None
    # Optional so dev-mode submissions (no captcha widget) can send null.
    # Production rejects empty/missing tokens inside verify_token().
    turnstile_token: Optional[str] = None


@router.post("")
async def submit_access_request(
    body: SubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    if body.student_access_method not in STUDENT_METHODS:
        raise HTTPException(status_code=400, detail="Invalid student_access_method")
    if "@" not in body.school_email or "." not in body.school_email.split("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    # Cloudflare Turnstile honors the X-Forwarded-For header behind nginx;
    # fall back to the direct client IP if not present.
    remote_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else None
    )
    if not await verify_token(body.turnstile_token, remote_ip=remote_ip):
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed")

    entry = AccessRequest(
        full_name=body.full_name.strip(),
        school_name=body.school_name.strip(),
        school_email=str(body.school_email).lower(),
        student_access_method=body.student_access_method,
        student_emails_text=(body.student_emails_text or "").strip() or None,
        is_non_google=body.is_non_google,
        student_count_estimate=(body.student_count_estimate or "").strip() or None,
        grade_levels=(body.grade_levels or "").strip() or None,
        referral_source=(body.referral_source or "").strip() or None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Fire-and-forget — failure is logged inside notify_admins, never raised.
    domain = entry.school_email.split("@", 1)[-1] if "@" in entry.school_email else "?"
    extras = []
    if entry.grade_levels:
        extras.append(f"Grades: {entry.grade_levels}")
    if entry.student_count_estimate:
        extras.append(f"Class size: {entry.student_count_estimate}")
    if entry.referral_source:
        extras.append(f"Heard about us via: {entry.referral_source}")
    summary = (
        f"From: {entry.full_name} <{entry.school_email}>\n"
        f"School: {entry.school_name}\n"
        f"Student access: {entry.student_access_method}"
        + (" (non-Google)" if entry.is_non_google else "")
        + f"\nDomain: {domain}\n"
        + ("\n" + "\n".join(extras) + "\n" if extras else "")
        + f"Review: /admin/access-requests"
    )
    await notify_admins("New CS Room access request", summary)

    return {"ok": True, "id": entry.id}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


@router.get("")
async def list_access_requests(
    status: Optional[str] = None,
    _: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    stmt = select(AccessRequest).order_by(AccessRequest.submitted_at.desc())
    if status:
        stmt = stmt.where(AccessRequest.status == status)
    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "school_name": r.school_name,
            "school_email": r.school_email,
            "student_access_method": r.student_access_method,
            "student_emails_text": r.student_emails_text,
            "is_non_google": r.is_non_google,
            "student_count_estimate": r.student_count_estimate,
            "grade_levels": r.grade_levels,
            "referral_source": r.referral_source,
            "status": r.status,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "reviewed_by_id": r.reviewed_by_id,
            "admin_notes": r.admin_notes,
            "generated_code": r.generated_code,
        }
        for r in db.exec(stmt).all()
    ]


class ApproveBody(BaseModel):
    admin_notes: Optional[str] = None


@router.post("/{request_id}/approve")
async def approve_access_request(
    request_id: int,
    body: ApproveBody,
    admin: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    """Approve a request: add allowlist entry for the teacher, and depending
    on student_access_method either add a domain entry, add per-email entries,
    or generate a signup code surfaced back in the response."""
    req = db.get(AccessRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Already {req.status}")

    # Always allow the teacher who filled out the form.
    db.add(AllowlistEntry(
        pattern=req.school_email,
        role="teacher",
        notes=f"From access request #{req.id} ({req.full_name}, {req.school_name})",
        created_by=admin.id,
    ))

    if req.student_access_method == "domain":
        domain = req.school_email.split("@", 1)[-1] if "@" in req.school_email else None
        if domain:
            db.add(AllowlistEntry(
                pattern=f"*@{domain}",
                role="student",
                notes=f"From access request #{req.id} (domain rule)",
                created_by=admin.id,
            ))
    elif req.student_access_method == "list" and req.student_emails_text:
        # Split on commas and whitespace; keep anything that looks like an email.
        seen: set[str] = set()
        for raw in req.student_emails_text.replace(",", "\n").splitlines():
            email = raw.strip().lower()
            if "@" in email and email not in seen:
                seen.add(email)
                db.add(AllowlistEntry(
                    pattern=email,
                    role="student",
                    notes=f"From access request #{req.id}",
                    created_by=admin.id,
                ))
    elif req.student_access_method == "code":
        code = generate_code()
        db.add(SignupCode(
            code=code,
            role="student",
            notes=f"For {req.school_name} (access request #{req.id})",
            created_by=admin.id,
        ))
        req.generated_code = code

    req.status = "approved"
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by_id = admin.id
    if body.admin_notes is not None:
        req.admin_notes = body.admin_notes
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"ok": True, "generated_code": req.generated_code}


@router.post("/{request_id}/reject")
async def reject_access_request(
    request_id: int,
    body: ApproveBody,
    admin: User = Depends(require_birdflop_admin),
    db: Session = Depends(get_db),
):
    req = db.get(AccessRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Already {req.status}")
    req.status = "rejected"
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by_id = admin.id
    if body.admin_notes is not None:
        req.admin_notes = body.admin_notes
    db.add(req)
    db.commit()
    return {"ok": True}
