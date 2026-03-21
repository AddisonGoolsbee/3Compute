from fastapi import Depends, HTTPException, Request
from sqlmodel import Session

from .database import User


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
