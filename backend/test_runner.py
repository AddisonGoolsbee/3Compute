import logging
import os
import re
import shutil
import subprocess

from backend.docker import CLASSROOMS_ROOT, CONTAINER_USER_GID, CONTAINER_USER_UID

logger = logging.getLogger("test_runner")


def _apply_shared_perms(root: str) -> None:
    """Walk *root* and set ownership to the container user (999:995), mode
    2775 on directories (setgid so children inherit GID 995), and 0664 on
    files. Both the backend (www-data with supplementary 995) and the
    container user can read/write, and subprocess stagings can overwrite
    existing files via group permissions."""
    for dirpath, _dirnames, filenames in os.walk(root):
        try:
            os.chown(dirpath, CONTAINER_USER_UID, CONTAINER_USER_GID)
        except OSError:
            pass
        try:
            os.chmod(dirpath, 0o2775)
        except OSError:
            pass
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            try:
                os.chown(fp, CONTAINER_USER_UID, CONTAINER_USER_GID)
            except OSError:
                pass
            try:
                os.chmod(fp, 0o664)
            except OSError:
                pass


def _find_test_files(template_dir: str) -> list[str]:
    """Find test files in a template directory.

    Convention: any file starting with ``test_`` is a test file.
    Teachers can add their own by naming files ``test_<something>.py``.
    """
    test_files = []
    for root, _dirs, files in os.walk(template_dir):
        for f in files:
            if f.startswith("test_"):
                rel = os.path.relpath(os.path.join(root, f), template_dir)
                test_files.append(rel)
    return test_files


def _parse_pytest_output(output: str) -> tuple[int, int]:
    """Parse pytest output to extract passed/total counts."""
    # Match patterns like "3 passed, 1 failed" or "5 passed"
    passed = 0
    failed = 0
    errors = 0

    match = re.search(r"(\d+) passed", output)
    if match:
        passed = int(match.group(1))

    match = re.search(r"(\d+) failed", output)
    if match:
        failed = int(match.group(1))

    match = re.search(r"(\d+) error", output)
    if match:
        errors = int(match.group(1))

    total = passed + failed + errors
    return passed, total


def _parse_unittest_output(output: str) -> tuple[int, int]:
    """Parse unittest output."""
    # "Ran 5 tests" + "OK" or "FAILED (failures=2)"
    total = 0
    match = re.search(r"Ran (\d+) test", output)
    if match:
        total = int(match.group(1))

    if "OK" in output and total > 0:
        return total, total

    failures = 0
    match = re.search(r"failures=(\d+)", output)
    if match:
        failures = int(match.group(1))

    errors = 0
    match = re.search(r"errors=(\d+)", output)
    if match:
        errors = int(match.group(1))

    passed = max(0, total - failures - errors)
    return passed, total


_RESULTS_MARKER = "###3COMPUTE_RESULTS:"


def _parse_structured_output(output: str) -> tuple[int, int]:
    """Parse the structured marker emitted by 3Compute test scripts.

    All 3Compute test scripts emit a line like::

        ###3COMPUTE_RESULTS:passed/total###

    at the very end. This is the authoritative source of truth — no
    heuristic output parsing needed.
    """
    for line in reversed(output.split("\n")):
        if _RESULTS_MARKER in line:
            m = re.search(
                re.escape(_RESULTS_MARKER) + r"(\d+)/(\d+)###", line
            )
            if m:
                return int(m.group(1)), int(m.group(2))
    return 0, 0


