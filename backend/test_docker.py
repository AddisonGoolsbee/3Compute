"""
Unit tests for docker.py module
"""

import subprocess
from unittest.mock import Mock, patch

import pytest


class TestDockerModule:
    """Test cases for docker module functions"""

    def test_container_exists_true(self):
        """Test container_exists returns True for existing container"""
        from backend.docker import container_exists

        with patch("subprocess.run") as mock_run:
            # Mock successful container inspect
            mock_run.return_value = Mock(returncode=0, stdout="test-container\n")

            result = container_exists("test-container")

            assert result is True
            mock_run.assert_called_once_with(
                [
                    "docker",
                    "ps",
                    "-a",
                    "--filter",
                    "name=test-container",
                    "--format",
                    "{{.Names}}",
                ],
                capture_output=True,
                text=True,
                check=True,
            )

    def test_container_exists_false(self):
        """Test container_exists returns False for non-existing container"""
        from backend.docker import container_exists

        with patch("subprocess.run") as mock_run:
            # Mock failed container inspect
            mock_run.return_value = Mock(returncode=1, stdout="")

            result = container_exists("non-existent-container")

            assert result is False

    def test_container_is_running_true(self):
        """Test container_is_running returns True for running container"""
        from backend.docker import container_is_running

        with patch("subprocess.run") as mock_run:
            # Mock container in running state - need container name in stdout
            mock_run.return_value = Mock(returncode=0, stdout="test-container\n")

            result = container_is_running("test-container")

            assert result is True
            mock_run.assert_called_once()

    def test_container_is_running_false(self):
        """Test container_is_running returns False for stopped container"""
        from backend.docker import container_is_running

        with patch("subprocess.run") as mock_run:
            # Mock container in stopped state
            mock_run.return_value = Mock(returncode=0, stdout="exited\n")

            result = container_is_running("test-container")

            assert result is False

    def test_container_is_running_exception(self):
        """Test container_is_running handles subprocess exceptions"""
        from backend.docker import container_is_running

        with patch("subprocess.run") as mock_run:
            # Mock subprocess exception
            mock_run.side_effect = subprocess.CalledProcessError(1, "docker")

            result = container_is_running("test-container")

            assert result is False

    @patch("backend.docker.pty.openpty")
    @patch("subprocess.Popen")
    def test_attach_to_container_success(self, mock_popen, mock_openpty):
        """Test successful container attachment"""
        from backend.docker import attach_to_container

        # Mock PTY
        mock_openpty.return_value = (5, 6)  # master_fd, slave_fd

        # Mock subprocess
        mock_proc = Mock()
        mock_popen.return_value = mock_proc

        # Mock container_is_running
        with patch("backend.docker.container_is_running", return_value=True):
            proc, fd = attach_to_container("test-container", "1")

            assert proc == mock_proc
            assert fd == 5

            # Verify correct command was called
            mock_popen.assert_called_once()
            args = mock_popen.call_args[0][0]
            assert "docker" in args
            assert "exec" in args
            assert "test-container" in args
            assert "3compute-tab1" in " ".join(args)  # tmux session name

    def test_attach_to_container_not_running(self):
        """Test attach_to_container fails when container not running"""
        from backend.docker import attach_to_container

        with patch("backend.docker.container_is_running", return_value=False):
            with pytest.raises(
                RuntimeError, match="Container test-container is not running"
            ):
                attach_to_container("test-container", "1")

    @patch("backend.docker.pty.openpty")
    @patch("subprocess.Popen")
    def test_attach_to_container_with_tab_id(self, mock_popen, mock_openpty):
        """Test container attachment with specific tab ID"""
        from backend.docker import attach_to_container

        mock_openpty.return_value = (5, 6)
        mock_popen.return_value = Mock()

        with patch("backend.docker.container_is_running", return_value=True):
            attach_to_container("test-container", "5")

            # Verify tmux session name includes tab ID
            args = mock_popen.call_args[0][0]
            command_str = " ".join(args)
            assert "3compute-tab5" in command_str

    @patch("subprocess.run")
    def test_spawn_container_success(self, mock_run):
        """Test successful container spawning"""
        from backend.docker import spawn_container

        # Mock successful docker run
        mock_run.return_value = Mock(returncode=0)

        # Mock container_exists to return False (new container)
        with patch("backend.docker.container_exists", return_value=False):
            spawn_container(1, None, "test-container", (8000, 8100))

            # Verify docker run was called
            mock_run.assert_called()
            args = mock_run.call_args[0][0]
            assert "docker" in args
            assert "run" in args
            assert "test-container" in args

    def test_spawn_container_already_exists(self):
        """Test spawn_container skips if container already exists"""
        from backend.docker import spawn_container

        with (
            patch("backend.docker.container_exists", return_value=True),
            patch("subprocess.run") as mock_run,
        ):
            # This should raise an exception since container already exists
            with pytest.raises(RuntimeError, match="already exists"):
                spawn_container(1, None, "existing-container", (8000, 8100))

            # Should not call docker run
            mock_run.assert_not_called()

    @patch("subprocess.run")
    def test_spawn_container_failure(self, mock_run):
        """Test spawn_container handles docker run failures"""
        from backend.docker import spawn_container

        # Mock failed docker run
        mock_run.side_effect = subprocess.CalledProcessError(1, "docker")

        with patch("backend.docker.container_exists", return_value=False):
            with pytest.raises(subprocess.CalledProcessError):
                spawn_container(1, None, "test-container", (8000, 8100))

    def test_setup_isolated_network_create(self):
        """Test isolated network setup when network needs to be created"""
        from backend.docker import setup_isolated_network

        with patch("subprocess.run") as mock_run:
            # First call (inspect) fails, second call (create) succeeds
            def side_effect(*args, **kwargs):
                cmd = args[0] if args else []
                cmd_str = " ".join(str(item) for item in cmd) if cmd else ""
                if "inspect" in cmd_str:
                    raise subprocess.CalledProcessError(1, cmd)
                return Mock(returncode=0)

            mock_run.side_effect = side_effect

            setup_isolated_network()

            # Should call at least inspect (which fails) and create (which succeeds)
            assert mock_run.call_count >= 2, (
                "Should call both inspect and create commands"
            )

            # Verify we have both inspect and create calls using string representation
            # This avoids subscripting issues with Mock objects
            calls_str = str(mock_run.call_args_list)

            assert "inspect" in calls_str, "Should have called docker network inspect"
            assert "create" in calls_str, "Should have called docker network create"
            assert "isolated_net" in calls_str, "Should reference isolated_net network"


