# Data Structures: Stacks and Queues

In this project you build two fundamental data structures from scratch, then apply them to three programs that use them naturally: a bracket checker, a print queue simulator, and a browser history navigator.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- Why abstract data structures exist even when Python lists can technically do everything
- Stack (LIFO) behavior and when it fits a problem
- Queue (FIFO) behavior and when it fits a problem
- How to wrap a simple list in a class that enforces specific rules
- Pattern recognition: spotting which structure a problem calls for

## Setup

Right-click the `Data-Structures` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

From there:

1. Open `main.py` and read through the class skeletons and docstrings.
2. Complete the TODOs in order (1 through 5).
3. Test your work: `python test_structures.py`.
4. Run the demo:

   ```bash
   pip install -r requirements.txt
   python main.py
   ```

## What This README Covers

- Background on stack (LIFO) and queue (FIFO) behavior
- Why wrapping a list in a class matters for bugs, intent, and performance
- The five TODOs: Stack, Queue, bracket checker, print queue, and browser history
- How each application naturally maps to a specific data structure
- Extension challenges, reflection questions, and a code review checklist

## Background: Stacks and Queues

Python lists are flexible: you can insert, remove, or inspect any position. That flexibility is useful, but it also means nothing stops you from accidentally accessing the wrong end of a data structure. A Stack or Queue is a disciplined wrapper around a list that enforces one specific access pattern.

### Stack (Last-In, First-Out)

Think of a stack of plates. You always add a new plate to the top, and you always take a plate from the top. You never reach into the middle.

```
  push(30)        pop() -> 30
  --------        -----------       --------
  | 30   |  <-- top                 | 20   |  <-- top
  | 20   |                          | 10   |
  | 10   |                          --------
  --------
```

Operations:

- `push(item)`: add to the top
- `pop()`: remove and return the top item
- `peek()`: look at the top item without removing it

Real-world stacks: the browser back button, undo history, the call stack in a program, matching brackets in a compiler.

### Queue (First-In, First-Out)

Think of a line at a store. The first person in line is the first to be served. New people join at the back.

```
  enqueue("C")         dequeue() -> "A"
  front -> A  B  C     front -> B  C
```

Operations:

- `enqueue(item)`: add to the back
- `dequeue()`: remove and return the front item
- `peek()`: look at the front item without removing it

Real-world queues: printer spoolers, CPU task scheduling, network packet buffers, call center hold systems.

## Why Not Just Use a List?

You can. But a dedicated class:

- **Prevents bugs** by restricting operations to what makes sense.
- **Documents intent.** Seeing `Stack()` in code immediately communicates the access pattern.
- **Hides the implementation.** The rest of the program does not need to know which end of the list is the "top."
- **Makes time complexity explicit.** *Time complexity* describes how an operation's speed scales with the size of the data. O(1) means "constant time": the same amount of work whether the list has 10 items or 10 million. O(n) means "linear time": the work grows proportionally with the number of items. A Stack wrapping a list has O(1) push and pop because it always touches the end. A Queue naively backed by a list has O(n) dequeue because `pop(0)` shifts every remaining element one position to fill the gap. A dedicated Queue can swap in a `collections.deque` internally and make both ends O(1) without any caller noticing.

| Feature | Python list | Stack | Queue |
|---|---|---|---|
| Access any index | Yes | No | No |
| Add/remove from either end | Yes | Top only | Back in, front out |
| Core operations (push/pop or enqueue/dequeue) | O(1) at end, O(n) at front | O(1) | O(1) with the right internals |
| Communicates intent | No | Yes | Yes |
| Prevents accidental misuse | No | Yes | Yes |

## Your Tasks

Open `main.py` and complete these in order.

### TODO #1: `Stack` Class

Implement `push`, `pop`, `peek`, `is_empty`, `size`, and `__str__`.

The internal list stores items so that the **end** (`_items[-1]`) is the top.

- `pop()` and `peek()` must raise `IndexError("Stack is empty")` on an empty stack.

### TODO #2: `Queue` Class

Implement `enqueue`, `dequeue`, `peek`, `is_empty`, `size`, and `__str__`.

The internal list stores items so that **index 0** is the front (the next item to dequeue).

