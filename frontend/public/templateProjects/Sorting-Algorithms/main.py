"""
Sorting and Searching Algorithms
=================================

In this project, you'll implement three classic sorting algorithms and two
search algorithms. Once all five are working, a provided benchmarking function
will run them against lists of different sizes so you can compare their
real-world performance.

YOUR TASKS (complete in order):
1. bubble_sort(lst)    - sort using nested loops and swapping
2. insertion_sort(lst) - build a sorted portion one element at a time
3. merge_sort(lst)     - recursive divide-and-conquer sort
4. linear_search(lst, target)  - scan from left to right
5. binary_search(lst, target)  - iterative halving search (requires sorted input)

Run the tests to check your work: python test_sorting.py
"""

import time
import random


# =============================================================================
# PROVIDED HELPERS
# =============================================================================

def time_algorithm(func, data):
    """
    Measure how long func(data) takes to run.

    Args:
        func: A sorting or searching function
        data: The list to pass as the argument

    Returns:
        Elapsed time in seconds (float)
    """
    start = time.perf_counter()
    func(data)
    end = time.perf_counter()
    return end - start


def generate_test_data(n, seed=42):
    """
    Generate a list of n random integers in the range [0, 10*n].

    Args:
        n:    How many integers to generate
        seed: Random seed for reproducibility (default 42)

    Returns:
        A list of n integers
    """
    rng = random.Random(seed)
    return [rng.randint(0, 10 * n) for _ in range(n)]


# =============================================================================
# TODO #1: BUBBLE SORT
# =============================================================================

def bubble_sort(lst):
    """
    Sort a list using bubble sort and return the sorted result.

    Bubble sort works by repeatedly stepping through the list and swapping
    adjacent elements that are in the wrong order. After each full pass,
    the largest unsorted element has "bubbled up" to its correct position.

    Args:
        lst: A list of comparable elements (do not modify the original)

    Returns:
        A new sorted list

    Example:
        bubble_sort([3, 1, 2]) -> [1, 2, 3]

    HINT: Make a copy first so you don't change the original:
        result = lst.copy()

    HINT: Use two nested loops.
        - Outer loop: repeat (len(result) - 1) times
        - Inner loop: walk through pairs from index 0 to the last unsorted position
        - If result[j] > result[j+1], swap them

    HINT: One pass of bubble sort on [5, 3, 1, 4]:
        Compare 5 and 3 -> swap -> [3, 5, 1, 4]
        Compare 5 and 1 -> swap -> [3, 1, 5, 4]
        Compare 5 and 4 -> swap -> [3, 1, 4, 5]  <- 5 is now in place
    """
    # TODO: Make a copy of lst so the original is not modified
    # result = lst.copy()

    # TODO: Outer loop - how many passes do you need?
    # for i in range(len(result) - 1):

        # TODO: Inner loop - compare adjacent pairs
        # The last i elements are already in place after i passes
        # for j in range(len(result) - 1 - i):

            # TODO: Swap if out of order
            # if result[j] > result[j + 1]:
            #     result[j], result[j + 1] = result[j + 1], result[j]

    # TODO: Return the sorted copy
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: INSERTION SORT
# =============================================================================

def insertion_sort(lst):
    """
    Sort a list using insertion sort and return the sorted result.

    Insertion sort builds a sorted portion at the front of the list, one
    element at a time. For each new element, it slides backward through the
    sorted portion until it finds the right position.

    Think of sorting playing cards in your hand: you pick up one card at a
    time and slide it left until it is in the right spot.

    Args:
        lst: A list of comparable elements (do not modify the original)

    Returns:
        A new sorted list

    Example:
        insertion_sort([4, 2, 3, 1]) -> [1, 2, 3, 4]

    HINT: Make a copy first:
        result = lst.copy()

    HINT: Loop from index 1 to the end.
        - Save result[i] as the "key" (the card you just picked up)
        - Walk backward from i-1, shifting elements right while they are
          greater than the key
        - Drop the key into the gap that opens up
    """
    # TODO: Make a copy of lst
    # result = lst.copy()

    # TODO: Loop from the second element to the end
    # for i in range(1, len(result)):

        # TODO: Save the current element
        # key = result[i]
        # j = i - 1

        # TODO: Shift larger elements one position to the right
        # while j >= 0 and result[j] > key:
        #     result[j + 1] = result[j]
        #     j -= 1

        # TODO: Place the key in its correct position
        # result[j + 1] = key

    # TODO: Return the sorted copy
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #3: MERGE SORT
# =============================================================================

def merge_sort(lst):
    """
    Sort a list using merge sort and return the sorted result.

    Merge sort is a divide-and-conquer algorithm:
      1. Divide the list in half
      2. Recursively sort each half
      3. Merge the two sorted halves into one sorted list

    The base case is a list of 0 or 1 elements, which is already sorted.

    Args:
        lst: A list of comparable elements

    Returns:
        A new sorted list

    Example:
        merge_sort([4, 2, 3, 1]) -> [1, 2, 3, 4]

    HINT: Base case - return immediately if the list has 0 or 1 elements.

    HINT: Split the list at the midpoint:
        mid = len(lst) // 2
        left = merge_sort(lst[:mid])
        right = merge_sort(lst[mid:])

    HINT: Merge two sorted lists by repeatedly taking the smaller front element.
        Use index variables i and j to track your position in each half.
        When one half runs out, append the remainder of the other.
    """
    # TODO: Base case - list of 0 or 1 elements is already sorted
    # if len(lst) <= 1:
    #     return lst.copy()   # or just: return lst[:]

    # TODO: Find the midpoint and recursively sort each half
    # mid = len(lst) // 2
    # left = merge_sort(lst[:mid])
    # right = merge_sort(lst[mid:])

    # TODO: Merge the two sorted halves
    # merged = []
    # i = 0
    # j = 0
    # while i < len(left) and j < len(right):
    #     if left[i] <= right[j]:
    #         merged.append(left[i])
    #         i += 1
    #     else:
    #         merged.append(right[j])
    #         j += 1

    # TODO: Append whatever is left in either half
    # merged.extend(left[i:])
    # merged.extend(right[j:])

    # TODO: Return the merged result
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: LINEAR SEARCH
# =============================================================================

