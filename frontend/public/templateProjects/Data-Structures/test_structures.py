"""
Test Suite for Data Structures Project
========================================
Run this file to check your implementations:

    python test_structures.py

Each test prints ✅ if it passes or ❌ if it fails.
At the end, you'll see a summary: "N/M tests passed".

Implement the TODOs in main.py in order. Tests are arranged so that
later tests depend on earlier ones working correctly.
"""

from main import Stack, Queue, is_balanced, simulate_print_queue, BrowserHistory


passed = 0
failed = 0


def _safe_str(obj):
    """str() wrapper that handles __str__ returning non-string."""
    try:
        return str(obj)
    except (TypeError, Exception) as e:
        return f"ERROR({type(e).__name__})"


def check(label, got, expected):
    """Compare got vs expected and print a result line."""
    global passed, failed
    if got == expected:
        print(f"  ✅ {label}")
        passed += 1
    else:
        print(f"  ❌ {label}")
        print(f"       Expected: {expected!r}")
        print(f"       Got:      {got!r}")
        failed += 1


def check_raises(label, func, exception_type, message=None):
    """Verify that calling func() raises the expected exception."""
    global passed, failed
    try:
        func()
        print(f"  ❌ {label}")
        print(f"       Expected {exception_type.__name__} to be raised, but nothing was raised.")
        failed += 1
    except exception_type as e:
        if message is not None and str(e) != message:
            print(f"  ❌ {label}")
            print(f"       Raised {exception_type.__name__}, but message was wrong.")
            print(f"       Expected message: {message!r}")
            print(f"       Got message:      {str(e)!r}")
            failed += 1
        else:
            print(f"  ✅ {label}")
            passed += 1
    except Exception as e:
        print(f"  ❌ {label}")
        print(f"       Expected {exception_type.__name__}, got {type(e).__name__}: {e}")
        failed += 1


# =============================================================================
# STACK TESTS
# =============================================================================

print("\n=== Stack Tests ===")

# is_empty on a new stack
s = Stack()
check("New stack is empty", s.is_empty(), True)
check("New stack size is 0", s.size(), 0)

# push and basic state
s.push(1)
check("After push(1): is_empty() is False", s.is_empty(), False)
check("After push(1): size() is 1", s.size(), 1)

s.push(2)
s.push(3)
check("After push(1,2,3): size() is 3", s.size(), 3)

# peek
check("peek() returns top item (3)", s.peek(), 3)
check("peek() does not remove item: size still 3", s.size(), 3)

# pop
check("pop() returns 3", s.pop(), 3)
check("After pop: size is 2", s.size(), 2)
check("After pop: peek() is now 2", s.peek(), 2)

check("pop() returns 2", s.pop(), 2)
check("pop() returns 1", s.pop(), 1)
check("Stack is empty after all pops", s.is_empty(), True)

# Error on pop from empty
check_raises(
    "pop() raises IndexError on empty stack",
    lambda: s.pop(),
    IndexError,
    "Stack is empty",
)

# Error on peek from empty
check_raises(
    "peek() raises IndexError on empty stack",
    lambda: s.peek(),
    IndexError,
    "Stack is empty",
)

# LIFO order
s2 = Stack()
for v in [10, 20, 30]:
    s2.push(v)
order = [s2.pop(), s2.pop(), s2.pop()]
check("Stack LIFO order: items come out in reverse order", order, [30, 20, 10])

# __str__
s3 = Stack()
check("__str__ on empty stack", _safe_str(s3), "Stack: []")
s3.push("a")
s3.push("b")
check("__str__ with items", _safe_str(s3), "Stack: [a, b <-top]")


# =============================================================================
# QUEUE TESTS
# =============================================================================

print("\n=== Queue Tests ===")

q = Queue()
check("New queue is empty", q.is_empty(), True)
check("New queue size is 0", q.size(), 0)

q.enqueue("first")
check("After enqueue('first'): is_empty() is False", q.is_empty(), False)
check("After enqueue('first'): size() is 1", q.size(), 1)

q.enqueue("second")
q.enqueue("third")
check("After 3 enqueues: size() is 3", q.size(), 3)

# peek
check("peek() returns front item ('first')", q.peek(), "first")
check("peek() does not remove: size still 3", q.size(), 3)

# dequeue
check("dequeue() returns 'first'", q.dequeue(), "first")
check("After dequeue: size is 2", q.size(), 2)
check("After dequeue: peek() is 'second'", q.peek(), "second")

