# Sorting Algorithms: Instructor Lesson Plan

## Overview

Students implement three sorting algorithms (bubble, insertion, merge) and two
search algorithms (linear, binary search), then use a built-in benchmarking
tool to compare their performance. The project bridges conceptual algorithm
analysis with concrete, measurable results.

**Estimated Duration:** 4-5 class periods (45-50 minutes each)

**Grade Level:** Grades 11-12

**Prerequisites:**
- Python functions, loops, conditionals, and lists
- Understanding of return values
- Familiarity with the concept of recursion (for merge sort on Day 3)
- Basic concept of algorithm efficiency is helpful but not required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3B-AP-10** | Use and adapt classic algorithms to solve computational problems. | Students implement bubble sort, insertion sort, merge sort, linear search, and binary search from scratch. |
| **3B-AP-11** | Evaluate algorithms in terms of their efficiency, correctness, and clarity. | The benchmarking tool makes O(n^2) vs O(n log n) performance differences visible and measurable. Students compare timing results and analyze Big-O trade-offs. |
| **3A-AP-15** | Justify the selection of specific control structures when tradeoffs involve implementation, readability, and program performance. | Students choose between iterative and recursive binary search; they analyze why insertion sort is preferred over bubble sort despite the same Big-O; and they discuss when to use each sorting algorithm. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3B-AP-14** | Construct solutions to problems using student-created components. | Each of the five functions is an independent, testable component that combines into a working benchmark system. |
| **3B-AP-21** | Develop and use a series of test cases to verify program behavior. | A test suite is provided; students run it after each function to confirm correctness before proceeding. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. Implement bubble sort, insertion sort, and merge sort from a description
2. Trace the execution of each algorithm on a small list by hand
3. Explain the difference between O(n^2) and O(n log n) time complexity
4. Implement linear and binary search and state the precondition for binary search
5. Interpret timing data and connect it to Big-O analysis
6. Justify which algorithm to choose given constraints on input size and order

---

## Lesson Sequence

### Day 1: Conceptual Introduction and Hand-Sort Activity (45 min)

**Objectives:**
- Develop intuition for how sorting algorithms differ before seeing any code
- Understand what Big-O notation is measuring

**Activities:**

1. **Warm-up (5 min):**
   Give each student (or pair) a shuffled set of 8-10 index cards with numbers
   written on them. Ask them to sort the cards and pay attention to their own
   process. How did they decide where each card goes?

2. **Hand-Sort Activity (20 min):**
   Walk through the three algorithms using the physical cards.

   - **Bubble Sort:** Take the deck face-up. Walk through pairs left to right,
     swapping whenever the left card is larger. Repeat until no swaps occur.
     Count how many comparisons you made.

   - **Insertion Sort:** Start with one card in your hand. Pick up the next
     card and slide it into the right position. Keep picking up one card at a
     time and inserting it.

   - **Merge Sort:** Split the deck in half, then in half again until you have
     piles of one card each. Merge pairs of piles by always taking the smaller
     front card. Observe that merging is fast because both piles are already
     sorted.

   Compare the number of comparisons for each approach on the same deck.

3. **Big-O Discussion (15 min):**
   Introduce the concept informally: "If sorting 10 cards took about 45
   comparisons with bubble sort, approximately how many would 20 cards take?"
   Guide students toward seeing that the count grows roughly as n^2 for bubble
   and insertion sort and much more slowly for merge sort.

   Draw a simple table on the board:

   ```
   n=10    bubble/insertion: ~45    merge: ~33
   n=100   bubble/insertion: ~4950  merge: ~664
   n=1000  bubble/insertion: ~500k  merge: ~9966
   ```

4. **Preview (5 min):**
   Open the template. Show students the five TODO functions and the
   benchmarking output they will produce by Day 4.

**Materials:**
- Index cards with numbers (one set per pair or small group)
- Whiteboard for comparison counts

---

### Day 2: Implement Bubble Sort and Insertion Sort (45 min)

**Objectives:**
- Translate the hand-sort process into code
- Run the test suite and interpret output

**Activities:**

1. **Setup (5 min):**
   Open `main.py` and `test_sorting.py`. Review the file structure together.

2. **Implement `bubble_sort` (20 min):**
   Students work through TODO #1. The pseudocode hints in the docstring walk
   through the two-loop structure. Remind students to copy the list first.

   Common error to watch for:
   ```python
   # Wrong: inner loop range does not shrink
   for j in range(len(result) - 1):

   # Right: shrink by i because the last i elements are already in place
   for j in range(len(result) - 1 - i):
   ```

3. **Run tests for bubble_sort (5 min):**
   `python test_sorting.py` -- the bubble_sort section should show all green.
   Fix any failures before moving on.

4. **Implement `insertion_sort` (10 min):**
   Students work through TODO #2. This goes faster after bubble sort. Emphasize
   the `while j >= 0` guard to prevent index errors.

5. **Run tests for insertion_sort (5 min):**
   Verify all insertion_sort tests pass.

