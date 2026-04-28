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

    @patch("backend.docker.os.close")
    @patch("backend.docker.pty.openpty")
    @patch("subprocess.Popen")
    def test_attach_to_container_success(self, mock_popen, mock_openpty, mock_close):
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

            # Parent must close slave_fd after Popen — otherwise it leaks.
            mock_close.assert_any_call(6)

            # Verify correct command was called
            mock_popen.assert_called_once()
            args = mock_popen.call_args[0][0]
            assert "docker" in args
            assert "exec" in args
            assert "test-container" in args
            assert "csroom-tab1" in " ".join(args)  # dtach session name

    def test_attach_to_container_not_running(self):
        """Test attach_to_container fails when container not running"""
        from backend.docker import attach_to_container

        with patch("backend.docker.container_is_running", return_value=False):
            with pytest.raises(
                RuntimeError, match="Container test-container is not running"
            ):
                attach_to_container("test-container", "1")

    @patch("backend.docker.os.close")
    @patch("backend.docker.pty.openpty")
    @patch("subprocess.Popen")
    def test_attach_to_container_with_tab_id(self, mock_popen, mock_openpty, _mock_close):
        """Test container attachment with specific tab ID"""
        from backend.docker import attach_to_container

        mock_openpty.return_value = (5, 6)
        mock_popen.return_value = Mock()

        with patch("backend.docker.container_is_running", return_value=True):
            attach_to_container("test-container", "5")

            # Verify dtach session name includes tab ID
            args = mock_popen.call_args[0][0]
            command_str = " ".join(args)
            assert "csroom-tab5" in command_str

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

    def test_dtach_session_naming(self):
        """Test dtach session naming with different tab IDs"""
        from backend.docker import attach_to_container

        test_cases = [
            ("1", "csroom-tab1"),
            ("2", "csroom-tab2"),
            ("10", "csroom-tab10"),
        ]

        with (
            patch("backend.docker.container_is_running", return_value=True),
            patch("backend.docker.pty.openpty", return_value=(5, 6)),
            patch("backend.docker.os.close"),
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


class TestRunInEphemeralContainer:
    """Tests for ephemeral test-runner containers."""

    @patch("subprocess.run")
    def test_basic_execution(self, mock_run):
        """Test that ephemeral container runs with correct args."""
        from backend.docker import run_in_ephemeral_container

        mock_run.return_value = Mock(returncode=0, stdout="3/3\n", stderr="")

        rc, stdout, stderr = run_in_ephemeral_container(
            student_dir="/var/lib/3compute/classrooms/c1/participants/a@b.com/lesson1",
            test_files={"test_math.py": "/var/lib/3compute/classrooms/c1/assignments/lesson1/test_math.py"},
            command=["python3", "/tmp/tests/test_math.py"],
        )

        assert rc == 0
        assert stdout == "3/3\n"

        args = mock_run.call_args[0][0]
        cmd_str = " ".join(args)
        assert "docker" in cmd_str
        assert "--rm" in cmd_str
        assert "3compute:latest" in cmd_str

    @patch("subprocess.run")
    def test_student_dir_mounted_read_only(self, mock_run):
        """Student workspace must be read-only to prevent malicious code from modifying files."""
        from backend.docker import run_in_ephemeral_container

        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        run_in_ephemeral_container(
            student_dir="/data/students/alice/lesson1",
            test_files={"test_x.py": "/data/templates/test_x.py"},
            command=["python3", "/tmp/tests/test_x.py"],
        )

        args = mock_run.call_args[0][0]
        # Find the -v flag for student dir
        found_ro = False
        for i, arg in enumerate(args):
            if arg == "-v" and i + 1 < len(args):
                vol = args[i + 1]
                if "/data/students/alice/lesson1:" in vol:
                    assert vol.endswith(":ro"), (
                        f"Student dir mount must be read-only, got: {vol}"
                    )
                    found_ro = True
        assert found_ro, "Student dir volume mount not found in docker args"

    @patch("subprocess.run")
    def test_security_hardening(self, mock_run):
        """Ephemeral containers must have security flags."""
        from backend.docker import run_in_ephemeral_container

        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        run_in_ephemeral_container(
            student_dir="/data/student",
            test_files={"t.py": "/data/t.py"},
            command=["python3", "/tmp/tests/t.py"],
        )

        args = mock_run.call_args[0][0]
        cmd_str = " ".join(args)
        assert "--cap-drop=ALL" in cmd_str
        assert "--read-only" in cmd_str
        assert "no-new-privileges" in cmd_str
        assert "--network=none" in cmd_str
        assert "--pids-limit" in cmd_str
        assert "--memory" in cmd_str

    @patch("subprocess.run")
    def test_timeout_kills_container(self, mock_run):
        """On timeout, container should be force-removed."""
        from backend.docker import run_in_ephemeral_container

        mock_run.side_effect = [
            subprocess.TimeoutExpired(cmd="docker run", timeout=35),
            Mock(returncode=0),  # docker rm -f
        ]

        rc, stdout, stderr = run_in_ephemeral_container(
            student_dir="/data/student",
            test_files={"t.py": "/data/t.py"},
            command=["python3", "/tmp/tests/t.py"],
            timeout=30,
        )

        assert rc == -1
        assert "Timeout" in stderr
        # Verify docker rm -f was called
        assert mock_run.call_count == 2
        rm_args = mock_run.call_args_list[1][0][0]
        assert "rm" in rm_args
        assert "-f" in rm_args

    @patch("subprocess.run")
    def test_test_files_mounted_read_only(self, mock_run):
        """Test files should be mounted read-only into a staging area."""
        from backend.docker import run_in_ephemeral_container

        mock_run.return_value = Mock(returncode=0, stdout="", stderr="")

        run_in_ephemeral_container(
            student_dir="/data/student",
            test_files={
                "test_a.py": "/data/templates/test_a.py",
                "sub/test_b.py": "/data/templates/sub/test_b.py",
            },
            command=["python3", "/tmp/tests/test_a.py"],
        )

        args = mock_run.call_args[0][0]
        # Find all -v mounts for staging
        staging_mounts = []
        for i, arg in enumerate(args):
            if arg == "-v" and i + 1 < len(args) and "_staging" in args[i + 1]:
                staging_mounts.append(args[i + 1])

        assert len(staging_mounts) == 2, f"Expected 2 staging mounts, got: {staging_mounts}"
        for m in staging_mounts:
            assert m.endswith(":ro"), f"Staging mount must be read-only: {m}"


class TestTestRunnerContainerIntegration:
    """Test that test_runner functions use ephemeral containers."""

    @patch("backend.test_runner.run_in_ephemeral_container")
    @patch("backend.test_runner._find_test_files")
    @patch("os.path.isdir")
    def test_run_tests_uses_container(self, mock_isdir, mock_find, mock_container):
        """run_tests_for_student should call run_in_ephemeral_container."""
        from backend.test_runner import run_tests_for_student

        mock_isdir.return_value = True
        mock_find.return_value = ["test_math.py"]
        mock_container.return_value = (0, "3/3\n", "")

        passed, total = run_tests_for_student("c1", "lesson1", "alice@test.com")

        assert passed == 3
        assert total == 3
        mock_container.assert_called_once()
        call_kwargs = mock_container.call_args[1]
        assert call_kwargs["command"] == ["python3", "/tmp/tests/test_math.py"]
        assert ":ro" not in str(call_kwargs)  # ro is handled by docker.py, not test_runner

    @patch("backend.test_runner.run_in_ephemeral_container")
    @patch("backend.test_runner._find_test_files")
    @patch("os.path.isdir")
    def test_run_tests_with_output_uses_container(self, mock_isdir, mock_find, mock_container):
        """run_tests_for_student_with_output should call run_in_ephemeral_container."""
        from backend.test_runner import run_tests_for_student_with_output

        mock_isdir.return_value = True
        mock_find.return_value = ["test_math.py"]
        mock_container.return_value = (0, "5/5\n", "")

        passed, total, output = run_tests_for_student_with_output("c1", "lesson1", "bob@test.com")

        assert passed == 5
        assert total == 5
        assert "5/5" in output
        mock_container.assert_called_once()

    @patch("backend.test_runner.run_in_ephemeral_container")
    @patch("backend.test_runner._find_test_files")
    @patch("os.path.isdir")
    def test_timeout_handled(self, mock_isdir, mock_find, mock_container):
        """Timeout from ephemeral container should be handled gracefully."""
        from backend.test_runner import run_tests_for_student_with_output

        mock_isdir.return_value = True
        mock_find.return_value = ["test_slow.py"]
        mock_container.return_value = (-1, "", "[Timeout] Container exceeded 30s limit\n")

        passed, total, output = run_tests_for_student_with_output("c1", "lesson1", "alice@test.com")

        assert passed == 0
        assert "Timeout" in output


if __name__ == "__main__":
    pytest.main([__file__])
