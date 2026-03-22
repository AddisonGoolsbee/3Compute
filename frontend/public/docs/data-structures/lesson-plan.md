# Data Structures: Stacks and Queues — Instructor Lesson Plan

## Overview

Students implement Stack and Queue data structures using Python lists, then apply them to three real-world programs: a bracket checker, a print queue simulator, and a browser history navigator. The project covers abstract data types, encapsulation, and the skill of recognizing which structure fits a given problem.

**Estimated Duration:** 4-5 class periods (45-50 minutes each)

**Grade Level:** Grades 9-12

**Prerequisites:**
- Basic Python (variables, functions, loops, conditionals)
- Python lists and list methods (`append`, `pop`)
- Defining classes and methods (basic OOP)
- Understanding of function return values and raising exceptions

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|---|---|---|
| **3B-AP-12** | Compare and contrast fundamental data structures and their uses. | Students implement Stack and Queue side-by-side, compare them to raw Python lists, and analyze which structure fits each of the three application problems. |
| **3A-AP-14** | Use lists to simplify solutions, generalizing computational problems instead of repeatedly using simple variables. | Stack and Queue wrap a list to generalize push/pop and enqueue/dequeue operations. `BrowserHistory` replaces what would otherwise be complex index tracking with two clean stacks. |
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis, using constructs such as procedures, modules, and/or objects. | Each application is decomposed into a class or function that uses Stack or Queue internally. Students must identify which structure solves which problem before writing code. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|---|---|---|
| **3A-AP-22** | Design and implement computational artifacts working in team roles using collaborative tools. | Pair programming works well for the application tasks (Days 3-4). |
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A test suite is provided; students run tests after each TODO to verify before moving on. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** the difference between LIFO (Stack) and FIFO (Queue) access patterns
2. **Implement** a Stack and Queue class that wraps a Python list
3. **Identify** which data structure fits a given problem and justify the choice
4. **Apply** a Stack to solve the bracket-matching problem
5. **Apply** a Queue to simulate ordered job processing
6. **Design** a two-stack solution to a navigation problem

---

## Lesson Sequence

### Day 1: Abstract Data Types and Physical Simulation (45 min)

**Objectives:**
- Introduce the concept of an abstract data type (ADT)
- Build intuition for LIFO and FIFO through physical activity

**Activities:**

1. **Warm-up (5 min):** Ask students: "If Python lists already let you add and remove from any position, why would anyone want a structure that *restricts* what you can do?"
   - Take a few answers. Hold the question open for the end of class.

2. **Physical Stack simulation (10 min):**
   - Use a stack of books (or cards, or plates if available).
   - Demonstrate push and pop. Point out: you can only touch the top.
   - Ask: "Where do you see this pattern in real life?" (undo history, browser back, call stack)

3. **Physical Queue simulation (10 min):**
   - Have students line up at the door.
   - New arrivals join the back. The person at the front leaves first.
   - Ask: "Where do you see this pattern?" (printer, customer service line, CPU scheduling)

4. **Discussion (10 min):** Return to the warm-up question.
   - Why restrict operations? Reasons: enforce correctness, document intent, prevent bugs.
   - Introduce the term "abstract data type": a data structure defined by its *behavior*, not its implementation.

5. **Preview the project (10 min):**
   - Open `main.py` and walk through the class skeletons together.
   - Show the docstrings. Point out: the docstrings describe the *contract* (what each method must do).
   - Show `test_structures.py` briefly. Explain: tests will verify behavior, not implementation.

**Materials:**
- Stack of books or similar physical objects
- Project template access

---

### Day 2: Implementing Stack and Queue (45 min)

**Objectives:**
- Implement the Stack class (all methods)
- Implement the Queue class (all methods)
- Run tests to verify both before moving on

**Activities:**

1. **Review (5 min):** Sketch on the board:
   ```
   Stack: [ 10, 20, 30 ]
                       ^-- top (_items[-1])

   Queue: [ "A", "B", "C" ]
            ^-- front      ^-- back
   ```

2. **Implement Stack (15 min):**
   - Students work individually or in pairs.
   - `push` and `is_empty` first — these are the simplest.
   - Then `pop`, `peek`, `size`, `__str__`.
   - Run `python test_structures.py` — focus only on the Stack Tests section.

3. **Common errors to watch for:**

   ```python
   # Wrong: pop() returns None instead of raising IndexError
   def pop(self):
       return self._items.pop()  # crashes with wrong error if empty

   # Right: check first
   def pop(self):
       if self.is_empty():
           raise IndexError("Stack is empty")
       return self._items.pop()
   ```