**Instructor Notes:**
- The "does not modify the original list" tests catch students who forget
  `lst.copy()`. This is a good moment to discuss why returning a new list is
  cleaner than mutating in place.
- If students finish early: ask them which of the two algorithms they expect
  to be faster in practice, and why.

---

### Day 3: Implement Merge Sort (45 min)

**Objectives:**
- Implement a recursive algorithm with a clear base case
- Understand how the divide-and-conquer pattern produces O(n log n) performance

**Activities:**

1. **Recursion Review (10 min):**
   Trace `merge_sort([4, 2, 3, 1])` on the board down to the base case and
   back up. Students should see that the work happens during the merge, not
   the split.

   Emphasize the base case explicitly: "A list of 0 or 1 elements is always
   already sorted. This is where the recursion stops."

2. **Implement `merge_sort` (25 min):**
   Students work through TODO #3. The most common trouble spots:

   - Forgetting the base case entirely, causing infinite recursion
   - Writing the merge loop correctly (the `extend` calls after the `while`
     loop are easy to overlook)
   - Confusion about what `left[i:]` means when `i` has reached the end

   Have students trace a four-element example by hand on paper before writing
   any code.

3. **Run tests for merge_sort (10 min):**
   Verify all merge_sort tests pass. The two-element test (`[2, 1]`) and the
   empty list test often catch edge-case bugs.

**Common Student Errors:**

```python
# Wrong: base case does not stop recursion on empty list
if len(lst) == 1:
    return lst

# Right: handle both 0 and 1 elements
if len(lst) <= 1:
    return lst[:]
```

```python
# Wrong: forgot to append remaining elements after the while loop
while i < len(left) and j < len(right):
    ...
# Missing: merged.extend(left[i:]) and merged.extend(right[j:])
```

**Instructor Notes:**
- Merge sort is the hardest day for most students. Allow extra time.
- If students are stuck on the merge step, have them do it by hand with
  `left = [1, 3]` and `right = [2, 4]` before looking at any code.
- Students who finish early can trace through the recursion with `print`
  statements to see the call stack depth.

---

### Day 4: Search Algorithms and Performance Comparison (45 min)

**Objectives:**
- Implement linear and binary search
- Run the benchmarking tool and connect timing data to Big-O

**Activities:**

1. **Implement `linear_search` (10 min):**
   Students work through TODO #4. This is straightforward. Good opportunity to
   discuss enumerate vs. range(len()).

2. **Implement `binary_search` (15 min):**
   Students work through TODO #5. Walk through the pointer update rules on the
   board before students code:

   ```
   If lst[mid] < target:  low  = mid + 1  (target is to the right)
   If lst[mid] > target:  high = mid - 1  (target is to the left)
   ```

   The most common bug is writing `low = mid` or `high = mid`, which causes
   an infinite loop when the search range is two elements.

3. **Run all tests (5 min):**
   All 36 tests should pass. Debug any failures.

4. **Run the benchmark (10 min):**
   `python main.py`

   Look at the timing table together. Discussion questions:
   - "At n=10000, how much slower is bubble sort than merge sort?"
   - "Bubble sort and insertion sort have the same Big-O. Does the timing
     reflect that, or is one consistently faster?"
   - "Why does binary search require a sorted list? Is that a limitation?"

5. **Wrap-up (5 min):**
   "You've just implemented the algorithms that underpin Python's own sort,
   database indexes, and every language's standard library. The concepts here
   do not go away."

**Instructor Notes:**
- If the timing numbers for n=100 are all "0.000 ms", that is expected.
  The differences become meaningful at n=1000 and especially n=10000.
- Insertion sort is almost always faster than bubble sort in practice despite
  having the same Big-O. This is a good point to discuss constant factors.

---

### Day 5 (Optional): Extensions, Algorithm Analysis, and Code Review (45 min)

**Objectives:**
- Deepen understanding through extension work or peer review
- Connect implementation to broader algorithm design principles

**Activities (choose based on class):**

**Option A: Algorithm Analysis (whole class)**
- Have students calculate expected operation counts for each algorithm at
  n=1000 using the Big-O formulas: n^2 = 1,000,000 vs n log n = ~10,000.
- Compare to actual timing ratios from the benchmark.
- Discuss: why does O notation drop constants and lower-order terms? When
  does that abstraction mislead you?

**Option B: Extension Coding (individual/pairs)**
- Students pick one extension from the README (early-exit bubble sort,
  recursive binary search, quicksort, or visualization).
- They add it to the benchmark and report timing results.

**Option C: Code Review (pairs)**
- Exchange code with another student.
- Review against this checklist:
  - [ ] All 36 tests pass
  - [ ] No function modifies its input list
  - [ ] Variable names are clear and consistent
  - [ ] The merge step in merge_sort handles all edge cases
  - [ ] Binary search cannot loop forever (check the pointer updates)
- Written feedback: one thing that is clear, one thing that could be improved.

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** Immediate pass/fail feedback after each function. Students
  can self-assess before you see their code.
