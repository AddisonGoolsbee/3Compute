"""Seed and serve a single read-only demo classroom that anyone — signed in
or not — can preview from the marketing site.

The demo classroom has stable IDs and a stable access code, lives alongside
real classrooms in the same DB and on the same filesystem, but is never
joined into a user's container. The public ``/api/demo/...`` router (in
``routers/demo.py``) is the only way to read it, and it never exposes
mutating operations.
"""
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, select

from .database import (
    AssignmentWeight,
    Classroom,
    ClassroomMember,
    TestResult,
    User,
)

logger = logging.getLogger("demo")


# Stable, well-known IDs. Never auto-generated, so the demo URLs are
# deterministic and the seed is idempotent.
DEMO_CLASSROOM_ID = "00000000-0000-0000-0000-000000000d3a"  # "demo classroom anchor"
DEMO_INSTRUCTOR_ID = "demo-instructor"
DEMO_STUDENT_IDS = [
    "demo-student-1",
    "demo-student-2",
    "demo-student-3",
    "demo-student-4",
    "demo-student-5",
]
DEMO_ACCESS_CODE = "DEMO00"  # Visible in UI; meaningless because no one can join.

DEMO_INSTRUCTOR_EMAIL = "ms-rivera@csroom.demo"
DEMO_INSTRUCTOR_NAME = "Ms. Rivera"

# (id, name, email)
DEMO_STUDENTS: list[tuple[str, str, str]] = [
    (DEMO_STUDENT_IDS[0], "Aiden Park", "aiden.park@csroom.demo"),
    (DEMO_STUDENT_IDS[1], "Bea Okafor", "bea.okafor@csroom.demo"),
    (DEMO_STUDENT_IDS[2], "Casey Tran", "casey.tran@csroom.demo"),
    (DEMO_STUDENT_IDS[3], "Diego Alvarez", "diego.alvarez@csroom.demo"),
    (DEMO_STUDENT_IDS[4], "Eleanor Cho", "eleanor.cho@csroom.demo"),
]


# Three Python assignments. Each one ships with starter code for the
# student to fill in, plus a ``test_*.py`` that exercises it.
# A sample draft assignment so the demo Assignments tab shows what an
# in-progress (unpublished) assignment looks like alongside the published
# ones. Files mirror what a real draft folder contains.
DEMO_DRAFTS: dict[str, dict[str, str]] = {
    "two-sum (draft)": {
        "two_sum.py": (
            "def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:\n"
            "    \"\"\"Return the indices of the two numbers in *nums* that add to\n"
            "    *target*, or None if no such pair exists.\"\"\"\n"
            "    # TODO: implement\n"
            "    return None\n"
        ),
        "test_two_sum.py": (
            "from two_sum import two_sum\n"
            "\n"
            "def test_basic():\n"
            "    assert two_sum([2, 7, 11, 15], 9) == (0, 1)\n"
            "\n"
            "def test_no_pair():\n"
            "    assert two_sum([1, 2, 3], 100) is None\n"
        ),
        "README.md": (
            "# Two Sum (draft)\n"
            "\n"
            "Given a list of integers, return the indices of two values that\n"
            "sum to the target, or `None` if no such pair exists.\n"
            "\n"
            "_This assignment is still being drafted — students don't see it yet._\n"
        ),
    },
}


