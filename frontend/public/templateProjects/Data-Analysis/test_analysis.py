"""
Test suite for the Student Survey Data Analysis project.

Run this file to check your implementations:
    python test_analysis.py

Each test will print PASS or FAIL with a short explanation.
Implement the functions in main.py in order -- later tests depend on
earlier ones working correctly.
"""

import math
from main import load_data, average, group_by, ascii_bar_chart, correlation


# =============================================================================
# TEST RUNNER
# =============================================================================

passed = 0
failed = 0


def check(description, condition, hint=""):
    global passed, failed
    if condition:
        print(f"  PASS  {description}")
        passed += 1
    else:
        msg = f"  FAIL  {description}"
        if hint:
            msg += f"\n        Hint: {hint}"
        print(msg)
        failed += 1


# =============================================================================
# TESTS FOR load_data()
# =============================================================================

print("\n--- Testing load_data() ---")

data = load_data("student_survey.csv")

check(
    "load_data returns a list",
    isinstance(data, list),
    "Make sure you return a list, not None or a generator."
)

check(
    "load_data returns 150 rows",
    len(data) == 150,
    f"Expected 150 rows, got {len(data) if data else 'None'}."
)

if data and len(data) == 150:
    first = data[0]

    check(
        "Each row is a dict",
        isinstance(first, dict),
        "csv.DictReader rows are already dicts -- just return them."
    )

    check(
        "grade is an int",
        isinstance(first["grade"], int),
        "Convert grade with int(row['grade'])."
    )

    check(
        "hours_sleep is a float",
        isinstance(first["hours_sleep"], float),
        "Convert hours_sleep with float(row['hours_sleep'])."
    )

    check(
        "hours_screen is a float",
        isinstance(first["hours_screen"], float),
        "Convert hours_screen with float(row['hours_screen'])."
    )

    check(
        "gpa is a float",
        isinstance(first["gpa"], float),
        "Convert gpa with float(row['gpa'])."
    )

    check(
        "gender is a string",
        isinstance(first["gender"], str),
        "gender should stay as a string."
    )

    check(
        "extracurricular is a string",
        isinstance(first["extracurricular"], str),
        "extracurricular should stay as a string ('Yes' or 'No')."
    )

    grades = {r["grade"] for r in data}
    check(
        "grade values are 9, 10, 11, or 12",
        grades == {9, 10, 11, 12},
        f"Found these grade values: {sorted(grades)}"
    )

    genders = {r["gender"] for r in data}
    check(
        "gender values include M, F, Other",
        genders == {"M", "F", "Other"},
        f"Found these gender values: {sorted(genders)}"
    )

    gpa_values = [r["gpa"] for r in data]
    check(
        "all GPA values are between 1.0 and 4.0",
        all(1.0 <= g <= 4.0 for g in gpa_values),
        "Check that GPA conversion is working correctly."
    )


# =============================================================================
# TESTS FOR average()
# =============================================================================

print("\n--- Testing average() ---")

check(
    "average([2.0, 3.0, 4.0]) == 3.0",
    average([2.0, 3.0, 4.0]) == 3.0,
    "Sum is 9.0, count is 3, so mean is 3.0."
)

check(
    "average([10]) == 10.0",
    average([10]) == 10.0,
    "A single-element list should return that element."
)

check(
    "average([]) == 0.0",
    average([]) == 0.0,
    "Return 0.0 for an empty list to avoid division by zero."
)

result = average([1.5, 2.5, 3.5, 4.5])
check(
    "average([1.5, 2.5, 3.5, 4.5]) == 3.0",
    abs(result - 3.0) < 1e-9,
    f"Expected 3.0, got {result}."
)


# =============================================================================
# TESTS FOR group_by()
# =============================================================================

print("\n--- Testing group_by() ---")

