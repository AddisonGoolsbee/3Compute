"""End-to-end tests for the Google OAuth sign-in flow.

The real provider call is mocked at `backend.api.routers.auth.oauth.google`,
so these tests cover everything CS Room owns: the redirect to Google, the
callback's user-creation / last-login update, the session cookie round trip,
and the `/me` and `/logout` endpoints. They are designed to catch regressions
where sign-in "looks like it works" but lands the user back on the home page
without a session (e.g. callback raising and redirecting to '/' instead of
'/ide', or `/me` returning 401 after a successful login).
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from authlib.integrations.base_client.errors import MismatchingStateError, OAuthError
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select
from starlette.middleware.sessions import SessionMiddleware

from backend.api.database import User
from backend.api.routers import auth as auth_router_module


FRONTEND_ORIGIN = "http://test-frontend"
REDIRECT_URI = "http://test-backend/api/auth/callback"


def _make_settings():
    """Minimal settings shim — only the fields the auth router reads."""
    return SimpleNamespace(
        google_client_id="test-client-id",
        google_client_secret="test-client-secret",
        redirect_uri=REDIRECT_URI,
        frontend_origin=FRONTEND_ORIGIN,
        port_base=10000,
    )


@pytest.fixture
def engine():
    # StaticPool shares one connection across all requests so the in-memory
    # DB is visible to every dependency-injected session in the test app.
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(eng)
    return eng


@pytest.fixture
def app(engine):
    """Minimal FastAPI app: just SessionMiddleware + the auth router. No
    Docker, Caddy, or socket setup — those would slow tests and aren't part
    of the auth flow."""
    application = FastAPI()
    application.add_middleware(
        SessionMiddleware, secret_key="test-secret", max_age=3600
    )
    application.include_router(auth_router_module.router, prefix="/api/auth")
    application.state.engine = engine
    application.state.settings = _make_settings()
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_oauth_init_flag():
    """`setup_oauth` early-returns if already initialized; reset between tests
    so each one starts from a clean slate."""
    auth_router_module._oauth_initialized = False
    yield
    auth_router_module._oauth_initialized = False


@pytest.fixture
def mock_google():
    """Replace the OAuth client's `.google` attribute with an AsyncMock.

    `setup_oauth` sees `_oauth_initialized=True` and skips real registration,
    so we can swap in an arbitrary mock that returns whatever the test wants."""
    auth_router_module._oauth_initialized = True
    mock = SimpleNamespace(
        authorize_redirect=AsyncMock(),
        authorize_access_token=AsyncMock(),
    )
    with patch.object(auth_router_module.oauth, "google", mock, create=True):
        yield mock


def _userinfo(
    sub="google-uid-1",
    email="alice@example.com",
    name="Alice",
    picture="https://example.com/a.png",
    email_verified=True,
):
    return {
        "sub": sub,
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "picture": picture,
    }


# ---------- /login ----------


class TestLogin:
    def test_redirects_to_google(self, client, mock_google):
        # authlib's real authorize_redirect returns a 302 to accounts.google.com
        # plus state cookies; the redirect target itself is opaque to us, so
        # we just assert that we hand control off to authlib with our redirect
        # URI and that the response is a redirect.
        mock_google.authorize_redirect.return_value = RedirectResponse(
            url="https://accounts.google.com/o/oauth2/auth?fake=1",
            status_code=302,
        )
        resp = client.get("/api/auth/login", follow_redirects=False)
        assert resp.status_code in (302, 307)
        assert "accounts.google.com" in resp.headers["location"]
        # Ensure authlib was invoked with our configured redirect URI — if
        # this drifts, Google bounces the user back with redirect_uri_mismatch.
        assert REDIRECT_URI in mock_google.authorize_redirect.call_args.args

    def test_login_clears_existing_session(self, client, mock_google, engine):
        """A stale `user_id` from a previous login must not leak into the new
        OAuth state cookie — `request.session.clear()` runs before the redirect."""
        # First, plant a session by completing a login.
        with Session(engine) as db:
            db.add(User(
                id="old-uid", email="old@example.com", name="Old",
                port_start=10000, port_end=10009,
            ))
            db.commit()

        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo(sub="old-uid", email="old@example.com")
        }
        mock_google.authorize_redirect.return_value = RedirectResponse(
            url="https://accounts.google.com/x", status_code=302
        )
        client.get("/api/auth/callback")  # establishes session
        assert client.get("/api/auth/me").status_code == 200

        # Hitting /login again should clear it before the next OAuth dance.
        client.get("/api/auth/login", follow_redirects=False)
        # Session is cleared; without the mocked callback completing again,
        # /me should now be unauthenticated.
        assert client.get("/api/auth/me").status_code == 401


# ---------- /callback (happy path) ----------


class TestCallbackHappyPath:
    def test_new_user_creates_db_row_and_redirects_to_ide(
        self, client, mock_google, engine
    ):
        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo()
        }
        resp = client.get("/api/auth/callback", follow_redirects=False)

        assert resp.status_code in (302, 307)
        assert resp.headers["location"] == f"{FRONTEND_ORIGIN}/ide"

        with Session(engine) as db:
            row = db.get(User, "google-uid-1")
            assert row is not None
            assert row.email == "alice@example.com"
            assert row.name == "Alice"
            assert row.avatar_url == "https://example.com/a.png"
            # First user gets ports starting at port_base.
            assert row.port_start == 10000
            assert row.port_end == 10009
            # role left null → frontend should send through onboarding.
            assert row.role is None

    def test_existing_user_does_not_duplicate(self, client, mock_google, engine):
        with Session(engine) as db:
            db.add(User(
                id="google-uid-1", email="alice@example.com", name="Old Name",
                avatar_url="old.png", port_start=10000, port_end=10009,
                role="teacher",
            ))
            db.commit()

        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo(name="New Name", picture="new.png")
        }
        resp = client.get("/api/auth/callback", follow_redirects=False)
        assert resp.headers["location"] == f"{FRONTEND_ORIGIN}/ide"

        with Session(engine) as db:
            row = db.get(User, "google-uid-1")
            # Profile is refreshed, role is preserved, no second row.
            assert row.name == "New Name"
            assert row.avatar_url == "new.png"
            assert row.role == "teacher"
            assert len(db.exec(select(User)).all()) == 1

    def test_second_user_gets_next_port_block(self, client, mock_google, engine):
        with Session(engine) as db:
            db.add(User(
                id="first", email="first@example.com",
                port_start=10000, port_end=10009,
            ))
            db.commit()

        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo(sub="second", email="second@example.com")
        }
        # Patch the docker-port probe so it doesn't try to shell out.
        with patch.object(
            auth_router_module, "_max_container_port_end", return_value=None
        ):
            client.get("/api/auth/callback", follow_redirects=False)

        with Session(engine) as db:
            row = db.get(User, "second")
            assert row.port_start == 10010
            assert row.port_end == 10019

    def test_session_cookie_is_set_so_me_works(self, client, mock_google):
        """The whole point of sign-in: after callback, /me returns the user."""
        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo()
        }
        client.get("/api/auth/callback", follow_redirects=False)

        me = client.get("/api/auth/me")
        assert me.status_code == 200
        body = me.json()
        assert body["id"] == "google-uid-1"
        assert body["email"] == "alice@example.com"
        assert body["needs_onboarding"] is True
        assert body["is_admin"] is False

    def test_birdflop_email_marks_admin(self, client, mock_google):
        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo(sub="bf", email="someone@birdflop.com")
        }
        client.get("/api/auth/callback", follow_redirects=False)
        body = client.get("/api/auth/me").json()
        assert body["is_admin"] is True


# ---------- /callback (failure modes) ----------


class TestCallbackFailures:
    def test_oauth_error_redirects_to_login_retry(self, client, mock_google):
        """A failed token exchange (network blip, bad state cookie) should
        bounce back through /api/auth/login so the user gets a clean retry
        instead of being dumped on '/' with no feedback."""
        mock_google.authorize_access_token.side_effect = OAuthError("bad")
        resp = client.get("/api/auth/callback", follow_redirects=False)
        assert resp.status_code in (302, 307)
        assert resp.headers["location"] == f"{FRONTEND_ORIGIN}/api/auth/login"

    def test_mismatching_state_redirects_to_login_retry(self, client, mock_google):
        mock_google.authorize_access_token.side_effect = MismatchingStateError()
        resp = client.get("/api/auth/callback", follow_redirects=False)
        assert resp.headers["location"] == f"{FRONTEND_ORIGIN}/api/auth/login"

    def test_missing_userinfo_redirects_to_frontend_root(self, client, mock_google):
        mock_google.authorize_access_token.return_value = {}  # no userinfo key
        resp = client.get("/api/auth/callback", follow_redirects=False)
        assert resp.headers["location"] == FRONTEND_ORIGIN

    def test_unverified_email_blocks_signin(self, client, mock_google, engine):
        mock_google.authorize_access_token.return_value = {
            "userinfo": _userinfo(email_verified=False)
        }
        resp = client.get("/api/auth/callback", follow_redirects=False)
        assert resp.headers["location"] == (
            f"{FRONTEND_ORIGIN}/?error=email_not_verified"
        )
        # And no DB row was created for the unverified user.
        with Session(engine) as db:
            assert db.get(User, "google-uid-1") is None
        # And no session was set.
        assert client.get("/api/auth/me").status_code == 401


# ---------- /me + /logout ----------


class TestMeAndLogout:
    def test_me_returns_401_when_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_returns_401_when_session_user_no_longer_in_db(
        self, client, mock_google, engine
    ):
        """If the row was deleted out from under a live session, /me should
        say unauthenticated rather than 500."""
        mock_google.authorize_access_token.return_value = {"userinfo": _userinfo()}
        client.get("/api/auth/callback", follow_redirects=False)
        with Session(engine) as db:
            db.delete(db.get(User, "google-uid-1"))
            db.commit()
        assert client.get("/api/auth/me").status_code == 401

    def test_logout_clears_session(self, client, mock_google):
        mock_google.authorize_access_token.return_value = {"userinfo": _userinfo()}
        client.get("/api/auth/callback", follow_redirects=False)
        assert client.get("/api/auth/me").status_code == 200

        out = client.get("/api/auth/logout")
        assert out.status_code == 200
        assert out.json() == {"ok": True}
        assert client.get("/api/auth/me").status_code == 401
