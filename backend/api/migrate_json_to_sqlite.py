"""One-time migration from JSON files to SQLite."""
import json
import os
from datetime import datetime, timezone

from sqlmodel import Session

from .database import (
    User,
    Classroom,
    ClassroomMember,
    get_engine,
    create_db_and_tables,
)


def _parse_dt(s: str) -> datetime:
    """Parse an ISO datetime string, handling the trailing 'Z'."""
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def migrate():
    engine = get_engine()
    create_db_and_tables(engine)

    with Session(engine) as db:
        users_file = "backend/users.json"
        if os.path.exists(users_file):
            with open(users_file) as f:
                users_data = json.load(f)
            for user_id, data in users_data.items():
                existing = db.get(User, user_id)
                if existing:
                    continue
                user = User(
                    id=user_id,
                    email=data.get("email", ""),
                    port_start=data.get("port_start", 8000),
                    port_end=data.get("port_end", 8009),
                    first_login=(
                        _parse_dt(data["first_login"])
                        if "first_login" in data
                        else datetime.utcnow()
                    ),
                    last_login=(
                        _parse_dt(data["last_login"])
                        if "last_login" in data
                        else datetime.utcnow()
                    ),
                )
                db.add(user)
            db.commit()
            print(f"Migrated {len(users_data)} users")

        classrooms_file = "backend/classrooms.json"
        if os.path.exists(classrooms_file):
            with open(classrooms_file) as f:
                raw = json.load(f)
            if isinstance(raw, dict):
                classrooms_data = [
                    {**v, "id": k} if "id" not in v else v
                    for k, v in raw.items()
                ]
            else:
                classrooms_data = raw
            for classroom_data in classrooms_data:
                cid = classroom_data["id"]
                existing = db.get(Classroom, cid)
                if existing:
                    continue
                instructors = classroom_data.get("instructors", [])
                created_by = instructors[0] if instructors else ""
                classroom = Classroom(
                    id=cid,
                    name=classroom_data.get("name", ""),
                    access_code=classroom_data.get("access_code", ""),
                    created_by=created_by,
                    created_at=(
                        _parse_dt(classroom_data["created_at"])
                        if "created_at" in classroom_data
                        else datetime.utcnow()
                    ),
                )
                db.add(classroom)
                db.flush()

                for uid in instructors:
                    member = ClassroomMember(
                        classroom_id=cid,
                        user_id=uid,
                        role="instructor",
                        archived=uid in classroom_data.get("archived_by", []),
                    )
                    db.add(member)
                for uid in classroom_data.get("participants", []):
                    member = ClassroomMember(
                        classroom_id=cid,
                        user_id=uid,
                        role="participant",
                        archived=uid in classroom_data.get("archived_by", []),
                    )
                    db.add(member)
            db.commit()
            print(f"Migrated {len(classrooms_data)} classrooms")


if __name__ == "__main__":
    migrate()
