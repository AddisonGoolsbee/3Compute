# Sorting and Searching Algorithms

Implement five classic algorithms, then run the built-in benchmarking tool to compare their performance on lists of 100, 1,000, and 10,000 elements.

## What You'll Learn

- How three fundamentally different sorting strategies work
- Why algorithm choice matters as data grows larger
- How binary search achieves O(log n) time by requiring sorted input
- How to measure real execution time in Python

## Quick Start

1. Open `main.py` and read the docstrings for each TODO function
2. Complete the TODOs in order (1 through 5)
3. Test your work: `python test_sorting.py`
4. Run the performance comparison: `python main.py`

---

## The Algorithms

### Bubble Sort

On each pass through the list, compare every adjacent pair and swap them if they are out of order. The largest unsorted value "bubbles up" to its final position after each pass.

```
One pass through [5, 3, 1, 4]:

  Compare 5, 3  ->  swap  ->  [3, 5, 1, 4]
  Compare 5, 1  ->  swap  ->  [3, 1, 5, 4]
  Compare 5, 4  ->  swap  ->  [3, 1, 4, 5]  <- 5 is now in its final position
```

Requires (n - 1) passes, each touching (n - 1 - i) pairs. Fine for tiny lists or teaching; slow on anything larger.

### Insertion Sort

Think of sorting playing cards in your hand. Pick up one card at a time and slide it left until it sits in the right spot among the cards you are already holding.

```
Sorting [4, 2, 3, 1]:

  Start:          [4]  |  2, 3, 1
  Insert 2:   [2, 4]  |  3, 1
  Insert 3:  [2, 3, 4]  |  1
  Insert 1: [1, 2, 3, 4]
```

Performs well when the list is small or nearly sorted because most elements barely move.

### Merge Sort

Divide the list in half, recursively sort each half, then merge the two sorted halves back together. The merge step walks through both halves simultaneously, always taking the smaller front element.

```
merge_sort([4, 2, 3, 1])
    merge_sort([4, 2])              merge_sort([3, 1])
        merge_sort([4])  merge_sort([2])   ...
        merge([4], [2]) -> [2, 4]         -> [1, 3]
    merge([2, 4], [1, 3]) -> [1, 2, 3, 4]
```

Consistently fast regardless of input order. The recursion is the tricky part.

### Linear Search

Scan the list from left to right and return the index the moment you find the target. If you reach the end without finding it, return -1. Works on any list, sorted or not.

### Binary Search

Works only on a **sorted** list. Look at the middle element: if it matches the target, return its index. If the target is smaller, search the left half. If the target is larger, search the right half. Repeat until found or the search range is empty.

```
Searching for 30 in [10, 20, 30, 40, 50]:

  low=0, high=4  ->  mid=2  ->  list[2] = 30  ->  found at index 2

Searching for 25 in [10, 20, 30, 40, 50]:

  low=0, high=4  ->  mid=2  ->  list[2] = 30  ->  too high, high=1
  low=0, high=1  ->  mid=0  ->  list[0] = 10  ->  too low,  low=1
  low=1, high=1  ->  mid=1  ->  list[1] = 20  ->  too low,  low=2
  low=2 > high=1  ->  not found, return -1
```

---

## Big-O Complexity

| Algorithm       | Best Case  | Average Case | Worst Case | Space  |
|-----------------|-----------|--------------|------------|--------|
| Bubble Sort     | O(n)      | O(n^2)       | O(n^2)     | O(1)   |
| Insertion Sort  | O(n)      | O(n^2)       | O(n^2)     | O(1)   |
| Merge Sort      | O(n log n)| O(n log n)   | O(n log n) | O(n)   |
| Linear Search   | O(1)      | O(n)         | O(n)       | O(1)   |
| Binary Search   | O(1)      | O(log n)     | O(log n)   | O(1)   |

**Reading the table:**

- O(n^2) means: if the list doubles in size, the work roughly quadruples.
- O(n log n) means: roughly linear, with a small logarithmic multiplier.
- O(log n) means: each step eliminates half the remaining candidates.

---

## When to Use Each

| Algorithm      | Use when...                                                     |
|----------------|-----------------------------------------------------------------|
| Bubble Sort    | Learning about sorting; never in production code                |
| Insertion Sort | Input is small (under ~50 elements) or nearly sorted            |
| Merge Sort     | General-purpose sorting; input order is unknown                 |
| Linear Search  | List is unsorted, or small enough that sorting first isn't worth it |
| Binary Search  | List is already sorted and you need fast repeated lookups       |