- **Hand-trace exit ticket:** At the end of Day 1 or 2, give students a
  6-element list and ask them to show one full pass of bubble sort on paper.
- **Observation:** During implementation days, ask individual students to
  explain their inner loop logic before they run any tests.

### Summative Assessment

**Option A: Code Submission**
Submit completed `main.py` with all tests passing.

Rubric:
- All 36 tests pass (50%)
- No function modifies the original input list (10%)
- Implementations match the described algorithm (not a call to `sorted()`) (30%)
- Variable names are meaningful (10%)

**Option B: Written Analysis**
Given a timing table (or one they generate), answer:
1. Trace bubble sort on `[5, 2, 8, 1]` showing every comparison and swap.
2. What is the Big-O of each sort? What do the timing results confirm?
3. You need to search a list of 1 million employee IDs for a given ID. The
   list never changes. What data structure and algorithm would you use? Justify.

**Option C: Extension**
Implement quicksort, add it to the benchmark, and write a one-page comparison
of quicksort vs. merge sort covering correctness, worst-case performance,
space usage, and readability.

---

## Differentiation

### For Struggling Students

- On Day 2, provide a partially filled-in `bubble_sort` with the two loop
  headers written and only the swap body as a TODO.
- On Day 3, skip merge sort and have students use Python's built-in `sorted()`
  for the benchmark. They can still complete the search algorithms and
  participate in the timing discussion.
- Pair with a stronger partner for merge sort; one student explains, the other
  codes.

### For Advanced Students

- Challenge: implement all five functions without looking at the hints in the
  docstrings.
- Challenge: profile the number of comparisons each sort makes on the same
  data (add a counter) and compare to the theoretical counts.
- Challenge: implement quicksort and explain why its average case is O(n log n)
  but its worst case is O(n^2).
- Research: read about Timsort (Python's built-in sort). What problem does it
  solve that neither pure merge sort nor insertion sort solves alone?

---

## Discussion Prompts

Use these at transitions or as warm-ups:

1. "Bubble sort and insertion sort have the same Big-O complexity. Why does
   insertion sort tend to be faster in practice?"

2. "Binary search is O(log n) but requires sorted input. If you only need to
   search once, is binary search actually better? What changes if you need to
   search 10,000 times?"

3. "Merge sort always uses O(n) extra memory. Is that always acceptable?
   Can you imagine a context where it isn't?"

4. "Python's built-in `sorted()` is nearly always faster than your
   implementations. Does that mean implementing sorting algorithms is
   pointless? What did you gain from this project?"

5. "The best-case for both bubble sort and insertion sort is O(n) on an
   already-sorted list. Does that change your algorithm choice when you know
   something about your input?"

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "O(n^2) is only slow for huge inputs" | At n=10,000 the difference is already seconds vs. milliseconds. At n=1,000,000 bubble sort would take hours; merge sort takes under a second. |
| "Binary search is always better than linear search" | Binary search requires sorted input. If the list is unsorted, you must sort it first (O(n log n)), which may cost more than a single linear scan (O(n)). |
| "My sort works because it passes the normal test" | Edge cases matter. The test suite specifically checks empty lists, single-element lists, already-sorted lists, and reversed lists because these catch different kinds of bugs. |
| "Merge sort is always the right choice" | Insertion sort outperforms merge sort on small inputs (fewer than roughly 10-20 elements) because it has less overhead. Timsort exploits this by switching strategies based on run length. |

---

## Troubleshooting Guide

| Symptom | Likely Cause | What to Check |
|---------|--------------|---------------|
| Function returns `None` | The `pass` statement was not removed, or there is a missing `return` | Verify the function has a `return` statement on all code paths |
| "does not modify original" test fails | `lst.copy()` was not called at the start | Add `result = lst.copy()` and operate on `result`, not `lst` |
| Merge sort causes `RecursionError` | Base case is missing or unreachable | Make sure `if len(lst) <= 1: return lst[:]` is the first line |
| Merge sort returns a partially sorted list | `extend` calls after the while loop are missing | After the while loop, add `merged.extend(left[i:])` and `merged.extend(right[j:])` |
| Binary search loops forever | Pointer updates use `mid` instead of `mid + 1` or `mid - 1` | Check that `low = mid + 1` and `high = mid - 1` (not `mid`) |
| Binary search returns wrong index | Search range shrinks in the wrong direction | Verify: if `lst[mid] < target`, the target is to the **right**, so `low = mid + 1` |
| Benchmark crashes with `TypeError` | A sort function returns `None` (not yet implemented) | Implement all three sorts before running `python main.py` |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| Sorting-Algorithms student template | |
| -> `main.py` | Scaffolded code with TODOs and provided helpers |
| -> `test_sorting.py` | Test suite (36 tests across all 5 functions) |
| -> `README.md` | Student-facing instructions, Big-O table, diagrams |
| -> `requirements.txt` | Empty (no external dependencies) |

---

*Last updated: March 2026*
