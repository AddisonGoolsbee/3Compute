"""
Diagnostic tests for the FastAPI terminal Socket.IO connection.

Tests the critical path: cookie parsing, session decoding, handler registration,
and the full connect flow.

python-socketio's ASGI driver converts the raw ASGI scope into a WSGI-style
environ dict before passing it to handlers.  Headers become HTTP_<NAME> keys
(e.g. HTTP_COOKIE, HTTP_HOST).
"""

import base64
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from itsdangerous import TimestampSigner

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


FLASK_SECRET = "asdgjbvlasbdfuph9apibeofd"
TEST_USER_ID = "100011897023319124631"


def _make_signed_cookie(user_id: str, secret: str = FLASK_SECRET) -> str:
    """Create a session cookie the same way Starlette SessionMiddleware does."""
    payload = json.dumps({"user_id": user_id}).encode("utf-8")
    encoded = base64.b64encode(payload)
    signer = TimestampSigner(secret)
    signed = signer.sign(encoded)
    return signed.decode("utf-8")


def _make_wsgi_environ(cookie_value: str | None = None, tab_id: str = "1") -> dict:
    """Build a WSGI-style environ dict matching what python-socketio passes."""
    environ = {
        "REQUEST_METHOD": "GET",
        "PATH_INFO": "/socket.io/",
        "QUERY_STRING": f"tabId={tab_id}&EIO=4&transport=websocket",
        "HTTP_HOST": "127.0.0.1:5555",
        "HTTP_CONNECTION": "keep-alive",
        "SERVER_SOFTWARE": "asgi",
    }
    if cookie_value is not None:
        environ["HTTP_COOKIE"] = f"session={cookie_value}"
    return environ


class TestCookieSigning:
    """Verify cookie creation matches what SessionMiddleware produces."""

    def test_create_and_unsign_cookie(self):
        cookie_val = _make_signed_cookie(TEST_USER_ID)
        signer = TimestampSigner(FLASK_SECRET)
        raw = signer.unsign(cookie_val.encode(), max_age=86400 * 30)
        data = json.loads(base64.b64decode(raw))
        assert data["user_id"] == TEST_USER_ID

    def test_wrong_secret_fails(self):
        cookie_val = _make_signed_cookie(TEST_USER_ID, secret="wrong-secret")
        signer = TimestampSigner(FLASK_SECRET)
        with pytest.raises(Exception):
            signer.unsign(cookie_val.encode(), max_age=86400 * 30)


class TestGetUserIdFromEnviron:
    """Test _get_user_id_from_environ with WSGI-style environ."""

    @patch("backend.api.terminal._settings")
    def test_valid_cookie(self, mock_settings):
        mock_settings.flask_secret = FLASK_SECRET

        from backend.api.terminal import _get_user_id_from_environ

        cookie_val = _make_signed_cookie(TEST_USER_ID)
        environ = _make_wsgi_environ(cookie_val)

        result = _get_user_id_from_environ(environ)
        assert result == TEST_USER_ID, f"Expected {TEST_USER_ID}, got {result}"

    @patch("backend.api.terminal._settings")
    def test_no_cookie_header(self, mock_settings):
        mock_settings.flask_secret = FLASK_SECRET

        from backend.api.terminal import _get_user_id_from_environ

        environ = _make_wsgi_environ(cookie_value=None)
        result = _get_user_id_from_environ(environ)
        assert result is None

    @patch("backend.api.terminal._settings")
    def test_no_session_cookie(self, mock_settings):
        mock_settings.flask_secret = FLASK_SECRET

        from backend.api.terminal import _get_user_id_from_environ

        environ = {"HTTP_COOKIE": "other_cookie=abc123", "QUERY_STRING": ""}
        result = _get_user_id_from_environ(environ)
        assert result is None

    @patch("backend.api.terminal._settings")
    def test_wrong_secret(self, mock_settings):
        mock_settings.flask_secret = "wrong-secret"

        from backend.api.terminal import _get_user_id_from_environ

        cookie_val = _make_signed_cookie(TEST_USER_ID, secret=FLASK_SECRET)
        environ = _make_wsgi_environ(cookie_val)
        result = _get_user_id_from_environ(environ)
        assert result is None


