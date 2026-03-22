"""
Test Suite: Debugging Workshop
===============================

Run this file to see which functions are working and which have bugs:

    python test_programs.py

Each test prints a checkmark (✅) if it passes or an X (❌) if it fails.
A summary at the end shows your total score.

Once you fix a bug in buggy_programs.py, re-run this file to confirm.
"""

from buggy_programs import (
    calculate_grade,
    count_vowels,
    find_max,
    reverse_words,
    is_prime,
)

passed = 0
failed = 0


def check(label: str, got, expected):
    """Helper: compare got vs expected and print result."""
    global passed, failed
    if got == expected:
        print(f"  ✅ {label}")
        passed += 1
    else:
        print(f"  ❌ {label}")
        print(f"       expected: {repr(expected)}")
        print(f"       got:      {repr(got)}")
        failed += 1


def check_raises(label: str, func, *args, exception=Exception):
    """Helper: confirm that func(*args) raises the expected exception."""
    global passed, failed
    try:
        result = func(*args)
        print(f"  ❌ {label}")
        print(f"       expected exception {exception.__name__}, but got: {repr(result)}")
        failed += 1
    except exception:
        print(f"  ✅ {label}")
        passed += 1
    except Exception as e:
        print(f"  ❌ {label}")
        print(f"       expected {exception.__name__}, but raised {type(e).__name__}: {e}")
        failed += 1


# =============================================================================
# TESTS: calculate_grade
# =============================================================================

print("\n--- calculate_grade ---")

check("score 95 -> A",        calculate_grade(95),  "A")
check("score 90 -> A",        calculate_grade(90),  "A")
check("score 89 -> B",        calculate_grade(89),  "B")
check("score 85 -> B",        calculate_grade(85),  "B")
check("score 80 -> B",        calculate_grade(80),  "B")
check("score 79 -> C",        calculate_grade(79),  "C")
check("score 75 -> C",        calculate_grade(75),  "C")
check("score 70 -> C",        calculate_grade(70),  "C")
check("score 69 -> D",        calculate_grade(69),  "D")
check("score 65 -> D",        calculate_grade(65),  "D")
check("score 60 -> D",        calculate_grade(60),  "D")
check("score 59 -> F",        calculate_grade(59),  "F")
check("score 45 -> F",        calculate_grade(45),  "F")
check("score 0  -> F",        calculate_grade(0),   "F")
check("score 100 -> A",       calculate_grade(100), "A")


# =============================================================================
# TESTS: count_vowels
# =============================================================================

print("\n--- count_vowels ---")

check("'hello' -> 2",                    count_vowels("hello"),         2)
check("'HELLO' -> 2 (uppercase)",        count_vowels("HELLO"),         2)
check("'Hello World' -> 3 (mixed case)", count_vowels("Hello World"),   3)
check("'aeiou' -> 5",                    count_vowels("aeiou"),         5)
check("'AEIOU' -> 5",                    count_vowels("AEIOU"),         5)
check("'bcdfg' -> 0 (no vowels)",        count_vowels("bcdfg"),         0)
check("'' -> 0 (empty string)",          count_vowels(""),              0)
check("'Python' -> 1",                   count_vowels("Python"),        1)
check("'Umbrella' -> 3",                 count_vowels("Umbrella"),      3)


# =============================================================================
# TESTS: find_max
# =============================================================================

print("\n--- find_max ---")

check("[3, 1, 4, 1, 5] -> 5",           find_max([3, 1, 4, 1, 5]),     5)
check("[10] -> 10 (single element)",     find_max([10]),                10)
check("[1, 2, 3, 4, 5] -> 5",           find_max([1, 2, 3, 4, 5]),     5)
check("[-1, -5, -3] -> -1 (negatives)", find_max([-1, -5, -3]),        -1)
check("[-10, -2, -8] -> -2 (negatives)",find_max([-10, -2, -8]),       -2)
check("[0, 0, 0] -> 0",                 find_max([0, 0, 0]),           0)
check("[100, 1, 50] -> 100",            find_max([100, 1, 50]),        100)
check_raises("[] raises ValueError",    find_max, [], exception=ValueError)


# =============================================================================
# TESTS: reverse_words
# =============================================================================

print("\n--- reverse_words ---")

check("'hello world' -> 'world hello'",
      reverse_words("hello world"),      "world hello")
check("'one two three' -> 'three two one'",
      reverse_words("one two three"),    "three two one")
check("'python' -> 'python' (single word)",
      reverse_words("python"),           "python")
check("'a b c d' -> 'd c b a'",
      reverse_words("a b c d"),          "d c b a")
check("'the quick brown fox' -> 'fox brown quick the'",
      reverse_words("the quick brown fox"), "fox brown quick the")


# =============================================================================
# TESTS: is_prime
# =============================================================================

print("\n--- is_prime ---")

check("is_prime(2) -> True",   is_prime(2),   True)
check("is_prime(3) -> True",   is_prime(3),   True)
check("is_prime(5) -> True",   is_prime(5),   True)
check("is_prime(7) -> True",   is_prime(7),   True)
check("is_prime(11) -> True",  is_prime(11),  True)
check("is_prime(13) -> True",  is_prime(13),  True)
check("is_prime(1) -> False",  is_prime(1),   False)
check("is_prime(0) -> False",  is_prime(0),   False)
check("is_prime(4) -> False",  is_prime(4),   False)
check("is_prime(9) -> False",  is_prime(9),   False)
check("is_prime(15) -> False", is_prime(15),  False)
check("is_prime(25) -> False", is_prime(25),  False)


# =============================================================================
# SUMMARY
# =============================================================================

total = passed + failed
print(f"\n{'=' * 40}")
print(f"Results: {passed}/{total} tests passed")
if failed == 0:
    print("All tests pass. Nice work.")
else:
    print(f"{failed} test(s) still failing. Keep going.")
print("=" * 40)


# =============================================================================
# YOUR TESTS
# =============================================================================
# Add your own test cases below after you fix each bug.
# Use the same check() helper used above. Examples:
#
#   check("calculate_grade(100) -> A", calculate_grade(100), "A")
#   check("count_vowels('sky') -> 0",  count_vowels("sky"),  0)
#
# Try to think of inputs that are unusual or edge-cases the original tests
# might have missed.

print("\n--- Your Tests ---")

# TODO: Add your test cases here
