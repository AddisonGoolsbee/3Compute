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
    try:
        os.unlink(f.name)
    except FileNotFoundError:
        pass


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    user = Mock()
    user.id = 1
    user.is_authenticated = True
    user.port_range = (8000, 8100)
    user.port_start = 8000
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
        mock_run.return_value = Mock(returncode=0, stdout="running\n")
        mock_pty.return_value = (5, 6)
        mock_popen.return_value = Mock()
        yield {"run": mock_run, "pty": mock_pty, "popen": mock_popen}


@pytest.fixture(autouse=True)
def reset_module_state():
    """Reset module state between tests"""
    try:
        import backend.api.terminal as terminal
        terminal.session_map.clear()
        terminal.user_containers.clear()
        terminal._cleanup_timers.clear()
    except Exception:
        pass

    yield

    try:
        import backend.api.terminal as terminal
        terminal.session_map.clear()
        terminal.user_containers.clear()
        terminal._cleanup_timers.clear()
    except Exception:
        pass