---

## Iterative vs. Recursive Binary Search

The version you implement here is **iterative**: it uses a while loop and two
index pointers. A recursive version calls itself on the smaller half each time.

Both produce the same result. The tradeoff:

- **Iterative** is slightly harder to read at first, but uses O(1) extra space
  because it does not add stack frames.
- **Recursive** reads more naturally as a direct expression of the algorithm,
  but adds one stack frame per step. For a list of one million elements, that
  is only about 20 recursive calls, so in practice this rarely matters.

---

## Your Tasks

Open `main.py` and complete these functions in order:

### TODO #1: `bubble_sort(lst)`

Use two nested loops. The outer loop counts passes. The inner loop walks
through pairs. Swap adjacent elements that are out of order. Return a new list.

### TODO #2: `insertion_sort(lst)`

Loop from index 1 to the end. For each element, walk backward through the
sorted portion, shifting elements right until you find the insertion point.
Return a new list.

### TODO #3: `merge_sort(lst)`

Handle the base case (list of 0 or 1 elements) first. Then split, recurse
on each half, and merge the two sorted halves. Return a new list.

### TODO #4: `linear_search(lst, target)`

Loop through the list. Return the index the first time you find the target.
Return -1 if the loop finishes without a match.

### TODO #5: `binary_search(lst, target)`

Use `low` and `high` pointers. In each iteration, check the midpoint. Narrow
the range left or right depending on the comparison. Return -1 if the range
becomes empty.

---

## Testing Your Implementation

```bash
python test_sorting.py
```

You should see:
- ✅ for each passing test
- ❌ for each failing test, with what was expected and what your function returned

Once all tests pass, run the benchmark:

```bash
pip install -r requirements.txt
python main.py
```

---

## Reflection Questions

1. Look at the timing table. At what input size does the O(n^2) cost of bubble
   sort become clearly visible compared to merge sort?

2. Insertion sort and bubble sort have the same Big-O, but insertion sort is
   usually faster in practice. Why might that be?

3. Binary search requires a sorted list. If you only need to search once, is
   it worth sorting first? What if you need to search thousands of times?

4. Merge sort always takes O(n) extra space. Is that a problem? Can you think
   of a situation where memory is so constrained that it matters?

5. Python's built-in `sorted()` uses Timsort, which is a hybrid of merge sort
   and insertion sort. Why would combining them be useful?

---

## Extension Challenges

### 🟢 Easy: Early Exit for Bubble Sort

If no swaps occur during a full pass, the list is already sorted and you can
stop early. Add a boolean flag `swapped` to your bubble sort loop. When
`swapped` stays False after a full pass, break out of the outer loop. Measure
whether this speeds things up on an already-sorted list.

### 🟢 Easy: Recursive Binary Search

Write a second version of binary search that is recursive instead of iterative.
Compare the two implementations for readability.

### 🟡 Medium: Quicksort

Implement quicksort: choose a pivot element, partition the list so all smaller
elements come before the pivot and all larger elements come after, then
recursively sort each partition. Add it to the benchmark and compare it against
merge sort.

### 🟡 Medium: Visualize Sorting Steps

Modify one of your sorting functions to print the list after every swap or
insertion. Use a small list (8-10 elements) so the output is readable. This
makes the algorithm's behavior concrete.

### 🔴 Hard: Sort Stability

A sort is "stable" if equal elements keep their original relative order. Write
a test that proves whether your sorts are stable: create a list of tuples like
`[(1, 'a'), (1, 'b'), (2, 'c')]` where the first element is the sort key and
the second is a label. After sorting by the first element, do the two `1`
entries appear in their original order?

---

## Troubleshooting

**Tests fail with `None` returned**
Your function is hitting the `pass` statement. Make sure you removed `pass` and
that your function has a `return` statement.

**Original list is being modified**
Make sure you call `lst.copy()` at the start of your sort functions before
making any changes.

**Merge sort returns the wrong result**
Check your merge step carefully. Walk through a small example by hand:
`left = [1, 3]`, `right = [2, 4]`. What does your merge produce?

**Binary search returns wrong index or loops forever**
Check that `low = mid + 1` (not `mid`) and `high = mid - 1` (not `mid`).
If you use `mid` instead of `mid + 1` or `mid - 1`, the range never shrinks
and the loop runs forever.

**Recursion error in merge sort**
Make sure your base case returns before the recursive calls. If `len(lst) <= 1`
is not the very first check, you may recurse infinitely on empty sublists.