if data and len(data) == 150:
    by_grade = group_by(data, "grade")

    check(
        "group_by returns a dict",
        isinstance(by_grade, dict),
        "Return a dict mapping column value -> list of rows."
    )

    check(
        "group_by produces 4 grade groups",
        len(by_grade) == 4,
        f"Expected 4 groups (grades 9-12), got {len(by_grade)}."
    )

    check(
        "all 150 rows appear in grade groups",
        sum(len(v) for v in by_grade.values()) == 150,
        "Every row should appear in exactly one group."
    )

    check(
        "rows in grade 9 group all have grade 9",
        all(r["grade"] == 9 for r in by_grade.get(9, [])),
        "Rows should only appear in their matching group."
    )

    by_gender = group_by(data, "gender")
    check(
        "group_by produces 3 gender groups",
        len(by_gender) == 3,
        f"Expected 3 groups (M, F, Other), got {len(by_gender)}."
    )

    by_extra = group_by(data, "extracurricular")
    check(
        "group_by produces 2 extracurricular groups",
        len(by_extra) == 2,
        f"Expected 2 groups (Yes, No), got {len(by_extra)}."
    )


# =============================================================================
# TESTS FOR ascii_bar_chart()
# =============================================================================

print("\n--- Testing ascii_bar_chart() ---")

# We can't easily test the exact output, so we just verify it doesn't crash
# and that it handles edge cases.

try:
    ascii_bar_chart({"A": 3.5, "B": 2.8, "C": 3.1}, "Test Chart")
    check("ascii_bar_chart runs without error", True)
except Exception as e:
    check("ascii_bar_chart runs without error", False, f"Got exception: {e}")

try:
    ascii_bar_chart({"Only": 0.0}, "Zero values chart")
    check("ascii_bar_chart handles all-zero values", True)
except Exception as e:
    check("ascii_bar_chart handles all-zero values", False, f"Got exception: {e}")

try:
    ascii_bar_chart({}, "Empty chart")
    check("ascii_bar_chart handles empty dict", True)
except Exception as e:
    check("ascii_bar_chart handles empty dict", False, f"Got exception: {e}")


# =============================================================================
# TESTS FOR correlation()
# =============================================================================

print("\n--- Testing correlation() ---")

r_perfect_pos = correlation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
check(
    "perfect positive correlation is ~1.0",
    abs(r_perfect_pos - 1.0) < 1e-6,
    f"Expected ~1.0, got {r_perfect_pos}."
)

r_perfect_neg = correlation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
check(
    "perfect negative correlation is ~-1.0",
    abs(r_perfect_neg - (-1.0)) < 1e-6,
    f"Expected ~-1.0, got {r_perfect_neg}."
)

# [1,2,3] vs [3,1,2]: no linear pattern
r_none = correlation([1, 2, 3], [3, 1, 2])
check(
    "no correlation returns value between -0.5 and 0.5 (inclusive)",
    abs(r_none) <= 0.5,
    f"Expected a value close to 0, got {r_none}."
)

check(
    "correlation of empty lists returns 0.0",
    correlation([], []) == 0.0,
    "Return 0.0 for empty input."
)

check(
    "correlation result is in [-1, 1]",
    -1.0 <= r_perfect_pos <= 1.0 and -1.0 <= r_perfect_neg <= 1.0,
    "Correlation must always be between -1 and 1."
)

# Verify the sleep/GPA correlation is meaningfully positive
if data and len(data) == 150:
    sleep_vals = [r["hours_sleep"] for r in data]
    gpa_vals = [r["gpa"] for r in data]
    r_real = correlation(sleep_vals, gpa_vals)
    check(
        "sleep/GPA correlation on real data is positive (r > 0.5)",
        r_real > 0.5,
        f"Got r = {r_real:.3f}. The dataset is designed to show a strong positive relationship."
    )


# =============================================================================
# SUMMARY
# =============================================================================

print()
print("=" * 60)
print(f"  Results: {passed} passed, {failed} failed")
if failed == 0:
    print("  All tests passed. Run 'python main.py' to see the analysis.")
else:
    print("  Fix the failing tests before running the full analysis.")
print("=" * 60)