DEMO_ASSIGNMENTS: dict[str, dict[str, str]] = {
    "fizzbuzz": {
        "fizzbuzz.py": (
            "def fizzbuzz(n: int) -> str:\n"
            "    \"\"\"Return 'Fizz' for multiples of 3, 'Buzz' for multiples of 5,\n"
            "    'FizzBuzz' for multiples of both, else the number as a string.\"\"\"\n"
            "    # TODO: implement\n"
            "    return str(n)\n"
        ),
        "test_fizzbuzz.py": (
            "from fizzbuzz import fizzbuzz\n"
            "\n"
            "def test_basic():\n"
            "    assert fizzbuzz(1) == '1'\n"
            "    assert fizzbuzz(2) == '2'\n"
            "\n"
            "def test_fizz():\n"
            "    assert fizzbuzz(3) == 'Fizz'\n"
            "    assert fizzbuzz(9) == 'Fizz'\n"
            "\n"
            "def test_buzz():\n"
            "    assert fizzbuzz(5) == 'Buzz'\n"
            "    assert fizzbuzz(20) == 'Buzz'\n"
            "\n"
            "def test_fizzbuzz():\n"
            "    assert fizzbuzz(15) == 'FizzBuzz'\n"
            "    assert fizzbuzz(45) == 'FizzBuzz'\n"
        ),
        "README.md": (
            "# FizzBuzz\n"
            "\n"
            "Implement `fizzbuzz(n)` so that:\n"
            "\n"
            "- multiples of 3 return `\"Fizz\"`\n"
            "- multiples of 5 return `\"Buzz\"`\n"
            "- multiples of both return `\"FizzBuzz\"`\n"
            "- everything else returns the number as a string\n"
            "\n"
            "Run `pytest` to check your solution.\n"
        ),
    },
    "palindrome": {
        "palindrome.py": (
            "def is_palindrome(s: str) -> bool:\n"
            "    \"\"\"Return True if *s* reads the same forwards and backwards,\n"
            "    ignoring case and non-letter characters.\"\"\"\n"
            "    # TODO: implement\n"
            "    return False\n"
        ),
        "test_palindrome.py": (
            "from palindrome import is_palindrome\n"
            "\n"
            "def test_simple():\n"
            "    assert is_palindrome('racecar')\n"
            "    assert is_palindrome('level')\n"
            "\n"
            "def test_not_palindrome():\n"
            "    assert not is_palindrome('hello')\n"
            "    assert not is_palindrome('python')\n"
            "\n"
            "def test_mixed_case():\n"
            "    assert is_palindrome('RaceCar')\n"
            "    assert is_palindrome('Madam')\n"
            "\n"
            "def test_punctuation():\n"
            "    assert is_palindrome('A man, a plan, a canal: Panama')\n"
            "    assert is_palindrome(\"No 'x' in Nixon\")\n"
        ),
        "README.md": (
            "# Palindromes\n"
            "\n"
            "Implement `is_palindrome(s)` so it ignores case and non-letter\n"
            "characters. Tests cover simple words, mixed case, and full sentences.\n"
        ),
    },
    "fibonacci": {
        "fibonacci.py": (
            "def fib(n: int) -> int:\n"
            "    \"\"\"Return the n-th Fibonacci number. fib(0) = 0, fib(1) = 1.\"\"\"\n"
            "    # TODO: implement\n"
            "    return 0\n"
        ),
        "test_fibonacci.py": (
            "from fibonacci import fib\n"
            "\n"
            "def test_base_cases():\n"
            "    assert fib(0) == 0\n"
            "    assert fib(1) == 1\n"
            "\n"
            "def test_small():\n"
            "    assert fib(2) == 1\n"
            "    assert fib(3) == 2\n"
            "    assert fib(7) == 13\n"
            "\n"
            "def test_larger():\n"
            "    assert fib(10) == 55\n"
            "    assert fib(15) == 610\n"
        ),
        "README.md": (
            "# Fibonacci\n"
            "\n"
            "Implement `fib(n)` returning the n-th Fibonacci number, with\n"
            "`fib(0) = 0` and `fib(1) = 1`.\n"
        ),
    },
}


