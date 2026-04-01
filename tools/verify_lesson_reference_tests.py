#!/usr/bin/env python3
"""
Run each lesson's student test suite against the published reference solution.

Copies templateProjects/<Lesson> into a temp directory, overlays files from
public/docs/.../solution*, installs requirements.txt when present, then runs
the project's test_*.py. No changes to lesson or solution sources.

Usage (from repo root):
    python3 tools/verify_lesson_reference_tests.py
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


# Python-only lessons with a reference solution under frontend/public/docs.
LESSONS: list[dict] = [
    {
        "id": "tic_tac_toe",
        "template": "frontend/public/templateProjects/Tic-Tac-Toe",
        "overlays": [("backend/solutions/tic-tac-toe/solution.py", "main.py")],
        "test": ["python3", "test_game.py"],
    },
    {
        "id": "sorting_algorithms",
        "template": "frontend/public/templateProjects/Sorting-Algorithms",
        "overlays": [("backend/solutions/sorting-algorithms/solution.py", "main.py")],
        "test": ["python3", "test_sorting.py"],
    },
    {
        "id": "data_structures",
        "template": "frontend/public/templateProjects/Data-Structures",
        "overlays": [("backend/solutions/data-structures/solution.py", "main.py")],
        "test": ["python3", "test_structures.py"],
    },
    {
        "id": "ecosystem_simulation",
        "template": "frontend/public/templateProjects/Ecosystem-Simulation",
        "overlays": [("backend/solutions/ecosystem-simulation/solution.py", "main.py")],
        "test": ["python3", "test_simulation.py"],
    },
    {
        "id": "data_analysis",
        "template": "frontend/public/templateProjects/Data-Analysis",
        "overlays": [("backend/solutions/data-analysis/solution.py", "main.py")],
        "test": ["python3", "test_analysis.py"],
    },
    {
        "id": "data_encoding",
        "template": "frontend/public/templateProjects/Data-Encoding",
        "overlays": [("backend/solutions/data-encoding/solution.py", "main.py")],
        "test": ["python3", "test_encoding.py"],
    },
    {
        "id": "password_security",
        "template": "frontend/public/templateProjects/Password-Security",
        "overlays": [("backend/solutions/password-security/solution.py", "main.py")],
        "test": ["python3", "test_security.py"],
    },
    {
        "id": "weather_app",
        "template": "frontend/public/templateProjects/Weather-App",
        "overlays": [
            ("backend/solutions/weather-app/solution/weather_api.py", "weather_api.py"),
            ("backend/solutions/weather-app/solution/display.py", "display.py"),
        ],
        "test": ["python3", "test_weather.py"],
    },
    {
        "id": "debugging_workshop",
        "template": "frontend/public/templateProjects/Debugging-Workshop",
        "overlays": [("backend/solutions/debugging-workshop/solution.py", "buggy_programs.py")],
        "test": ["python3", "test_programs.py"],
    },
    {
        "id": "computing_layers",
        "template": "frontend/public/templateProjects/Computing-Layers",
        "overlays": [("backend/solutions/computing-layers/solution.py", "file_system.py")],
        "test": ["python3", "test_filesystem.py"],
    },
    {
        "id": "my_website",
        "template": "frontend/public/templateProjects/My-Website",
        "overlays": [("backend/solutions/my-website/solution/app.py", "app.py")],
        "test": ["python3", "test_website.py"],
    },
]


def verify_success(lesson_id: str, output: str, returncode: int) -> tuple[bool, str]:
    if returncode != 0:
        return False, f"exit code {returncode}"

    if lesson_id == "tic_tac_toe":
        if "🎉 ALL TESTS PASSED" in output:
            return True, ""
        return False, "expected '🎉 ALL TESTS PASSED' in test output"

    if lesson_id == "password_security":
        marker = "All tests passed. Run 'python main.py' to see the demo."
        if marker in output:
            return True, ""
        return False, "expected password suite full-pass message"

    if lesson_id in ("weather_app", "my_website", "data_encoding"):
        return True, ""

    if lesson_id == "data_analysis":
        m = re.search(r"Results:\s*(\d+)\s+passed,\s*(\d+)\s+failed", output)
        if m and int(m.group(2)) == 0:
            return True, ""
        return False, "expected 'Results: N passed, 0 failed'"

    matches = list(re.finditer(r"(\d+)/(\d+)\s+tests passed", output))
    if matches:
        a, b = int(matches[-1].group(1)), int(matches[-1].group(2))
        if a == b:
            return True, ""
        return False, f"last tests summary was {a}/{b}"

    return False, "could not find a passing tests summary in output"


def pip_install_requirements(workdir: Path) -> None:
    if os.environ.get("VERIFY_LESSONS_NO_PIP", "").strip() in ("1", "true", "yes"):
        return
    req = workdir / "requirements.txt"
    if not req.is_file():
        return
    text = req.read_text(encoding="utf-8")
    if not any(line.strip() and not line.strip().startswith("#") for line in text.splitlines()):
        return
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", "-r", str(req)],
        cwd=str(workdir),
        check=True,
    )


def run_lesson(lesson: dict, work_root: Path) -> tuple[bool, str]:
    name = lesson["id"]
    dst = work_root / name
    template = REPO_ROOT / lesson["template"]
    if not template.is_dir():
        return False, f"template missing: {template}"

    shutil.copytree(template, dst)

    for src_rel, dest_name in lesson["overlays"]:
        src = REPO_ROOT / src_rel
        if not src.is_file():
            return False, f"solution overlay missing: {src}"
        shutil.copy2(src, dst / dest_name)

    pip_install_requirements(dst)

    cmd = [sys.executable if arg == "python3" else arg for arg in lesson["test"]]
    proc = subprocess.run(
        cmd,
        cwd=str(dst),
        capture_output=True,
        text=True,
        timeout=300,
    )
    out = (proc.stdout or "") + "\n" + (proc.stderr or "")
    ok, reason = verify_success(lesson["id"], out, proc.returncode)
    if not ok:
        tail = "\n".join(out.strip().splitlines()[-40:])
        return False, f"{reason}\n--- last 40 lines ---\n{tail}"
    return True, out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--lesson",
        help="Run a single lesson id (e.g. tic_tac_toe)",
    )
    args = parser.parse_args()

    to_run = LESSONS
    if args.lesson:
        to_run = [L for L in LESSONS if L["id"] == args.lesson]
        if not to_run:
            print(f"Unknown lesson id: {args.lesson}", file=sys.stderr)
            return 2

    failures: list[str] = []
    with tempfile.TemporaryDirectory(prefix="lesson-ref-tests-") as tmp:
        root = Path(tmp)
        for lesson in to_run:
            label = lesson["id"]
            print(f"==> {label} …", flush=True)
            ok, detail = run_lesson(lesson, root)
            if ok:
                print(f"    OK ({lesson['test'][-1]})", flush=True)
            else:
                print(f"    FAIL: {detail.splitlines()[0]}", flush=True)
                failures.append(f"{label}:\n{detail}")

    if failures:
        print("\n--- failures ---\n", file=sys.stderr)
        for f in failures:
            print(f, file=sys.stderr)
        return 1
    print(f"\nAll {len(to_run)} lesson reference test(s) passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
