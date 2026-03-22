"""
Test suite for Sorting and Searching Algorithms
================================================

Run this file to check your implementations:
    python test_sorting.py

Each test prints:
    ✅  test description
  or
    ❌  test description
       Expected: ...
       Got:      ...

A summary line at the end shows how many tests passed.
"""

from main import bubble_sort, insertion_sort, merge_sort, linear_search, binary_search

passed = 0
failed = 0


def check(description, got, expected):
    global passed, failed
    if got == expected:
        print(f"  ✅  {description}")
        passed += 1
    else:
        print(f"  ❌  {description}")
        print(f"       Expected: {expected!r}")
        print(f"       Got:      {got!r}")
        failed += 1


def section(title):
    print()
    print(f"--- {title} ---")


# =============================================================================
# BUBBLE SORT
# =============================================================================

section("bubble_sort")

check(
    "sorts a normal list",
    bubble_sort([5, 3, 1, 4, 2]),
    [1, 2, 3, 4, 5],
)

check(
    "empty list returns empty list",
    bubble_sort([]),
    [],
)

check(
    "already-sorted list",
    bubble_sort([1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5],
)

check(
    "reverse-sorted list",
    bubble_sort([5, 4, 3, 2, 1]),
    [1, 2, 3, 4, 5],
)

check(
    "single-element list",
    bubble_sort([42]),
    [42],
)

# Verify original list is not modified
original = [3, 1, 2]
bubble_sort(original)
check(
    "does not modify the original list",
    original,
    [3, 1, 2],
)

check(
    "list with duplicate values",
    bubble_sort([3, 1, 2, 1, 3]),
    [1, 1, 2, 3, 3],
)

# =============================================================================
# INSERTION SORT
# =============================================================================

section("insertion_sort")

check(
    "sorts a normal list",
    insertion_sort([5, 3, 1, 4, 2]),
    [1, 2, 3, 4, 5],
)

check(
    "empty list returns empty list",
    insertion_sort([]),
    [],
)

check(
    "already-sorted list",
    insertion_sort([1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5],
)

check(
    "reverse-sorted list",
    insertion_sort([5, 4, 3, 2, 1]),
    [1, 2, 3, 4, 5],
)

check(
    "single-element list",
    insertion_sort([42]),
    [42],
)

# Verify original list is not modified
original = [3, 1, 2]
insertion_sort(original)
check(
    "does not modify the original list",
    original,
    [3, 1, 2],
)

check(
    "list with duplicate values",
    insertion_sort([3, 1, 2, 1, 3]),
    [1, 1, 2, 3, 3],
)

# =============================================================================
# MERGE SORT
# =============================================================================

section("merge_sort")

check(
    "sorts a normal list",
    merge_sort([5, 3, 1, 4, 2]),
    [1, 2, 3, 4, 5],
)

check(
    "empty list returns empty list",
    merge_sort([]),
    [],
)

check(
    "already-sorted list",
    merge_sort([1, 2, 3, 4, 5]),
    [1, 2, 3, 4, 5],
)

check(
    "reverse-sorted list",
    merge_sort([5, 4, 3, 2, 1]),
    [1, 2, 3, 4, 5],
)

check(
    "single-element list",
    merge_sort([42]),
    [42],
)

# Verify original list is not modified
original = [3, 1, 2]
merge_sort(original)
check(
    "does not modify the original list",
    original,
    [3, 1, 2],
)

check(
    "list with duplicate values",
    merge_sort([3, 1, 2, 1, 3]),
    [1, 1, 2, 3, 3],
)

check(
    "two-element list",
    merge_sort([2, 1]),
    [1, 2],
)

# =============================================================================
# LINEAR SEARCH
# =============================================================================

section("linear_search")

check(
    "finds an element in the middle",
    linear_search([10, 30, 20, 40], 20),
    2,
)

check(
    "returns -1 when element is not present",
    linear_search([10, 30, 20, 40], 99),
    -1,
)

check(
    "empty list returns -1",
    linear_search([], 5),
    -1,
)

check(
    "finds the first element",
    linear_search([7, 2, 5, 8], 7),
    0,
)

check(
    "finds the last element",
    linear_search([7, 2, 5, 8], 8),
    3,
)

check(
    "single-element list - found",
    linear_search([42], 42),
    0,
)

check(
    "single-element list - not found",
    linear_search([42], 99),
    -1,
)

# =============================================================================
# BINARY SEARCH
# =============================================================================

section("binary_search")

check(
    "finds an element in the middle",
    binary_search([10, 20, 30, 40, 50], 30),
    2,
)

check(
    "returns -1 when element is not present",
    binary_search([10, 20, 30, 40, 50], 99),
    -1,
)

check(
    "empty list returns -1",
    binary_search([], 5),
    -1,
)

check(
    "finds the first element",
    binary_search([10, 20, 30, 40, 50], 10),
    0,
)

check(
    "finds the last element",
    binary_search([10, 20, 30, 40, 50], 50),
    4,
)

check(
    "single-element list - found",
    binary_search([42], 42),
    0,
)

check(
    "single-element list - not found",
    binary_search([42], 99),
    -1,
)

check(
    "two-element list - finds second element",
    binary_search([5, 10], 10),
    1,
)

# =============================================================================
# SUMMARY
# =============================================================================

total = passed + failed
print()
print("=" * 40)
print(f"  {passed}/{total} tests passed")
print("=" * 40)

if failed == 0:
    print("All tests passed. Run 'python main.py' to see the performance comparison.")
else:
    print(f"{failed} test(s) failed. Review the output above and check your implementations.")
