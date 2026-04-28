from fastapi import Depends, HTTPException, Request
from sqlmodel import Session

from .database import User


# Role values the backend trusts. Anything else (including None) is treated as
# "not onboarded" and must not be granted workspace, classroom, or teacher
# privileges — every privileged route must verify against the live DB row,
# never against a value supplied by the client.
VALID_ROLES = ("teacher", "student")


def get_db(request: Request):
    engine = request.app.state.engine
    with Session(engine) as session:
        yield session


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(
    request: Request, db: Session = Depends(get_db)
) -> User | None:
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    return db.get(User, user_id)


def get_onboarded_user(user: User = Depends(get_current_user)) -> User:
    """Authenticated *and* finished onboarding (role is teacher or student).

    Without this, a signed-in account whose role is still NULL could call
    workspace/classroom routes by virtue of session alone — the frontend's
    onboarding gate is not a security boundary.
    """
    if user.role not in VALID_ROLES:
        raise HTTPException(status_code=403, detail="Account onboarding required")
    return user


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teachers only")
    return user


def require_student(user: User = Depends(get_current_user)) -> User:
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")
    return user