class TestContainerLifecycle:
    """Test cases for container lifecycle management"""

    @patch("subprocess.run")
    def test_container_creation_with_port_range(self, mock_run):
        """Test container creation includes correct port range"""
        from backend.docker import spawn_container

        mock_run.return_value = Mock(returncode=0)

        with patch("backend.docker.container_exists", return_value=False):
            spawn_container(1, None, "test-container", (8000, 8010))

            # Verify port range is included in docker run command
            args = mock_run.call_args[0][0]
            command_str = " ".join(args)
            assert "8000-8010:8000-8010" in command_str

    def test_tmux_session_naming(self):
        """Test tmux session naming with different tab IDs"""
        from backend.docker import attach_to_container

        test_cases = [
            ("1", "3compute-tab1"),
            ("2", "3compute-tab2"),
            ("10", "3compute-tab10"),
        ]

        with (
            patch("backend.docker.container_is_running", return_value=True),
            patch("backend.docker.pty.openpty", return_value=(5, 6)),
            patch("subprocess.Popen") as mock_popen,
        ):
            mock_popen.return_value = Mock()

            for tab_id, expected_session in test_cases:
                attach_to_container("test-container", tab_id)

                args = mock_popen.call_args[0][0]
                command_str = " ".join(args)
                assert expected_session in command_str

    @patch("subprocess.run")
    def test_network_isolation(self, mock_run):
        """Test that containers are created with network isolation"""
        from backend.docker import spawn_container

        mock_run.return_value = Mock(returncode=0)

        with patch("backend.docker.container_exists", return_value=False):
            spawn_container(1, None, "test-container", (8000, 8100))

            # Verify network isolation parameters
            args = mock_run.call_args[0][0]
            command_str = " ".join(args)
            assert "--network" in command_str
            assert "isolated_net" in command_str


if __name__ == "__main__":
    pytest.main([__file__])
