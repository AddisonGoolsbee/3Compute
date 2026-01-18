"""
Pytest configuration and fixtures
"""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

# Add parent directory to Python path to find backend module
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))


@pytest.fixture
def temp_file():
    """Create a temporary file for testing"""
    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as f:
        yield f.name
    # Only unlink if file still exists
    try:
        os.unlink(f.name)
    except FileNotFoundError:
        pass


@pytest.fixture
def mock_flask_app():
    """Mock Flask application"""
    with patch("flask.current_app") as mock_app:
        mock_app.config = {"TESTING": True}
        yield mock_app


@pytest.fixture
def flask_app():
    """Create a real Flask application for testing"""
    from flask import Flask
    from flask_login import LoginManager

    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"

    # Initialize LoginManager
    login_manager = LoginManager()
    login_manager.init_app(app)

    # Add a simple user_loader for testing
    @login_manager.user_loader
    def load_user(user_id):
        from unittest.mock import Mock

        user = Mock()
        user.id = user_id
        user.is_authenticated = True
        return user

    with app.app_context():
        yield app


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    user = Mock()
    user.id = 1
    user.is_authenticated = True
    user.port_range = (8000, 8100)
    user.port_start = 8000
    # port_end is calculated automatically as port_start + 9
    return user


@pytest.fixture
def mock_socket():
    """Mock socket.io connection"""
    socket = Mock()
    socket.emit = Mock()
    socket.on = Mock()
    socket.disconnect = Mock()
    return socket


@pytest.fixture
def mock_docker():
    """Mock Docker operations"""
    with (
        patch("subprocess.run") as mock_run,
        patch("backend.docker.pty.openpty") as mock_pty,
        patch("subprocess.Popen") as mock_popen,
    ):
        # Configure mocks
        mock_run.return_value = Mock(returncode=0, stdout="running\n")
        mock_pty.return_value = (5, 6)  # master_fd, slave_fd
        mock_popen.return_value = Mock()

        yield {"run": mock_run, "pty": mock_pty, "popen": mock_popen}


@pytest.fixture
def mock_flask_dependencies():
    """Mock Flask and related dependencies"""
    mock_request = Mock()
    mock_request.sid = "test-session-123"
    mock_request.args.get.return_value = "1"  # Default tab ID

    mock_user = Mock()
    mock_user.id = 1
    mock_user.is_authenticated = True
    mock_user.port_range = (8000, 8100)
    mock_user.port_start = 8000

    mock_socketio = Mock()
    mock_socketio.emit = Mock()

    with (
        patch("backend.terminal.request", mock_request),
        patch("backend.terminal.current_user", mock_user),
        patch("backend.terminal.socketio", mock_socketio),
    ):
        yield {"request": mock_request, "user": mock_user, "socketio": mock_socketio}


@pytest.fixture(autouse=True)
def reset_module_state():
    """Reset module state between tests"""
    # Clear session and container maps
    import backend.terminal as terminal

    terminal.session_map.clear()
    terminal.user_containers.clear()
    terminal._cleanup_timers.clear()

    yield

    # Clean up after test
    terminal.session_map.clear()
    terminal.user_containers.clear()
    terminal._cleanup_timers.clear()