check("dequeue() returns 'second'", q.dequeue(), "second")
check("dequeue() returns 'third'", q.dequeue(), "third")
check("Queue is empty after all dequeues", q.is_empty(), True)

# Error on dequeue from empty
check_raises(
    "dequeue() raises IndexError on empty queue",
    lambda: q.dequeue(),
    IndexError,
    "Queue is empty",
)

# Error on peek from empty
check_raises(
    "peek() raises IndexError on empty queue",
    lambda: q.peek(),
    IndexError,
    "Queue is empty",
)

# FIFO order
q2 = Queue()
for v in [10, 20, 30]:
    q2.enqueue(v)
order = [q2.dequeue(), q2.dequeue(), q2.dequeue()]
check("Queue FIFO order: items come out in insertion order", order, [10, 20, 30])

# __str__
q3 = Queue()
check("__str__ on empty queue", _safe_str(q3), "Queue: []")
q3.enqueue("x")
q3.enqueue("y")
check("__str__ with items", _safe_str(q3), "Queue: [front-> x, y]")


# =============================================================================
# IS_BALANCED TESTS
# =============================================================================

print("\n=== is_balanced() Tests ===")

check('is_balanced("()")           -> True',  is_balanced("()"),       True)
check('is_balanced("()[]{}")       -> True',  is_balanced("()[]{}"),   True)
check('is_balanced("{[()]}")       -> True',  is_balanced("{[()]}"),   True)
check('is_balanced("([)]")         -> False', is_balanced("([)]"),     False)
check('is_balanced("{")            -> False', is_balanced("{"),        False)
check('is_balanced("")             -> True',  is_balanced(""),         True)
check('is_balanced("hello (world)") -> True', is_balanced("hello (world)"), True)
check('is_balanced("x = (1 + [2)") -> False', is_balanced("x = (1 + [2)"), False)


# =============================================================================
# SIMULATE_PRINT_QUEUE TESTS
# =============================================================================

print("\n=== simulate_print_queue() Tests ===")

jobs = ["Report.pdf", "Photo.jpg", "Letter.docx"]
result = simulate_print_queue(jobs)
check(
    "Three jobs processed in order",
    result,
    ["Printed: Report.pdf", "Printed: Photo.jpg", "Printed: Letter.docx"],
)

check(
    "Empty job list returns empty list",
    simulate_print_queue([]),
    [],
)

check(
    "Single job returns single result",
    simulate_print_queue(["only.txt"]),
    ["Printed: only.txt"],
)


# =============================================================================
# BROWSER HISTORY TESTS
# =============================================================================

print("\n=== BrowserHistory Tests ===")

b = BrowserHistory()
check("Initial current_page() is None", b.current_page(), None)

b.visit("google.com")
check("After visit('google.com'): current is 'google.com'", b.current_page(), "google.com")

b.visit("python.org")
check("After visit('python.org'): current is 'python.org'", b.current_page(), "python.org")

b.visit("docs.python.org")
check("After visit('docs.python.org'): current is 'docs.python.org'", b.current_page(), "docs.python.org")

# back
b.back()
check("After back(): current is 'python.org'", b.current_page(), "python.org")

b.back()
check("After back(): current is 'google.com'", b.current_page(), "google.com")

# forward
b.forward()
check("After forward(): current is 'python.org'", b.current_page(), "python.org")

# visiting clears forward history
b.visit("realpython.com")
check("After visit('realpython.com'): current is 'realpython.com'", b.current_page(), "realpython.com")

check_raises(
    "forward() raises IndexError after new visit (forward history cleared)",
    lambda: b.forward(),
    IndexError,
    "No forward history",
)

# back from very start
b2 = BrowserHistory()
b2.visit("a.com")
check_raises(
    "back() raises IndexError when no back history",
    lambda: b2.back(),
    IndexError,
    "No back history",
)

# back restores forward
b3 = BrowserHistory()
b3.visit("a.com")
b3.visit("b.com")
b3.visit("c.com")
b3.back()
b3.back()
check("Back twice from c.com lands on a.com", b3.current_page(), "a.com")
b3.forward()
check("Forward once from a.com lands on b.com", b3.current_page(), "b.com")
b3.forward()
check("Forward again lands on c.com", b3.current_page(), "c.com")


# =============================================================================
# SUMMARY
# =============================================================================

total = passed + failed
print(f"\n{'=' * 40}")
print(f"  {passed}/{total} tests passed")
print(f"{'=' * 40}\n")

print(f"###3COMPUTE_RESULTS:{passed}/{total}###")