def _parse_script_output(output: str) -> tuple[int, int]:
    """Parse output from a test script.

    Tries the structured marker first, then falls back to heuristic
    parsing for teacher-authored tests that don't use the marker.
    """
    # Authoritative: structured marker
    p, t = _parse_structured_output(output)
    if t > 0:
        return p, t

    # Fallback heuristics for non-3Compute test scripts
    lines = output.split("\n")

    for line in reversed(lines):
        m = re.search(r"Results:\s*(\d+)/(\d+)", line)
        if m:
            return int(m.group(1)), int(m.group(2))
        m = re.search(r"Results:\s*(\d+)\s*passed,\s*(\d+)\s*failed", line)
        if m:
            p, f = int(m.group(1)), int(m.group(2))
            return p, p + f

    for line in reversed(lines):
        m = re.match(r"\s+(\d+)/(\d+)\s+tests?\s+passed", line)
        if m:
            return int(m.group(1)), int(m.group(2))

    per_func = re.findall(r"\w+:\s*(\d+)/(\d+)\s+tests?\s+passed", output)
    if per_func:
        total = len(per_func)
        passed = sum(1 for p, t in per_func if p == t)
        return passed, total

    p, t = _parse_unittest_output(output)
    if t > 0:
        return p, t

    return 0, 0


def run_tests_for_student_with_output(
    classroom_id: str,
    template_name: str,
    student_email: str,
) -> tuple[int, int, str]:
    """Like run_tests_for_student but also returns the raw test output."""
    # Reuses the same logic but captures stdout/stderr text.
    student_email = (student_email or "participant").replace("/", "_")

    templates_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "assignments", template_name
    )
    student_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "participants", student_email, template_name
    )

    if not os.path.isdir(templates_dir):
        return 0, 0, "Template directory not found."

    if not os.path.isdir(student_dir):
        logger.info(f"Creating student dir from template: {student_dir}")
        try:
            shutil.copytree(templates_dir, student_dir)
            _apply_shared_perms(student_dir)
        except Exception as e:
            return 0, 0, f"Failed to create student directory: {e}"

    test_files = _find_test_files(templates_dir)
    if not test_files:
        return 0, 0, "No test files found."

    copied_files: list[str] = []
    all_output = ""
    try:
        for tf in test_files:
            src = os.path.join(templates_dir, tf)
            dst = os.path.join(student_dir, tf)
            try:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                # Remove any stale copy first so the copy2 doesn't EACCES on an
                # existing file that was created with restrictive perms.
                if os.path.exists(dst):
                    try:
                        os.remove(dst)
                    except OSError:
                        pass
                shutil.copy2(src, dst)
                try:
                    os.chown(dst, CONTAINER_USER_UID, CONTAINER_USER_GID)
                except OSError:
                    pass
                try:
                    os.chmod(dst, 0o664)
                except OSError:
                    pass
                copied_files.append(dst)
            except (OSError, shutil.Error) as e:
                # Surface the error instead of 500-ing the whole request. Most
                # commonly this is a permission problem on the student's
                # participant dir.
                all_output += f"\n[Error] Failed to stage {tf} into {dst}: {e}\n"
                logger.exception(
                    "Failed to stage test file %s for %s/%s",
                    tf, student_email, template_name,
                )

        py_tests = [f for f in test_files if f.endswith(".py")]
        passed, total = 0, 0

        if py_tests:
            for tf in py_tests:
                try:
                    result = subprocess.run(
                        ["python3", os.path.join(student_dir, tf)],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        cwd=student_dir,
                    )
                    output = result.stdout + result.stderr
                    all_output += output
                    p, t = _parse_script_output(output)
                    passed += p
                    total += t
                except subprocess.TimeoutExpired:
                    all_output += f"\n[Timeout] {tf} exceeded 30s limit\n"
                except Exception as e:
                    all_output += f"\n[Error] {tf}: {e}\n"

            if total == 0:
                try:
                    result = subprocess.run(
                        ["python3", "-m", "pytest", "--tb=short", "-q", student_dir],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        cwd=student_dir,
                    )
                    output = result.stdout + result.stderr
                    all_output += output
                    passed, total = _parse_pytest_output(output)
                    if total == 0:
                        passed, total = _parse_unittest_output(output)
                except subprocess.TimeoutExpired:
                    all_output += "\n[Timeout] pytest exceeded 30s limit\n"
                except Exception as e:
                    all_output += f"\n[Error] pytest: {e}\n"

        return passed, total, all_output

    finally:
        for f in copied_files:
            try:
                os.remove(f)
            except OSError:
                pass


