import logging
import os
from contextlib import asynccontextmanager

import socketio as socketio_lib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .config import Settings
from .database import get_engine, create_db_and_tables
from .routers import (
    access_requests,
    admin,
    allowlist,
    auth,
    classrooms,
    files,
    lessons,
    signup_codes,
    subdomains,
    tabs,
    templates,
    users,
    webhook,
)

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("engineio").setLevel(logging.WARNING)
logging.getLogger("socketio").setLevel(logging.INFO)

logger = logging.getLogger("csroom")

settings = Settings()
logger.info(
    "Loaded settings: client_id=%s..., redirect_uri=%s, frontend=%s",
    settings.google_client_id[:20],
    settings.redirect_uri,
    settings.frontend_origin,
)


def _run_migrations(engine):
    """Add missing columns to existing tables (SQLModel doesn't do this)."""
    import sqlalchemy

    migrations = [
        ("classroom", "joins_paused", "BOOLEAN NOT NULL DEFAULT 0"),
        ("classroom", "grading_mode", "TEXT NOT NULL DEFAULT 'equal'"),
    ]

    with engine.connect() as conn:
        for table, column, col_type in migrations:
            try:
                conn.execute(sqlalchemy.text(
                    f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"
                ))
                conn.commit()
                logger.info("Migration: added %s.%s", table, column)
            except sqlalchemy.exc.OperationalError:
                # Column already exists
                pass


def _migrate_uploads_classroom_symlinks(uploads_root: str) -> None:
    """Repoint any ``UPLOADS_ROOT/{uid}/{slug}`` symlink that uses the
    container-namespace absolute target (``/classrooms/...``) to the
    namespace-agnostic relative target (``../../classrooms/...``).

    Same pattern as the ``.templates`` migration: the old absolute form
    works inside the container (bind mount) but is a broken link on the
    host, which 500'd file uploads into classroom subdirs because
    ``os.makedirs`` followed the dangling target.
    """
    if not os.path.isdir(uploads_root):
        return
    for uid in os.listdir(uploads_root):
        user_dir = os.path.join(uploads_root, uid)
        if not os.path.isdir(user_dir):
            continue
        try:
            entries = os.listdir(user_dir)
        except OSError:
            continue
        for entry in entries:
            link = os.path.join(user_dir, entry)
            if not os.path.islink(link):
                continue
            try:
                current = os.readlink(link)
            except OSError:
                continue
            if not current.startswith("/classrooms/"):
                continue
            # "/classrooms/foo/bar" → "../../classrooms/foo/bar"
            new_target = "../.." + current
            try:
                os.unlink(link)
                os.symlink(new_target, link)
                logger.info(
                    "Repointed classroom symlink %s (was %r, now %r)",
                    link, current, new_target,
                )
            except OSError as e:
                logger.warning(
                    "Failed to repoint classroom symlink %s: %s", link, e,
                )


def _migrate_participant_templates_symlink(classrooms_root: str) -> None:
    """One-time migration: drop any stale `participants/*/assignments` symlinks
    so docker.py re-creates them as `.templates` on next container start.
    Idempotent and safe to run on a fresh install (no-op).

    Also repoints any `.templates` symlink that uses the container-namespace
    absolute target (``/classrooms/...``) to the namespace-agnostic relative
    target (``../../assignments``). The old absolute form resolves inside the
    container but is a broken link on the host, which made student
    view/download of `.templates/*` 404 on the backend side."""
    if not os.path.isdir(classrooms_root):
        return
    for cid in os.listdir(classrooms_root):
        participants = os.path.join(classrooms_root, cid, "participants")
        if not os.path.isdir(participants):
            continue
        for email in os.listdir(participants):
            participant_dir = os.path.join(participants, email)
            stale = os.path.join(participant_dir, "assignments")
            if os.path.islink(stale):
                try:
                    os.unlink(stale)
                    logger.info("Removed stale participant symlink %s", stale)
                except OSError as e:
                    logger.warning("Failed to remove stale symlink %s: %s", stale, e)

            templates_link = os.path.join(participant_dir, ".templates")
            if os.path.islink(templates_link):
                try:
                    current = os.readlink(templates_link)
                except OSError:
                    continue
                if current != "../../assignments":
                    try:
                        os.unlink(templates_link)
                        os.symlink("../../assignments", templates_link)
                        logger.info(
                            "Repointed .templates symlink %s (was %r)",
                            templates_link, current,
                        )
                    except OSError as e:
                        logger.warning(
                            "Failed to repoint .templates symlink %s: %s",
                            templates_link, e,
                        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Files the backend writes (drafts, uploads, lesson imports, test stage
    # files, participant copies) should be group-writable by default so the
    # container user (999:995) can also edit them via the terminal without
    # the backend having to chmod every single path afterwards.
    os.umask(0o002)

    engine = get_engine(settings.database_url)
    create_db_and_tables(engine)
    _run_migrations(engine)
    app.state.engine = engine
    app.state.settings = settings

    from backend.docker import (
        CONTAINER_USER_UID,
        CONTAINER_USER_GID,
        UPLOADS_ROOT,
        CLASSROOMS_ROOT,
        setup_isolated_network,
    )

    setup_isolated_network()

    for d in (UPLOADS_ROOT, CLASSROOMS_ROOT):
        try:
            os.makedirs(d, exist_ok=True)
        except PermissionError:
            logger.warning("Could not create %s: permission denied (CI environment?)", d)

    _migrate_participant_templates_symlink(CLASSROOMS_ROOT)
    _migrate_uploads_classroom_symlinks(UPLOADS_ROOT)

    from .terminal import discover_existing_containers, start_pollers_for_orphaned

    discover_existing_containers()
    start_pollers_for_orphaned()

    from .subdomain_caddy import ensure_app_server
    ensure_app_server()

    logger.info("CS Room API started")
    yield
    logger.info("Shutting down")


def create_app():
    app = FastAPI(title="CS Room API", lifespan=lifespan)

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.flask_secret,
        max_age=86400 * 30,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_origin,
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(classrooms.router, prefix="/api/classrooms", tags=["classrooms"])
    app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
    app.include_router(webhook.router, prefix="/api", tags=["webhook"])
    app.include_router(tabs.router, prefix="/api/tabs", tags=["tabs"])
    app.include_router(subdomains.router, prefix="/api/subdomains", tags=["subdomains"])
    app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
    app.include_router(access_requests.router, prefix="/api/access-requests", tags=["access-requests"])
    app.include_router(allowlist.router, prefix="/api/admin/allowlist", tags=["admin"])
    app.include_router(signup_codes.router, prefix="/api/admin/signup-codes", tags=["admin"])

    @app.get("/api/public-config")
    async def public_config():
        """Frontend-readable config (Turnstile site key etc.). No auth — these
        values are intended to be embedded in the SPA at runtime. In dev we
        return an empty site key so the SPA skips rendering the widget and
        the access-request form submits without a token."""
        site_key = "" if settings.flask_env == "development" else settings.turnstile_site_key
        return {"turnstile_site_key": site_key}

    from .routers.terminal import router as terminal_router

    app.include_router(terminal_router, prefix="/api/terminal", tags=["terminal"])

    from .terminal import sio

    combined = socketio_lib.ASGIApp(sio, other_asgi_app=app)
    return combined
