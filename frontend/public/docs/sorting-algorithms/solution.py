"""
Sorting and Searching Algorithms - REFERENCE SOLUTION
======================================================

This file contains complete implementations of all five functions.
It is intended for instructor reference only.

Students should work from:
    frontend/public/templateProjects/Sorting-Algorithms/main.py
"""

import time
import random


# =============================================================================
# PROVIDED HELPERS (identical to main.py)
# =============================================================================

def time_algorithm(func, data):
    """Measure how long func(data) takes to run. Returns elapsed time in seconds."""
    start = time.perf_counter()
    func(data)
    end = time.perf_counter()
    return end - start


def generate_test_data(n, seed=42):
    """Generate a list of n random integers in [0, 10*n] with a fixed seed."""
    rng = random.Random(seed)
    return [rng.randint(0, 10 * n) for _ in range(n)]


# =============================================================================
# SOLUTION #1: BUBBLE SORT
# =============================================================================

def bubble_sort(lst):
    """
    Sort a list using bubble sort. Returns a new sorted list.

    Time complexity:  O(n^2) average and worst case, O(n) best case
    Space complexity: O(n) for the copy; O(1) additional
    """
    result = lst.copy()
    n = len(result)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if result[j] > result[j + 1]:
                result[j], result[j + 1] = result[j + 1], result[j]
    return result


# =============================================================================
# SOLUTION #2: INSERTION SORT
# =============================================================================

def insertion_sort(lst):
    """
    Sort a list using insertion sort. Returns a new sorted list.

    Time complexity:  O(n^2) average and worst case, O(n) best case (already sorted)
    Space complexity: O(n) for the copy; O(1) additional
    """
    result = lst.copy()
    for i in range(1, len(result)):
        key = result[i]
        j = i - 1
        while j >= 0 and result[j] > key:
            result[j + 1] = result[j]
            j -= 1
        result[j + 1] = key
    return result


# =============================================================================
# SOLUTION #3: MERGE SORT
# =============================================================================

def merge_sort(lst):
    """
    Sort a list using merge sort (recursive). Returns a new sorted list.

    Time complexity:  O(n log n) in all cases
    Space complexity: O(n) for the merged output at each level
    """
    # Base case: a list of 0 or 1 elements is already sorted
    if len(lst) <= 1:
        return lst[:]

    # Divide
    mid = len(lst) // 2
    left = merge_sort(lst[:mid])
    right = merge_sort(lst[mid:])

    # Merge
    merged = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    # Append whatever remains in either half
    merged.extend(left[i:])
    merged.extend(right[j:])

    return merged


# =============================================================================
# SOLUTION #4: LINEAR SEARCH
# =============================================================================

def linear_search(lst, target):
    """
    Search for target by scanning left to right.
    Returns the index of the first occurrence, or -1 if not found.

    Time complexity:  O(n)
    Space complexity: O(1)
    Precondition:     None (works on any list)
    """
    for i, value in enumerate(lst):
        if value == target:
            return i
    return -1


# =============================================================================
# SOLUTION #5: BINARY SEARCH (iterative)
# =============================================================================

def binary_search(lst, target):
    """
    Search for target in a sorted list using iterative binary search.
    Returns an index where target appears, or -1 if not found.

    Time complexity:  O(log n)
    Space complexity: O(1)
    Precondition:     lst must be sorted in ascending order
    """
    low = 0
    high = len(lst) - 1

    while low <= high:
        mid = (low + high) // 2
        if lst[mid] == target:
            return mid
        elif lst[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1


# =============================================================================
# SELF-VERIFICATION
# =============================================================================

if __name__ == "__main__":
    print("Running solution self-check...")
    errors = 0

    def verify(label, got, expected):
        global errors
        if got == expected:
            print(f"  OK  {label}")
        else:
            print(f"  FAIL {label}")
            print(f"       Expected: {expected!r}")
            print(f"       Got:      {got!r}")
            errors += 1

    probe = [5, 3, 1, 4, 2]
    expected_sorted = [1, 2, 3, 4, 5]

    verify("bubble_sort",    bubble_sort(probe),    expected_sorted)
    verify("insertion_sort", insertion_sort(probe), expected_sorted)
    verify("merge_sort",     merge_sort(probe),     expected_sorted)

    verify("bubble_sort empty",    bubble_sort([]),    [])
    verify("insertion_sort empty", insertion_sort([]), [])
    verify("merge_sort empty",     merge_sort([]),     [])

    # Confirm originals are not modified
    original = [3, 1, 2]
    bubble_sort(original)
    verify("bubble_sort does not modify original", original, [3, 1, 2])
    insertion_sort(original)
    verify("insertion_sort does not modify original", original, [3, 1, 2])
    merge_sort(original)
    verify("merge_sort does not modify original", original, [3, 1, 2])

    verify("linear_search found",     linear_search([10, 30, 20, 40], 20), 2)
    verify("linear_search not found", linear_search([10, 30, 20, 40], 99), -1)
    verify("linear_search empty",     linear_search([], 5), -1)
    verify("linear_search first",     linear_search([7, 2, 5, 8], 7), 0)
    verify("linear_search last",      linear_search([7, 2, 5, 8], 8), 3)

    verify("binary_search found",     binary_search([10, 20, 30, 40, 50], 30), 2)
    verify("binary_search not found", binary_search([10, 20, 30, 40, 50], 99), -1)
    verify("binary_search empty",     binary_search([], 5), -1)
    verify("binary_search first",     binary_search([10, 20, 30, 40, 50], 10), 0)
    verify("binary_search last",      binary_search([10, 20, 30, 40, 50], 50), 4)

    print()
    if errors == 0:
        print("All checks passed.")
    else:
        print(f"{errors} check(s) failed.")