4. **Implement Queue (15 min):**
   - `enqueue` is `append`. `dequeue` is `pop(0)`.
   - Discuss: `pop(0)` on a large list is O(n) — every item shifts. This is acceptable for a learning exercise. Mention that `collections.deque` solves this in production code.
   - Run tests again — focus on Queue Tests section.

5. **Wrap-up (10 min):**
   - Both Stack and Queue tests should be passing before Day 3.
   - If students finish early, have them read through `is_balanced`'s docstring and sketch the algorithm on paper.

**Instructor Notes:**
- `__str__` is the most commonly skipped. Remind students the tests check the exact format.
- Students sometimes confuse `pop()` (remove last) with `pop(0)` (remove first). The end of the list is the Stack top; index 0 is the Queue front.

---

### Day 3: Applying the Structures (45 min)

**Objectives:**
- Implement `is_balanced()` using Stack
- Implement `simulate_print_queue()` using Queue
- Understand the mapping from problem to structure

**Activities:**

1. **Discussion (10 min): Matching problems to structures**

   Draw this on the board and ask students to fill in the blanks:

   | Problem | Structure | Reason |
   |---|---|---|
   | The most recently opened bracket must close first | ? | ? |
   | Print jobs process in arrival order | ? | ? |

   The bracket problem is LIFO (most recent first). The print problem is FIFO (arrival order). Let students articulate this before coding.

2. **Implement `is_balanced()` (15 min):**
   - Walk through the algorithm together with a short example on the board:
     ```
     expression = "{[()]}"
     char  stack action
     {     push   [{]
     [     push   [{, []
     (     push   [{, [, (]
     )     pop    matched ( with ) -> ok   [{, []
     ]     pop    matched [ with ] -> ok   [{]
     }     pop    matched { with } -> ok   []
     done  stack empty -> True
     ```
   - Students implement and run tests.

3. **Implement `simulate_print_queue()` (10 min):**
   - This is the most straightforward task: enqueue all jobs, dequeue one at a time, build the result list.
   - Students who finish early: ask them to trace what happens with an empty input.

4. **Run and review (10 min):**
   - Both function tests should pass.
   - Ask: "Why couldn't you use a Queue for bracket matching?"

**Instructor Notes:**
- The bracket algorithm has three distinct failure cases: closing bracket with empty stack, mismatched pair, and non-empty stack at the end. Make sure students handle all three.
- A common error is returning `True` early (inside the loop) before checking all characters.

---

### Day 4: Browser History and Wrap-Up (45 min)

**Objectives:**
- Implement `BrowserHistory` using two stacks
- Run full test suite
- Discuss performance tradeoffs and extensions

**Activities:**

1. **Design discussion (10 min):**
   - Pose the problem: "How would you implement a browser's back and forward buttons using only Stacks?"
   - Let students sketch ideas before revealing the two-stack design.
   - Walk through the state transitions on the board:
     ```
     visit("a.com")  ->  current="a.com"   back=[]         forward=[]
     visit("b.com")  ->  current="b.com"   back=["a.com"]  forward=[]
     visit("c.com")  ->  current="c.com"   back=["a.com","b.com"]  forward=[]
     back()          ->  current="b.com"   back=["a.com"]  forward=["c.com"]
     forward()       ->  current="c.com"   back=["a.com","b.com"]  forward=[]
     visit("d.com")  ->  current="d.com"   back=["a.com","b.com","c.com"]  forward=[]
     ```
   - Key insight: `visit()` must clear `forward_stack`. Ask students why.

2. **Implement `BrowserHistory` (20 min):**
   - Students implement all four methods.
   - Run `python test_structures.py` — all tests should pass by end of class.

3. **Full test run and discussion (10 min):**
   - Confirm all tests pass.
   - Ask: "What would it look like to use a Queue instead of a Stack for `back_stack`? What would break?"
   - Brief comparison table discussion (see README comparison table).

4. **Optional extension preview (5 min):**
   - Show the extension list from the README.
   - Assign one as homework or a bonus challenge.

**Common Student Errors:**

```python
# Wrong: back() and forward() don't swap correctly
def back(self):
    self._current = self._back_stack.pop()  # forgot to push current to forward

# Right:
def back(self):
    if self._back_stack.is_empty():
        raise IndexError("No back history")
    self._forward_stack.push(self._current)
    self._current = self._back_stack.pop()
```

---

### Day 4 (Optional Extension Period)

If time permits or as a follow-up session:

**Topics to cover:**