def run_tests_for_student(
    classroom_id: str,
    template_name: str,
    student_email: str,
) -> tuple[int, int]:
    """Run teacher's tests against a student's code.

    Copies teacher test files into the student's workspace, runs the tests,
    then cleans up. Returns (tests_passed, tests_total).

    Strategy: try running each test file as a Python script first (most
    3Compute templates are designed as script-based runners). Fall back to
    pytest if the script approach yields no results.
    """
    # Sanitize email the same way participant dirs are created
    student_email = (student_email or "participant").replace("/", "_")

    templates_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "assignments", template_name
    )
    student_dir = os.path.join(
        CLASSROOMS_ROOT, classroom_id, "participants", student_email, template_name
    )

    if not os.path.isdir(templates_dir):
        logger.warning(f"Template dir not found: {templates_dir}")
        return 0, 0

    if not os.path.isdir(student_dir):
        # Student workspace doesn't exist yet (container never spawned).
        # Initialize it from the template so tests can run against starter code.
        logger.info(f"Creating student dir from template: {student_dir}")
        try:
            shutil.copytree(templates_dir, student_dir)
            _apply_shared_perms(student_dir)
        except Exception as e:
            logger.error(f"Failed to create student dir: {e}")
            return 0, 0

    test_files = _find_test_files(templates_dir)
    if not test_files:
        logger.info(f"No test files found in {templates_dir}")
        return 0, 0

    # Copy teacher test files into student workspace
    copied_files: list[str] = []
    try:
        for tf in test_files:
            src = os.path.join(templates_dir, tf)
            dst = os.path.join(student_dir, tf)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if os.path.exists(dst):
                try:
                    os.remove(dst)
                except OSError:
                    pass
            shutil.copy2(src, dst)
            try:
                os.chown(dst, CONTAINER_USER_UID, CONTAINER_USER_GID)
            except OSError:
                pass
            try:
                os.chmod(dst, 0o664)
            except OSError:
                pass
            copied_files.append(dst)

        # Determine the test command based on file types
        py_tests = [f for f in test_files if f.endswith(".py")]
        js_tests = [f for f in test_files if f.endswith(".js")]

        passed, total = 0, 0

        if py_tests:
            # Strategy 1: Run test files as scripts (most templates are designed
            # as standalone runners with their own output parsing)
            script_passed, script_total = 0, 0
            for tf in py_tests:
                try:
                    result = subprocess.run(
                        ["python3", os.path.join(student_dir, tf)],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        cwd=student_dir,
                    )
                    output = result.stdout + result.stderr
                    logger.info(
                        f"script output for {student_email}/{template_name}/{tf} "
                        f"(exit={result.returncode}): {output[:500]}"
                    )
                    p, t = _parse_script_output(output)
                    script_passed += p
                    script_total += t
                except subprocess.TimeoutExpired:
                    logger.warning(
                        f"Script timeout for {student_email} on {template_name}/{tf}"
                    )
                except Exception as e:
                    logger.error(f"Script execution failed for {tf}: {e}")

            if script_total > 0:
                passed, total = script_passed, script_total
            else:
                # Strategy 2: Fall back to pytest
                try:
                    result = subprocess.run(
                        [
                            "python3", "-m", "pytest",
                            "--tb=no", "-q",
                            student_dir,
                        ],
                        capture_output=True,
                        text=True,
                        timeout=30,
                        cwd=student_dir,
                    )
                    output = result.stdout + result.stderr
                    logger.info(
                        f"pytest output for {student_email}/{template_name} "
                        f"(exit={result.returncode}): {output[:500]}"
                    )
                    passed, total = _parse_pytest_output(output)

                    # Fallback to unittest parsing if pytest didn't find results
                    if total == 0:
                        passed, total = _parse_unittest_output(output)

                except subprocess.TimeoutExpired:
                    logger.warning(
                        f"Test timeout for {student_email} on {template_name}"
                    )
                    return 0, len(py_tests)
                except Exception as e:
                    logger.error(f"Test execution failed: {e}")
                    return 0, len(py_tests)

        return passed, total

    finally:
        # Clean up: remove copied test files from student workspace
        for f in copied_files:
            try:
                os.remove(f)
            except OSError:
                pass
