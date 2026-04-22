# Sorting and Searching Algorithms

In this project you implement five classic algorithms in Python, then run a benchmarking tool that compares their performance on lists of 100, 1,000, and 10,000 elements. The results make it clear why algorithm choice matters as the input grows.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- How three fundamentally different sorting strategies work
- Why two algorithms with the same Big-O can have very different real-world speeds
- Why binary search is so fast, and why it requires a sorted input
- How to measure execution time in Python

## Setup

Right-click the `Sorting-Algorithms` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies:

```bash
pip install -r requirements.txt
```

Open `main.py` and read the docstring for each TODO function. Implement the TODOs in order (1 through 5). As you work, run the tests:

```bash
python test_sorting.py
```

Once every test passes, run the full benchmark:

```bash
python main.py
```

## What This README Covers

- How bubble sort, insertion sort, merge sort, linear search, and binary search work
- Big-O complexity for each algorithm and what it means in practice
- When to use each algorithm
- Iterative vs recursive binary search trade-offs
- The five functions you will implement
- Reflection questions, extension challenges, and troubleshooting

## The Algorithms

### Bubble Sort

On each pass through the list, compare every adjacent pair and swap them if they are out of order. The largest unsorted value "bubbles up" to the end of the list each pass.

```
One pass through [5, 3, 1, 4]:

  Compare 5, 3  ->  swap  ->  [3, 5, 1, 4]
  Compare 5, 1  ->  swap  ->  [3, 1, 5, 4]
  Compare 5, 4  ->  swap  ->  [3, 1, 4, 5]  <- 5 is now in its final position
```

Bubble sort needs (n - 1) passes, each touching (n - 1 - i) pairs. It is acceptable for tiny lists or for teaching, and slow on anything larger.

### Insertion Sort

Similar to sorting a hand of playing cards. Pick up one card at a time and slide it left until it sits in the right place among the cards already in your hand.

```
Sorting [4, 2, 3, 1]:

  Start:          [4]  |  2, 3, 1
  Insert 2:   [2, 4]  |  3, 1
  Insert 3:  [2, 3, 4]  |  1
  Insert 1: [1, 2, 3, 4]
```

Insertion sort performs well on small or nearly sorted lists because most elements barely move.

### Merge Sort

Split the list in half, recursively sort each half, and merge the two sorted halves back together. The merge step walks through both halves at once, always taking the smaller front element next.

```
merge_sort([4, 2, 3, 1])
    merge_sort([4, 2])              merge_sort([3, 1])
        merge_sort([4])  merge_sort([2])   ...
        merge([4], [2]) -> [2, 4]         -> [1, 3]
    merge([2, 4], [1, 3]) -> [1, 2, 3, 4]
```

Merge sort is consistently fast regardless of input order. The recursion is the tricky part.

### Linear Search

Scan the list from left to right and return the index the moment the target is found. If the scan reaches the end without a match, return -1. Works on any list, sorted or not.

### Binary Search

Works only on a sorted list. Look at the middle element. If it matches the target, return its index. If the target is smaller, search the left half; if larger, search the right half. Repeat until found or the search range is empty.

```
Searching for 30 in [10, 20, 30, 40, 50]:

  low=0, high=4  ->  mid=2  ->  list[2] = 30  ->  found at index 2

Searching for 25 in [10, 20, 30, 40, 50]:

  low=0, high=4  ->  mid=2  ->  list[2] = 30  ->  too high, high=1
  low=0, high=1  ->  mid=0  ->  list[0] = 10  ->  too low,  low=1
  low=1, high=1  ->  mid=1  ->  list[1] = 20  ->  too low,  low=2
  low=2 > high=1  ->  not found, return -1
```

## Big-O Complexity

| Algorithm       | Best Case  | Average Case | Worst Case | Extra Space |
|-----------------|-----------|--------------|------------|-------------|
| Bubble Sort     | O(n)      | O(n^2)       | O(n^2)     | O(1)        |
| Insertion Sort  | O(n)      | O(n^2)       | O(n^2)     | O(1)        |
| Merge Sort      | O(n log n)| O(n log n)   | O(n log n) | O(n)        |
| Linear Search   | O(1)      | O(n)         | O(n)       | O(1)        |
| Binary Search   | O(1)      | O(log n)     | O(log n)   | O(1)        |

Reading the table:

- O(n^2) means that doubling the list size roughly quadruples the work.
- O(n log n) means roughly linear, with a small logarithmic multiplier.
- O(log n) means each step eliminates half the remaining candidates.

