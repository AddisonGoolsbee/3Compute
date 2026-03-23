import logging
import os
from contextlib import asynccontextmanager

import socketio as socketio_lib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .config import Settings
from .database import get_engine, create_db_and_tables
from .routers import auth, users, files, classrooms, templates, webhook, tabs, subdomains, lessons

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("engineio").setLevel(logging.WARNING)
logging.getLogger("socketio").setLevel(logging.INFO)

logger = logging.getLogger("3compute")

settings = Settings()
logger.info(
    "Loaded settings: client_id=%s..., redirect_uri=%s, frontend=%s",
    settings.google_client_id[:20],
    settings.redirect_uri,
    settings.frontend_origin,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = get_engine(settings.database_url)
    create_db_and_tables(engine)
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

    from .terminal import discover_existing_containers, start_pollers_for_orphaned

    discover_existing_containers()
    start_pollers_for_orphaned()

    from .subdomain_caddy import ensure_app_server
    ensure_app_server()

    logger.info("3Compute API started")
    yield
    logger.info("Shutting down")


def create_app():
    app = FastAPI(title="3Compute API", lifespan=lifespan)

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

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(files.router, prefix="/api/files", tags=["files"])
    app.include_router(classrooms.router, prefix="/api/classrooms", tags=["classrooms"])
    app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
    app.include_router(webhook.router, prefix="/api", tags=["webhook"])
    app.include_router(tabs.router, prefix="/api/tabs", tags=["tabs"])
    app.include_router(subdomains.router, prefix="/api/subdomains", tags=["subdomains"])
    app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])

    from .routers.terminal import router as terminal_router

    app.include_router(terminal_router, prefix="/api/terminal", tags=["terminal"])

    from .terminal import sio

    combined = socketio_lib.ASGIApp(sio, other_asgi_app=app)
    return combined
