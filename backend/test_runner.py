import logging
import os
import re
import shutil

from backend.docker import (
    CLASSROOMS_ROOT,
    CONTAINER_USER_GID,
    CONTAINER_USER_UID,
    run_in_ephemeral_container,
)

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


_RESULTS_MARKER = "###CSROOM_RESULTS:"
# Env var the backend sets when running a test as the grading host. Test
# scripts register an atexit handler that emits the score to stdout only
# when this is set, so students running the script locally don't see the
# raw "N/M" dump — they just see the human-readable summary.
TEST_ENV_SIGNAL = "TCOMPUTE_SCORE"


def _parse_structured_output(output: str) -> tuple[int, int]:
    """Pull ``passed/total`` from a test script's stdout.

    Primary format is the last non-empty line of the form ``N/M`` — emitted
    by an atexit handler in the test script so the score is always reported
    even if the script crashed mid-way. Legacy tests that still use the
    ``###CSROOM_RESULTS:N/M###`` marker are also supported.
    """
    lines = output.split("\n")
    for line in reversed(lines):
        stripped = line.strip()
        if not stripped:
            continue
        m = re.fullmatch(r"(\d+)/(\d+)", stripped)
        if m:
            return int(m.group(1)), int(m.group(2))
        # First non-empty trailing line that isn't the plain score — fall
        # through to the legacy marker scan below.
        break

    for line in reversed(lines):
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

    # Fallback heuristics for non-CS Room test scripts
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

    # Build test file mapping: relative path -> host absolute path
    test_file_map = {}
    for tf in test_files:
        test_file_map[tf] = os.path.join(templates_dir, tf)

    py_tests = [f for f in test_files if f.endswith(".py")]
    passed, total = 0, 0
    all_output = ""

    if py_tests:
        for tf in py_tests:
            rc, stdout, stderr = run_in_ephemeral_container(
                student_dir=student_dir,
                test_files=test_file_map,
                command=["python3", f"/tmp/tests/{tf}"],
                timeout=30,
            )
            output = stdout + stderr
            all_output += output
            if rc == -1:
                all_output += f"\n[Timeout] {tf} exceeded 30s limit\n"
            else:
                # Structured N/M score is emitted to stdout by the test
                # script's atexit handler. Stderr (e.g. tracebacks) would
                # come last in `output` and break the "last non-empty line"
                # heuristic, so parse stdout in isolation.
                p, t = _parse_script_output(stdout)
                passed += p
                total += t

        if total == 0:
            rc, stdout, stderr = run_in_ephemeral_container(
                student_dir=student_dir,
                test_files=test_file_map,
                command=["python3", "-m", "pytest", "--tb=short", "-q", "/app"],
                timeout=30,
            )
            output = stdout + stderr
            all_output += output
            if rc == -1:
                all_output += "\n[Timeout] pytest exceeded 30s limit\n"
            else:
                passed, total = _parse_pytest_output(output)
                if total == 0:
                    passed, total = _parse_unittest_output(output)

    return passed, total, all_output


def run_tests_for_student(
    classroom_id: str,
    template_name: str,
    student_email: str,
) -> tuple[int, int]:
    """Run teacher's tests against a student's code in an ephemeral container.

    Student workspace is mounted read-only so malicious student code cannot
    modify files. Test files are injected into /tmp inside the container.
    Returns (tests_passed, tests_total).

    Strategy: try running each test file as a Python script first (most
    CS Room templates are designed as script-based runners). Fall back to
    pytest if the script approach yields no results.
    """
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

    test_file_map = {}
    for tf in test_files:
        test_file_map[tf] = os.path.join(templates_dir, tf)

    py_tests = [f for f in test_files if f.endswith(".py")]
    passed, total = 0, 0

    if py_tests:
        script_passed, script_total = 0, 0
        for tf in py_tests:
            rc, stdout, stderr = run_in_ephemeral_container(
                student_dir=student_dir,
                test_files=test_file_map,
                command=["python3", f"/tmp/tests/{tf}"],
                timeout=30,
            )
            output = stdout + stderr
            logger.info(
                f"script output for {student_email}/{template_name}/{tf} "
                f"(exit={rc}): {output[:500]}"
            )
            if rc == -1:
                logger.warning(
                    f"Script timeout for {student_email} on {template_name}/{tf}"
                )
            else:
                # See note in run_tests_for_student_with_output: parse stdout
                # alone so a stderr traceback doesn't shadow the score.
                p, t = _parse_script_output(stdout)
                script_passed += p
                script_total += t

        if script_total > 0:
            passed, total = script_passed, script_total
        else:
            rc, stdout, stderr = run_in_ephemeral_container(
                student_dir=student_dir,
                test_files=test_file_map,
                command=["python3", "-m", "pytest", "--tb=no", "-q", "/app"],
                timeout=30,
            )
            output = stdout + stderr
            logger.info(
                f"pytest output for {student_email}/{template_name} "
                f"(exit={rc}): {output[:500]}"
            )
            if rc == -1:
                logger.warning(
                    f"Test timeout for {student_email} on {template_name}"
                )
                return 0, len(py_tests)
            else:
                passed, total = _parse_pytest_output(output)
                if total == 0:
                    passed, total = _parse_unittest_output(output)

    return passed, total