def linear_search(lst, target):
    """
    Search for target in lst by checking each element from left to right.

    Args:
        lst:    A list of elements
        target: The value to find

    Returns:
        The index of the first occurrence of target, or -1 if not found

    Example:
        linear_search([10, 30, 20, 40], 20) -> 2
        linear_search([10, 30, 20, 40], 99) -> -1

    HINT: A simple for loop with enumerate is clean here.
          Alternatively, loop with range(len(lst)).
    """
    # TODO: Loop through each element
    # for i, value in enumerate(lst):
    #     if value == target:
    #         return i

    # TODO: Return -1 if the loop finishes without finding target
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #5: BINARY SEARCH
# =============================================================================

def binary_search(lst, target):
    """
    Search for target in a SORTED list using binary search (iterative).

    Binary search works by repeatedly halving the search range:
      - Look at the middle element
      - If it equals target, return the index
      - If it is too large, search the left half
      - If it is too small, search the right half
      - If the range is empty, target is not present

    IMPORTANT: The input list must already be sorted. Calling binary_search
    on an unsorted list can produce incorrect results.

    Args:
        lst:    A sorted list of comparable elements
        target: The value to find

    Returns:
        An index where target appears, or -1 if not found

    Example:
        binary_search([10, 20, 30, 40, 50], 30) -> 2
        binary_search([10, 20, 30, 40, 50], 99) -> -1

    HINT: Use two pointers, low and high, to track the current search range.
        low = 0
        high = len(lst) - 1

    HINT: Loop while low <= high:
        mid = (low + high) // 2
        - If lst[mid] == target, return mid
        - If lst[mid] < target, the target must be to the right: low = mid + 1
        - If lst[mid] > target, the target must be to the left: high = mid - 1
    """
    # TODO: Set up the search range
    # low = 0
    # high = len(lst) - 1

    # TODO: Loop while there is still a range to search
    # while low <= high:

        # TODO: Find the midpoint
        # mid = (low + high) // 2

        # TODO: Check the middle element
        # if lst[mid] == target:
        #     return mid
        # elif lst[mid] < target:
        #     low = mid + 1
        # else:
        #     high = mid - 1

    # TODO: Target was not found
    pass  # Remove this line when you implement the function


# =============================================================================
# PROVIDED: BENCHMARKING AND COMPARISON (runs when you execute this file)
# =============================================================================

def main():
    sizes = [100, 1000, 10000]
    sorters = [
        ("Bubble Sort",     bubble_sort),
        ("Insertion Sort",  insertion_sort),
        ("Merge Sort",      merge_sort),
    ]

    print("=" * 60)
    print("  SORTING ALGORITHM PERFORMANCE COMPARISON")
    print("=" * 60)
    print(f"{'Algorithm':<18} {'n=100':>10} {'n=1000':>10} {'n=10000':>10}")
    print("-" * 60)

    for name, func in sorters:
        times = []
        for n in sizes:
            data = generate_test_data(n)
            elapsed = time_algorithm(func, data)
            times.append(elapsed)
        row = f"{name:<18}"
        for t in times:
            if t < 0.001:
                row += f"  {t * 1000:.3f} ms".rjust(10)
            else:
                row += f"  {t:.4f} s".rjust(10)
        print(row)

    print()
    print("=" * 60)
    print("  SEARCH ALGORITHM DEMO")
    print("=" * 60)

    demo_data = generate_test_data(20)
    sorted_demo = merge_sort(demo_data) if merge_sort(demo_data) is not None else sorted(demo_data)
    target = sorted_demo[10] if sorted_demo else 0

    print(f"Unsorted data (first 10): {demo_data[:10]}")
    print(f"Sorted data  (first 10): {sorted_demo[:10] if sorted_demo else 'merge_sort not implemented'}")
    print()

    li = linear_search(demo_data, target)
    bi = binary_search(sorted_demo, target) if sorted_demo else -1

    print(f"Searching for: {target}")
    print(f"  linear_search (unsorted): index {li}")
    print(f"  binary_search (sorted):   index {bi}")
    print()
    print("Note: binary_search returns any valid index, not necessarily the")
    print("same index as linear_search, because the lists are in different order.")


if __name__ == "__main__":
    # Check whether the functions have been implemented before running benchmarks
    probe = [3, 1, 2]
    results = {
        "bubble_sort":    bubble_sort(probe),
        "insertion_sort": insertion_sort(probe),
        "merge_sort":     merge_sort(probe),
        "linear_search":  linear_search(probe, 1),
        "binary_search":  binary_search([1, 2, 3], 2),
    }

    not_done = [name for name, val in results.items() if val is None]

    if not_done:
        print("It looks like the following functions are not yet implemented:")
        for name in not_done:
            print(f"  - {name}()")
        print()
        print("Complete the TODOs in main.py, then run this file again.")
        print("Run 'python test_sorting.py' to test each function individually.")
    else:
        main()
