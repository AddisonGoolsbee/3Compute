"""Constants for the public read-only demo classroom.

The demo is fully ephemeral: every response in ``routers/demo.py`` is
built directly from the dicts in this file. No DB rows, no disk writes,
no startup side effects. That keeps the demo isolated from the rest of
the app — nothing it does can take a connection-pool slot, hold a write
lock, or interact with real classroom data.
"""
from typing import Optional


# Stable, well-known IDs. Never auto-generated, so the demo URLs are
# deterministic.
DEMO_CLASSROOM_ID = "00000000-0000-0000-0000-000000000d3a"  # "demo classroom anchor"
DEMO_CLASSROOM_NAME = "CS 101 — Demo classroom"
DEMO_GRADING_MODE = "equal"

DEMO_INSTRUCTOR_ID = "demo-instructor"
DEMO_INSTRUCTOR_EMAIL = "ms-rivera@csroom.demo"
DEMO_INSTRUCTOR_NAME = "Ms. Rivera"

DEMO_STUDENT_IDS = [
    "demo-student-1",
    "demo-student-2",
    "demo-student-3",
    "demo-student-4",
    "demo-student-5",
]
DEMO_ACCESS_CODE = "DEMO00"  # Visible in UI; meaningless because no one can join.

# (id, name, email)
DEMO_STUDENTS: list[tuple[str, str, str]] = [
    (DEMO_STUDENT_IDS[0], "Aiden Park", "aiden.park@csroom.demo"),
    (DEMO_STUDENT_IDS[1], "Bea Okafor", "bea.okafor@csroom.demo"),
    (DEMO_STUDENT_IDS[2], "Casey Tran", "casey.tran@csroom.demo"),
    (DEMO_STUDENT_IDS[3], "Diego Alvarez", "diego.alvarez@csroom.demo"),
    (DEMO_STUDENT_IDS[4], "Eleanor Cho", "eleanor.cho@csroom.demo"),
]


# A sample draft assignment so the demo Assignments tab shows what an
# in-progress (unpublished) assignment looks like alongside the published
# ones.
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


# Three Python assignments. Each one ships with starter code for the
# student to fill in, plus a ``test_*.py`` that exercises it.
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


# Each student's submission for each assignment. Keyed by ``template/file``
# (the same path the file endpoints accept). Missing keys ⇒ the student
# hasn't touched that file, so we fall back to the assignment's starter
# code. Mix of fully correct, partially correct, buggy, and untouched, so
# the gradebook isn't all green.
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


# Hardcoded test results matching the submissions above. Each template's
# ``test_*.py`` declares the count below.
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


def student_file_content(student_id: str, rel_path: str) -> Optional[str]:
    """Return the content the demo should serve for a student's file.

    Mirrors how a real classroom works: each student starts with a copy
    of every assignment's starter code, then their submitted edits
    overwrite specific files. So we look in ``DEMO_SUBMISSIONS`` first
    (the student's own version), then fall back to ``DEMO_ASSIGNMENTS``
    (the unedited starter)."""
    submission = DEMO_SUBMISSIONS.get(student_id, {}).get(rel_path)
    if submission is not None:
        return submission
    parts = rel_path.split("/", 1)
    if len(parts) != 2:
        return None
    template, file_name = parts
    return DEMO_ASSIGNMENTS.get(template, {}).get(file_name)
