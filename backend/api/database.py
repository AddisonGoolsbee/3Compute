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
    joins_paused: bool = Field(default=False)
    grading_mode: str = Field(default="equal")  # "equal", "weighted", "manual"


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


class AssignmentWeight(SQLModel, table=True):
    __tablename__ = "assignment_weight"
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: str = Field(foreign_key="classroom.id", index=True)
    template_name: str
    weight: float = Field(default=1.0)


class TestResult(SQLModel, table=True):
    __tablename__ = "test_result"
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: str = Field(foreign_key="classroom.id", index=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    template_name: str
    tests_passed: int = Field(default=0)
    tests_total: int = Field(default=0)
    last_run: datetime = Field(default_factory=datetime.utcnow)


class ManualScore(SQLModel, table=True):
    __tablename__ = "manual_score"
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: str = Field(foreign_key="classroom.id", index=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    template_name: str
    score: float = Field(default=0)


class PortSubdomain(SQLModel, table=True):
    __tablename__ = "port_subdomain"
    id: Optional[int] = Field(default=None, primary_key=True)
    subdomain: str = Field(unique=True, index=True)
    port: int = Field(unique=True, index=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


def get_engine(database_url: str = "sqlite:///backend/3compute.db"):
    return create_engine(database_url, echo=False)


def create_db_and_tables(engine):
    SQLModel.metadata.create_all(engine)


def get_session(engine):
    with Session(engine) as session:
        yield session