# Each student's submission for each assignment. Empty string ⇒ falls back
# to the starter code (so the student "hasn't started yet"). Mix of fully
# correct, partially correct, buggy, and untouched submissions, so the
# gradebook isn't all green.
DEMO_SUBMISSIONS: dict[str, dict[str, str]] = {
    # Aiden — strong student
    DEMO_STUDENT_IDS[0]: {
        "fizzbuzz/fizzbuzz.py": (
            "def fizzbuzz(n: int) -> str:\n"
            "    if n % 15 == 0:\n"
            "        return 'FizzBuzz'\n"
            "    if n % 3 == 0:\n"
            "        return 'Fizz'\n"
            "    if n % 5 == 0:\n"
            "        return 'Buzz'\n"
            "    return str(n)\n"
        ),
        "palindrome/palindrome.py": (
            "def is_palindrome(s: str) -> bool:\n"
            "    cleaned = ''.join(c.lower() for c in s if c.isalpha())\n"
            "    return cleaned == cleaned[::-1]\n"
        ),
        "fibonacci/fibonacci.py": (
            "def fib(n: int) -> int:\n"
            "    a, b = 0, 1\n"
            "    for _ in range(n):\n"
            "        a, b = b, a + b\n"
            "    return a\n"
        ),
    },
    # Bea — partial: FizzBuzz works, palindrome buggy, fibonacci empty
    DEMO_STUDENT_IDS[1]: {
        "fizzbuzz/fizzbuzz.py": (
            "def fizzbuzz(n: int) -> str:\n"
            "    if n % 3 == 0 and n % 5 == 0:\n"
            "        return 'FizzBuzz'\n"
            "    elif n % 3 == 0:\n"
            "        return 'Fizz'\n"
            "    elif n % 5 == 0:\n"
            "        return 'Buzz'\n"
            "    else:\n"
            "        return str(n)\n"
        ),
        "palindrome/palindrome.py": (
            "def is_palindrome(s: str) -> bool:\n"
            "    # forgot to ignore case + punctuation\n"
            "    return s == s[::-1]\n"
        ),
    },
    # Casey — only attempted FizzBuzz, but with a bug
    DEMO_STUDENT_IDS[2]: {
        "fizzbuzz/fizzbuzz.py": (
            "def fizzbuzz(n: int) -> str:\n"
            "    if n % 3 == 0:\n"
            "        return 'Fizz'\n"
            "    if n % 5 == 0:\n"
            "        return 'Buzz'\n"
            "    # forgot to handle multiples of 15\n"
            "    return str(n)\n"
        ),
    },
    # Diego — attempted everything, all working
    DEMO_STUDENT_IDS[3]: {
        "fizzbuzz/fizzbuzz.py": (
            "def fizzbuzz(n: int) -> str:\n"
            "    out = ''\n"
            "    if n % 3 == 0: out += 'Fizz'\n"
            "    if n % 5 == 0: out += 'Buzz'\n"
            "    return out or str(n)\n"
        ),
        "palindrome/palindrome.py": (
            "import string\n"
            "\n"
            "def is_palindrome(s: str) -> bool:\n"
            "    letters = [c.lower() for c in s if c in string.ascii_letters]\n"
            "    return letters == letters[::-1]\n"
        ),
        "fibonacci/fibonacci.py": (
            "def fib(n: int) -> int:\n"
            "    if n < 2:\n"
            "        return n\n"
            "    return fib(n - 1) + fib(n - 2)\n"
        ),
    },
    # Eleanor — hasn't started any of them
    DEMO_STUDENT_IDS[4]: {},
}


# Test results matching the submissions above. Hardcoded so the gradebook
# is deterministic without actually running pytest at seed time. Each
# template's ``test_*.py`` declares 4 test cases.
TESTS_PER_TEMPLATE = {
    "fizzbuzz": 4,
    "palindrome": 4,
    "fibonacci": 3,
}

DEMO_TEST_RESULTS: dict[str, dict[str, int]] = {
    DEMO_STUDENT_IDS[0]: {"fizzbuzz": 4, "palindrome": 4, "fibonacci": 3},
    DEMO_STUDENT_IDS[1]: {"fizzbuzz": 4, "palindrome": 2, "fibonacci": 0},
    DEMO_STUDENT_IDS[2]: {"fizzbuzz": 3, "palindrome": 0, "fibonacci": 0},
    DEMO_STUDENT_IDS[3]: {"fizzbuzz": 4, "palindrome": 4, "fibonacci": 3},
    DEMO_STUDENT_IDS[4]: {"fizzbuzz": 0, "palindrome": 0, "fibonacci": 0},
}


def _ensure_demo_user(
    db: Session, user_id: str, email: str, name: str, role: str
) -> User:
    user = db.get(User, user_id)
    if user:
        return user
    user = User(
        id=user_id,
        email=email,
        name=name,
        avatar_url=None,
        role=role,
        # Demo users never get containers, so port allocation is irrelevant.
        port_start=0,
        port_end=0,
    )
    db.add(user)
    return user