class TestHandlerRegistration:
    """Verify Socket.IO handlers are actually registered on the sio instance."""

    def test_handlers_registered(self):
        from backend.api.terminal import sio

        handlers = getattr(sio, "handlers", {})
        default_ns = handlers.get("/", {})
        registered_events = list(default_ns.keys())

        assert "connect" in default_ns, (
            f"'connect' handler not registered. Registered: {registered_events}"
        )
        assert "disconnect" in default_ns, (
            f"'disconnect' handler not registered. Registered: {registered_events}"
        )
        assert "pty-input" in default_ns, (
            f"'pty-input' handler not registered. Registered: {registered_events}"
        )
        assert "resize" in default_ns, (
            f"'resize' handler not registered. Registered: {registered_events}"
        )


class TestSioConfig:
    """Verify the Socket.IO server configuration."""

    def test_cors_allows_frontend(self):
        from backend.api.terminal import sio

        eio = sio.eio
        cors = getattr(eio, "cors_allowed_origins", None)
        if cors is not None:
            assert "http://127.0.0.1:5173" in cors or cors == "*", (
                f"Frontend origin not in CORS list: {cors}"
            )

    def test_async_mode(self):
        from backend.api.terminal import sio
        assert sio.async_mode == "asgi"


class TestQueryParamExtraction:
    """Test _get_query_param with WSGI-style environ."""

    def test_extract_tab_id(self):
        from backend.api.terminal import _get_query_param

        environ = {"QUERY_STRING": "tabId=3&EIO=4&transport=websocket"}
        result = _get_query_param(environ, "tabId", "1")
        assert result == "3"

    def test_default_value(self):
        from backend.api.terminal import _get_query_param

        environ = {"QUERY_STRING": "EIO=4&transport=websocket"}
        result = _get_query_param(environ, "tabId", "1")
        assert result == "1"


class TestFullConnectFlow:
    """Integration-style test of the connect handler."""

    @pytest.mark.asyncio
    @patch("backend.api.terminal._attach_container")
    @patch("backend.api.terminal._ensure_container")
    @patch("backend.api.terminal._get_user")
    @patch("backend.api.terminal._settings")
    async def test_connect_with_valid_cookie(
        self, mock_settings, mock_get_user, mock_ensure, mock_attach
    ):
        mock_settings.flask_secret = FLASK_SECRET

        mock_user = MagicMock()
        mock_user.port_start = 10000
        mock_user.port_end = 10009
        mock_user.email = "test@test.com"
        mock_get_user.return_value = mock_user

        mock_ensure.return_value = f"user-container-{TEST_USER_ID}"
        mock_attach.return_value = True

        from backend.api.terminal import handle_connect, session_map, sio

        session_map.clear()

        with patch.object(sio, "start_background_task"):
            cookie_val = _make_signed_cookie(TEST_USER_ID)
            environ = _make_wsgi_environ(cookie_val)

            result = await handle_connect("test-sid-123", environ)

            assert result is not False, (
                "handle_connect returned False — connection was rejected"
            )
            assert "test-sid-123" in session_map, (
                f"Session not created. session_map keys: {list(session_map.keys())}"
            )
            assert session_map["test-sid-123"]["user_id"] == TEST_USER_ID

        session_map.clear()

    @pytest.mark.asyncio
    @patch("backend.api.terminal.Settings")
    async def test_connect_without_cookie_rejected(self, mock_settings_cls):
        mock_settings_cls.return_value.flask_secret = FLASK_SECRET
        mock_settings_cls.return_value.database_url = "sqlite://"
        mock_settings_cls.return_value.frontend_origin = "http://127.0.0.1:5173"

        from backend.api.terminal import handle_connect, session_map

        session_map.clear()

        environ = _make_wsgi_environ(cookie_value=None)
        result = await handle_connect("test-sid-no-cookie", environ)

        assert result is False, "Should reject connection without cookie"
        assert "test-sid-no-cookie" not in session_map

        session_map.clear()