- `dequeue()` and `peek()` must raise `IndexError("Queue is empty")` on an empty queue.

### TODO #3: `is_balanced(expression)`

Use your Stack to check whether brackets, parentheses, and braces in a string are properly matched.

```
"()"       -> True
"{[()]}"   -> True
"([)]"     -> False  (wrong closing order)
"{"        -> False  (never closed)
```

The algorithm: scan each character. Push opening brackets. When you see a closing bracket, pop and verify it matches.

### TODO #4: `simulate_print_queue(jobs)`

Use your Queue to process a list of print job names in submission order. Return a list of completion messages formatted as `"Printed: {job}"`.

### TODO #5: `BrowserHistory` Class

Use **two stacks** to implement browser back/forward navigation.

```
visit("a.com")  visit("b.com")  visit("c.com")
back_stack: [a]   back_stack: [a, b]   ...
current: a        current: b           current: c

back()                   forward()
current: b               current: c
back_stack: [a]          back_stack: [a, b]
forward_stack: [c]       forward_stack: []
```

Visiting a new page clears the forward stack. That matches how real browsers behave.

## Testing Your Implementation

```bash
python test_structures.py
```

You will see a PASS or FAIL line for each test and, on failure, the expected and actual values.

Implement in order. `is_balanced`, `simulate_print_queue`, and `BrowserHistory` all depend on Stack and Queue working correctly.

## How the Applications Map to the Structures

| Application | Structure | Why |
|---|---|---|
| Bracket matching | Stack | The most recently opened bracket must be closed first (LIFO) |
| Print queue | Queue | Jobs are processed in the order they arrive (FIFO) |
| Browser back/forward | Two stacks | Back = LIFO history; forward = LIFO of undone steps |

This mapping is not accidental. When you find yourself needing to reverse a sequence or track "the most recent thing," a stack usually fits. When you need to process things in arrival order, a queue usually fits.

## Extension Challenges

### Easy: Track Statistics on the Print Queue

Modify `simulate_print_queue` to also return the number of jobs processed and the total length of all job names combined.

### Easy: Add a `__len__` Method

Python lets you define `__len__` so that `len(my_stack)` works. Add this to both Stack and Queue.

### Medium: Implement a Deque

A deque (double-ended queue) allows push and pop from both ends. Implement a `Deque` class that supports `push_front`, `push_back`, `pop_front`, and `pop_back`. Show how a Deque can act as either a Stack or a Queue.

### Medium: Stack Using Two Queues

Implement a Stack using only two Queue objects internally (no direct list access). This is a classic interview problem. **Hint:** one queue acts as storage; the other helps rotate items to simulate LIFO.

### Hard: Implement Using a Linked List

Currently, both classes use a Python list internally. Implement a `LinkedStack` or `LinkedQueue` that uses a hand-built linked list (a `Node` class with a `value` and a `next` pointer). This is how these structures are often implemented in lower-level languages.

### Hard: LRU Cache

An LRU (Least Recently Used) cache evicts the item that was accessed least recently when the cache is full. Implement an `LRUCache` class with `get(key)` and `put(key, value)` methods. The classic approach combines a dictionary with a deque.

## Reflection Questions

1. What would go wrong if you used `pop(0)` on a large Python list millions of times? Why does this matter for Queue performance?
2. The bracket-matching algorithm uses a Stack. Could you solve the same problem with a Queue? Why or why not?
3. In `BrowserHistory`, what happens to the forward stack when you visit a new page? Why is that the correct behavior?
4. If you were designing a task scheduler for a hospital emergency room, would you use a Stack or a Queue? What if tasks had different priorities?
5. Python's own interpreter uses a call stack internally. How does that connect to the recursion errors you may have seen?

## Code Review Checklist

Before submitting:

- [ ] All tests pass (`python test_structures.py`)
- [ ] The demo runs without errors (`python main.py`)
- [ ] `pop()`, `dequeue()`, and `peek()` raise `IndexError` on empty structures
- [ ] `visit()` in `BrowserHistory` clears the forward stack
- [ ] Variable names are descriptive
- [ ] You can explain the bracket-matching algorithm without looking at the code