1. **Performance discussion (10 min):**
   - `Queue.dequeue()` uses `pop(0)`, which is O(n) because Python must shift all elements.
   - Demonstrate with `collections.deque` for O(1) dequeue.
   - Discuss: for this project's scale it doesn't matter, but in a production system with millions of items it would.

2. **Priority Queue concept (10 min):**
   - A priority queue is like a Queue, but higher-priority items jump ahead.
   - Real examples: OS process scheduling, Dijkstra's algorithm, hospital triage.
   - Python's `heapq` module implements one.

3. **Deque and LRU Cache (remaining time):**
   - Students work on the 🟡 Deque extension or 🔴 LRU Cache extension from the README.

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** Built-in tests provide immediate, objective feedback during each class period.
- **Exit ticket after Day 2:** "Draw a stack with three items. Show the state after push(40) and then pop()."
- **Whiteboard trace:** Ask a student to walk through the bracket algorithm for `"([)]"` on the board.

### Summative Assessment

**Option A: Code Submission**
- Submit completed `main.py`
- Rubric:
  - All tests pass (50%)
  - Correct approach (using Stack/Queue as specified, not raw lists in the application functions) (30%)
  - Code readability and naming (20%)

**Option B: Written Analysis**
- "Given a new problem (e.g., a call center hold system), identify which structure fits and explain why."
- "Trace through `is_balanced` step by step for the expression `{[(]}`."
- "The `dequeue()` operation on a list is O(n). What does that mean, and why might it matter?"

**Option C: Extension Project**
- Implement one of the 🟡 or 🔴 extensions with a brief written explanation of the design.

---

## Differentiation

### For Struggling Students

- Provide the Stack implementation as a working example before asking students to implement Queue.
- Reduce scope: skip `BrowserHistory` and focus on Stack, Queue, and one application.
- Offer partially completed pseudocode for `is_balanced`.
- Pair with a stronger partner for Day 3 onward.

### For Advanced Students

- Assign the linked-list extension before any class time — they can implement Stack and Queue without a Python list backing.
- Challenge: implement `BrowserHistory` with a maximum back-history depth (e.g., only the last 10 pages).
- Research and present: how does Python itself manage the call stack, and how does that relate to recursion depth errors?

---

## Discussion Prompts

Use these at natural transition points:

1. "Python lists let you do `my_list[3]`. Should Stack and Queue? What would go wrong if they did?"

2. "The bracket matcher ignores letters and numbers. Why is that the right behavior for a real compiler?"

3. "A printer processes jobs in order. What if a job is very large and blocks the queue? How do real printers handle that?"

4. "The BrowserHistory stores every page you visit. What privacy implications does that have?"

5. "We used a list internally. Are Stack and Queue the same thing as a list? What is and isn't the same?"

---

## Common Misconceptions

| Misconception | Reality |
|---|---|
| "Stack and Queue are completely different from lists" | They use a list internally. The difference is the restricted interface, not the storage. |
| "is_empty() can just return the list" | It should return `True` or `False`. Returning `self._items` returns the list object, which is always truthy unless empty. |
| "pop() and pop(0) are interchangeable" | `pop()` removes from the end (Stack top). `pop(0)` removes from the front (Queue front). Using the wrong one breaks LIFO or FIFO behavior. |
| "BrowserHistory needs complicated logic" | Once you have working Stack, the logic is straightforward. The complexity is in recognizing that two stacks are the right tool. |

---

## Troubleshooting Guide

| Symptom | Likely Cause | Solution |
|---|---|---|
| `__str__` tests fail | Format doesn't match exactly | Check spacing and the `<-top` / `front->` labels |
| `is_balanced` returns wrong result | Not checking empty stack before `pop()` in the loop | Add `if stack.is_empty(): return False` before popping |
| `BrowserHistory.back()` crashes | Not checking `_back_stack.is_empty()` before popping | Raise `IndexError("No back history")` first |
| `BrowserHistory.forward()` still works after `visit()` | `visit()` is not clearing `_forward_stack` | Reassign: `self._forward_stack = Stack()` |
| All Queue tests fail | `enqueue`/`dequeue` use the wrong end of the list | Front is index 0; back is the end. `dequeue` uses `pop(0)`. |

---

## Files in This Package

| File | Purpose |
|---|---|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| **Data-Structures student template:** | |
| `main.py` | Scaffolded code with TODOs and docstrings |
| `test_structures.py` | Test suite for verification |
| `README.md` | Student-facing instructions and reference |
| `requirements.txt` | No external dependencies |

---

*Last updated: March 2026*