class TestReadLoopTiming:
    """Verify the PTY read loop doesn't start before the first resize.

    Bug: handle_connect eagerly attaches the PTY and immediately starts
    read_and_forward_pty_output.  The PTY defaults to 80x24, but the real
    terminal dimensions only arrive with the first 'resize' event.  Between
    connect and resize, tmux renders a prompt at 80x24.  When resize arrives
    (e.g. 165x13), tmux redraws — but the old 80x24 prompt is already in the
    scrollback.  Each page reload adds another stale prompt, which the user
    sees as repeated prompts with blank lines when scrolling up.

    The fix: read_and_forward_pty_output should only start after the first
    resize event sets the correct dimensions.
    """

    @pytest.mark.asyncio
    @patch("backend.api.terminal._attach_container", return_value=True)
    @patch("backend.api.terminal._ensure_container")
    @patch("backend.api.terminal._get_user")
    @patch("backend.api.terminal._settings")
    async def test_read_loop_should_not_start_before_resize(
        self, mock_settings, mock_get_user, mock_ensure, mock_attach
    ):
        """The read loop must NOT start in handle_connect (before resize).

        This test FAILS on the current code — proving the bug exists.
        When the fix is applied, it will pass.
        """
        mock_settings.flask_secret = FLASK_SECRET

        mock_user = MagicMock()
        mock_user.port_start = 10000
        mock_user.port_end = 10009
        mock_user.email = "test@test.com"
        mock_get_user.return_value = mock_user

        mock_ensure.return_value = f"user-container-{TEST_USER_ID}"

        from backend.api.terminal import (
            handle_connect,
            session_map,
            sio,
            read_and_forward_pty_output,
        )

        session_map.clear()

        with patch.object(sio, "start_background_task") as mock_start_task:
            cookie_val = _make_signed_cookie(TEST_USER_ID)
            environ = _make_wsgi_environ(cookie_val)

            await handle_connect("test-sid-readloop", environ)

            # The read loop should NOT have been started yet — no resize received
            read_loop_calls = [
                call
                for call in mock_start_task.call_args_list
                if call[0][0] is read_and_forward_pty_output
            ]
            assert len(read_loop_calls) == 0, (
                "BUG: read_and_forward_pty_output was started in handle_connect "
                "before any resize event.  This means tmux output is streamed "
                "at default 80x24 dimensions before the frontend sends the real "
                "terminal size, causing stale prompts in scrollback on every reload."
            )

        session_map.clear()

    @pytest.mark.asyncio
    @patch("backend.api.terminal.set_winsize")
    @patch("backend.api.terminal._attach_container", return_value=True)
    @patch("backend.api.terminal._ensure_container")
    @patch("backend.api.terminal._get_user")
    @patch("backend.api.terminal._settings")
    async def test_read_loop_should_start_after_first_resize(
        self, mock_settings, mock_get_user, mock_ensure, mock_attach, mock_winsize
    ):
        """After the first resize, the read loop should be running.

        This test FAILS on the current code because the read loop is started
        in handle_connect, not handle_resize.  After the fix, the read loop
        should start exactly once, on the first resize.
        """
        mock_settings.flask_secret = FLASK_SECRET

        mock_user = MagicMock()
        mock_user.port_start = 10000
        mock_user.port_end = 10009
        mock_user.email = "test@test.com"
        mock_get_user.return_value = mock_user

        mock_ensure.return_value = f"user-container-{TEST_USER_ID}"

        from backend.api.terminal import (
            handle_connect,
            handle_resize,
            session_map,
            sio,
            read_and_forward_pty_output,
        )

        session_map.clear()
        sid = "test-sid-resize"

        with patch.object(sio, "start_background_task") as mock_start_task:
            cookie_val = _make_signed_cookie(TEST_USER_ID)
            environ = _make_wsgi_environ(cookie_val)

            await handle_connect(sid, environ)

            # Simulate the session having an fd (normally set by _attach_container)
            session_map[sid]["fd"] = 999

            # Now send the first resize — this is when the read loop should start
            mock_start_task.reset_mock()
            await handle_resize(sid, {"cols": 165, "rows": 13})

            read_loop_calls = [
                call
                for call in mock_start_task.call_args_list
                if call[0][0] is read_and_forward_pty_output
            ]
            assert len(read_loop_calls) == 1, (
                "read_and_forward_pty_output should be started exactly once "
                f"after the first resize, but was started {len(read_loop_calls)} times"
            )

            # A second resize should NOT start another read loop
            mock_start_task.reset_mock()
            await handle_resize(sid, {"cols": 100, "rows": 20})

            read_loop_calls = [
                call
                for call in mock_start_task.call_args_list
                if call[0][0] is read_and_forward_pty_output
            ]
            assert len(read_loop_calls) == 0, (
                "read_and_forward_pty_output should NOT be started again on "
                f"subsequent resizes, but was started {len(read_loop_calls)} times"
            )
