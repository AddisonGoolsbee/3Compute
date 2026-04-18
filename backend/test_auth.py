"""Tests for auth port allocation logic."""

from unittest.mock import Mock, patch

import pytest

from backend.api.routers.auth import _max_container_port_end


class TestMaxContainerPortEnd:
    def _mock_run(self, stdout="", returncode=0):
        result = Mock()
        result.returncode = returncode
        result.stdout = stdout
        result.stderr = ""
        return result

    def test_no_containers(self):
        with patch("subprocess.run", return_value=self._mock_run("")):
            assert _max_container_port_end() is None

    def test_single_container(self):
        output = "0.0.0.0:10040-10049->10040-10049/tcp"
        with patch("subprocess.run", return_value=self._mock_run(output)):
            assert _max_container_port_end() == 10049

    def test_multiple_containers(self):
        output = (
            "0.0.0.0:10000-10009->10000-10009/tcp\n"
            "0.0.0.0:10040-10049->10040-10049/tcp\n"
            "0.0.0.0:10020-10029->10020-10029/tcp\n"
        )
        with patch("subprocess.run", return_value=self._mock_run(output)):
            assert _max_container_port_end() == 10049

    def test_ipv6_format(self):
        output = ":::10040-10049->10040-10049/tcp"
        with patch("subprocess.run", return_value=self._mock_run(output)):
            assert _max_container_port_end() == 10049

    def test_multiple_mappings_per_container(self):
        # Docker shows comma-separated mappings on one line
        output = "0.0.0.0:10000-10009->10000-10009/tcp, 0.0.0.0:10010-10019->10010-10019/tcp"
        with patch("subprocess.run", return_value=self._mock_run(output)):
            assert _max_container_port_end() == 10019

    def test_docker_failure_returns_none(self):
        with patch("subprocess.run", return_value=self._mock_run("", returncode=1)):
            assert _max_container_port_end() is None

    def test_docker_exception_returns_none(self):
        with patch("subprocess.run", side_effect=FileNotFoundError("docker not found")):
            assert _max_container_port_end() is None

    def test_docker_timeout_returns_none(self):
        import subprocess
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired("docker", 5)):
            assert _max_container_port_end() is None

    def test_single_port_mapping(self):
        # Edge case: a single port binding (not a range)
        output = "0.0.0.0:8080->8080/tcp"
        with patch("subprocess.run", return_value=self._mock_run(output)):
            assert _max_container_port_end() == 8080