def _write_demo_files(classrooms_root: str) -> None:
    """Mirror DEMO_ASSIGNMENTS and DEMO_SUBMISSIONS to disk so the existing
    student-file endpoint shape works unchanged. Idempotent: writes only when
    the file is missing, so a re-seed doesn't clobber files an admin tweaked
    by hand on a running system.
    """
    base = os.path.join(classrooms_root, DEMO_CLASSROOM_ID)
    assignments_dir = os.path.join(base, "assignments")
    participants_dir = os.path.join(base, "participants")
    drafts_dir = os.path.join(base, "drafts")

    try:
        os.makedirs(assignments_dir, exist_ok=True)
        os.makedirs(participants_dir, exist_ok=True)
        os.makedirs(drafts_dir, exist_ok=True)
    except PermissionError:
        logger.warning(
            "Demo seed: cannot create classroom dirs under %s (permission denied)",
            base,
        )
        return

    # Templates.
    for template, files in DEMO_ASSIGNMENTS.items():
        tdir = os.path.join(assignments_dir, template)
        os.makedirs(tdir, exist_ok=True)
        for filename, content in files.items():
            fpath = os.path.join(tdir, filename)
            if os.path.exists(fpath):
                continue
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)

    # Drafts (instructor-only in the real app; demo shows them to anyone).
    for draft, files in DEMO_DRAFTS.items():
        ddir = os.path.join(drafts_dir, draft)
        os.makedirs(ddir, exist_ok=True)
        for filename, content in files.items():
            fpath = os.path.join(ddir, filename)
            if os.path.exists(fpath):
                continue
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)

    # Per-participant submissions. Every participant gets a copy of every
    # assignment (matching the real join flow), then any submitted files
    # overwrite the starter code.
    for student_id, _name, email in DEMO_STUDENTS:
        sanitized = email.replace("/", "_")
        student_dir = os.path.join(participants_dir, sanitized)
        os.makedirs(student_dir, exist_ok=True)
        for template, files in DEMO_ASSIGNMENTS.items():
            tdir = os.path.join(student_dir, template)
            os.makedirs(tdir, exist_ok=True)
            for filename, content in files.items():
                fpath = os.path.join(tdir, filename)
                if not os.path.exists(fpath):
                    with open(fpath, "w", encoding="utf-8") as fh:
                        fh.write(content)
        # Apply submission overrides (only files the student actually edited).
        for relpath, content in DEMO_SUBMISSIONS.get(student_id, {}).items():
            fpath = os.path.join(student_dir, relpath)
            os.makedirs(os.path.dirname(fpath), exist_ok=True)
            with open(fpath, "w", encoding="utf-8") as fh:
                fh.write(content)


def seed_demo_classroom(engine, classrooms_root: str) -> None:
    """Idempotent: safe to call on every startup.

    Creates the demo Classroom row, fake instructor and 5 fake participants,
    membership rows, varied test results, and writes assignment files to
    disk. No-op if the Classroom row already exists (we don't try to repair
    drift — admins can delete the classroom row to force a re-seed)."""
    with Session(engine) as db:
        existing = db.get(Classroom, DEMO_CLASSROOM_ID)

        if existing is None:
            classroom = Classroom(
                id=DEMO_CLASSROOM_ID,
                name="CS 101 — Demo classroom",
                access_code=DEMO_ACCESS_CODE,
                created_by=DEMO_INSTRUCTOR_ID,
                created_at=datetime.utcnow() - timedelta(days=14),
                joins_paused=True,  # Cosmetic; nobody can join anyway.
                grading_mode="equal",
            )
            db.add(classroom)

            _ensure_demo_user(
                db, DEMO_INSTRUCTOR_ID,
                DEMO_INSTRUCTOR_EMAIL, DEMO_INSTRUCTOR_NAME, "teacher",
            )
            for sid, name, email in DEMO_STUDENTS:
                _ensure_demo_user(db, sid, email, name, "student")

            db.flush()

            # Membership rows.
            db.add(ClassroomMember(
                classroom_id=DEMO_CLASSROOM_ID,
                user_id=DEMO_INSTRUCTOR_ID,
                role="instructor",
                joined_at=datetime.utcnow() - timedelta(days=14),
            ))
            for i, (sid, _name, _email) in enumerate(DEMO_STUDENTS):
                db.add(ClassroomMember(
                    classroom_id=DEMO_CLASSROOM_ID,
                    user_id=sid,
                    role="participant",
                    joined_at=datetime.utcnow() - timedelta(days=12 - i),
                ))

            # Hardcoded test results.
            for sid, results in DEMO_TEST_RESULTS.items():
                for template, passed in results.items():
                    db.add(TestResult(
                        classroom_id=DEMO_CLASSROOM_ID,
                        user_id=sid,
                        template_name=template,
                        tests_passed=passed,
                        tests_total=TESTS_PER_TEMPLATE[template],
                        last_run=datetime.utcnow() - timedelta(hours=3),
                    ))

            # No weights — grading_mode="equal" doesn't need them. They'd be
            # added if we ever switch the demo to "weighted".
            _ = AssignmentWeight  # keep import explicit

            db.commit()
            logger.info("Seeded demo classroom %s", DEMO_CLASSROOM_ID)
        else:
            logger.debug("Demo classroom %s already seeded", DEMO_CLASSROOM_ID)

    # Always write/repair files (cheap — only writes when missing).
    _write_demo_files(classrooms_root)


def get_demo_user(db: Session, user_id: str) -> Optional[User]:
    """Helper for the demo router: only returns a user if they're a member
    of the demo classroom. Prevents the public router from leaking info
    about real accounts even if someone passes a real user ID."""
    member = db.exec(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == DEMO_CLASSROOM_ID,
            ClassroomMember.user_id == user_id,
        )
    ).first()
    if not member:
        return None
    return db.get(User, user_id)
