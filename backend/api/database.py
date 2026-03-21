from datetime import datetime
from typing import Optional
import uuid

from sqlmodel import SQLModel, Field, create_engine, Session


class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    port_start: int
    port_end: int
    first_login: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)


class Classroom(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    access_code: str = Field(unique=True, index=True)
    created_by: str = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ClassroomMember(SQLModel, table=True):
    __tablename__ = "classroom_member"
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: str = Field(foreign_key="classroom.id", index=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    role: str
    archived: bool = False
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Template(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_builtin: bool = False
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    classroom_id: Optional[str] = Field(default=None, foreign_key="classroom.id")
    path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


def get_engine(database_url: str = "sqlite:///backend/3compute.db"):
    return create_engine(database_url, echo=False)


def create_db_and_tables(engine):
    SQLModel.metadata.create_all(engine)


def get_session(engine):
    with Session(engine) as session:
        yield session
