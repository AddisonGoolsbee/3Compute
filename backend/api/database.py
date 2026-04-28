import logging
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Field, create_engine, Session

logger = logging.getLogger("database")


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


class AllowlistEntry(SQLModel, table=True):
    """A pattern that grants a specific role to matching emails. Patterns
    support exact match (`teacher@school.edu`) or fnmatch globs
    (`*@school.edu`). Empty table means only admins can sign in."""
    __tablename__ = "allowlist_entry"
    id: Optional[int] = Field(default=None, primary_key=True)
    pattern: str = Field(index=True)
    role: str  # "teacher" or "student"
    notes: Optional[str] = None
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AccessRequest(SQLModel, table=True):
    """A teacher's submission asking to be added to the allowlist."""
    __tablename__ = "access_request"
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    school_name: str
    school_email: str = Field(index=True)
    # How they want their students to get access:
    # "domain" — allow anyone matching @<domain> derived from school_email
    # "list"   — explicit list of student emails (in student_emails_text)
    # "code"   — admin should generate a signup code for them
    # "none"   — students already have access (e.g. district-managed); only
    #            enable the teacher account
    student_access_method: str
    student_emails_text: Optional[str] = None
    is_non_google: bool = Field(default=False)
    # Optional info-gathering fields. Free text; rendered verbatim in admin UI.
    student_count_estimate: Optional[str] = None
    grade_levels: Optional[str] = None  # comma-separated
    referral_source: Optional[str] = None
    status: str = Field(default="pending", index=True)  # pending|approved|rejected
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by_id: Optional[str] = Field(default=None, foreign_key="user.id")
    admin_notes: Optional[str] = None
    # The signup code that was generated when approving (if method=code).
    # Surfaced in the admin UI so the admin can copy it back to the teacher
    # until SMTP is wired up.
    generated_code: Optional[str] = None


class SignupCode(SQLModel, table=True):
    """A shareable code that grants a role on redemption. Cryptographically
    random; honored only while not expired and under max_uses."""
    __tablename__ = "signup_code"
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    role: str  # "teacher" or "student"
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    times_used: int = Field(default=0)
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None


def get_engine(database_url: str = "sqlite:///backend/csroom.db"):
    return create_engine(database_url, echo=False)


def create_db_and_tables(engine):
    SQLModel.metadata.create_all(engine)
    add_missing_columns(engine)


def add_missing_columns(engine) -> None:
    """Idempotent forward-only migration: for every existing table, ALTER TABLE
    ADD COLUMN any nullable column that the model declares but the table is
    missing. SQLModel's ``create_all`` only creates tables in full and never
    alters them, so adding a new field to a model otherwise silently breaks
    INSERTs against pre-existing prod databases (sqlite raises
    ``no such column``). Skips primary-key and non-nullable columns to stay
    safe — those need a deliberate manual migration.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    for table_name, table in SQLModel.metadata.tables.items():
        if table_name not in existing_tables:
            continue  # create_all just made it; nothing to add
        existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
        for column in table.columns:
            if column.name in existing_cols:
                continue
            if column.primary_key:
                logger.warning(
                    "Cannot auto-add primary-key column %s.%s; manual migration required",
                    table_name, column.name,
                )
                continue
            # Try to derive a SQL DEFAULT from the model so existing rows get
            # a sensible value. Required when the column is NOT NULL.
            default_clause = ""
            default = column.default.arg if column.default is not None else None
            if default is not None and not callable(default):
                if isinstance(default, bool):
                    default_clause = f" DEFAULT {1 if default else 0}"
                elif isinstance(default, (int, float)):
                    default_clause = f" DEFAULT {default}"
                elif isinstance(default, str):
                    safe = default.replace("'", "''")
                    default_clause = f" DEFAULT '{safe}'"
            if not column.nullable and not default_clause:
                logger.warning(
                    "Cannot auto-add NOT NULL column %s.%s without a default; "
                    "manual migration required",
                    table_name, column.name,
                )
                continue
            col_type = column.type.compile(dialect=engine.dialect)
            null_clause = "" if column.nullable else " NOT NULL"
            with engine.begin() as conn:
                conn.execute(text(
                    f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" '
                    f'{col_type}{null_clause}{default_clause}'
                ))
            logger.info("Added column %s.%s (%s)", table_name, column.name, col_type)


def get_session(engine):
    with Session(engine) as session:
        yield session