## When to Use Each

| Algorithm      | Use It When... |
|----------------|----------------|
| Bubble sort    | Learning about sorting. Never in production code. |
| Insertion sort | The input is small (under about 50 elements) or nearly sorted. |
| Merge sort     | General-purpose sorting when the input order is unknown. |
| Linear search  | The list is unsorted, or small enough that sorting first is not worth it. |
| Binary search  | The list is already sorted and you expect many lookups. |

## Iterative vs Recursive Binary Search

The version you implement here is **iterative**: it uses a `while` loop and two index pointers. A recursive version calls itself on the smaller half each time.

Both produce the same result. The trade-offs:

- **Iterative** is slightly harder to read at first but uses O(1) extra space because it does not add stack frames.
- **Recursive** reads more naturally as a direct expression of the algorithm, but adds one stack frame per step. For a list of one million elements that is still only about 20 recursive calls, so the difference rarely matters in practice.

## Your Tasks

Open `main.py` and complete these functions in order.

### TODO #1: `bubble_sort(lst)`

Use two nested loops. The outer loop counts passes; the inner loop walks through adjacent pairs. Swap elements that are out of order. Return a new list.

### TODO #2: `insertion_sort(lst)`

Loop from index 1 to the end. For each element, walk backward through the sorted portion, shifting elements to the right until the correct insertion point is found. Return a new list.

### TODO #3: `merge_sort(lst)`

Handle the base case first (a list of 0 or 1 elements). Then split the list, recurse on each half, and merge the two sorted halves. Return a new list.

### TODO #4: `linear_search(lst, target)`

Loop through the list. Return the index the first time the target is found. Return -1 if the loop finishes without a match.

### TODO #5: `binary_search(lst, target)`

Use `low` and `high` pointers. Each iteration, check the midpoint and narrow the range left or right depending on the comparison. Return -1 if the range becomes empty.

## Reflection Questions

1. Look at the timing table. At what input size does the O(n^2) cost of bubble sort become clearly worse than merge sort?
2. Insertion sort and bubble sort have the same Big-O, but insertion sort is usually faster in practice. Why?
3. Binary search requires a sorted list. If you only need to search once, is it worth sorting first? What if you need to search thousands of times?
4. Merge sort always uses O(n) extra space. When would that be a problem?
5. Python's built-in `sorted()` uses Timsort, a hybrid of merge sort and insertion sort. Why would combining them be useful?

## Extension Challenges

### Easy: Early Exit for Bubble Sort

If no swaps occur during a full pass, the list is already sorted and the loop can stop. Add a boolean flag `swapped` to your bubble sort loop. When `swapped` remains False after a full pass, break out of the outer loop. Measure whether this speeds things up on an already sorted list.

### Easy: Recursive Binary Search

Write a second version of binary search that uses recursion instead of iteration. Compare the two versions for readability.

### Medium: Quicksort

Implement quicksort: choose a pivot element, partition the list so smaller elements come before the pivot and larger elements come after, then recursively sort each partition. Add it to the benchmark and compare it with merge sort.

### Medium: Visualize Sorting Steps

Modify one of your sorting functions to print the list after every swap or insertion. Use a small list (8 to 10 elements) so the output is readable. This makes the algorithm's behavior concrete.

### Hard: Sort Stability

A sort is "stable" if equal elements keep their original relative order. Write a test that proves whether your sorts are stable. Create a list of tuples such as `[(1, 'a'), (1, 'b'), (2, 'c')]` where the first element is the sort key and the second is a label. After sorting by the first element, do the two `1` entries still appear in their original order?

## Troubleshooting

### Tests Fail with `None` Returned

Your function is hitting the `pass` statement. Make sure you removed `pass` and that the function has a `return` statement.

### The Original List Is Being Modified

Call `lst.copy()` at the start of your sort functions before changing anything.

### Merge Sort Returns the Wrong Result

Walk through the merge step by hand with a small example. `left = [1, 3]`, `right = [2, 4]`. What does your merge produce?

### Binary Search Returns the Wrong Index or Loops Forever

Check that `low = mid + 1` (not `mid`) and `high = mid - 1` (not `mid`). Using `mid` on either side prevents the range from shrinking and the loop runs forever.

### Recursion Error in Merge Sort

The base case must return before any recursive calls. If `len(lst) <= 1` is not the very first check, the function may recurse infinitely on empty sublists.
