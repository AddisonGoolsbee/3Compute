"""
Data Structures: Stacks and Queues — REFERENCE SOLUTION
=========================================================
Instructor use only. Do not distribute to students.
"""


# =============================================================================
# STACK
# =============================================================================

class Stack:
    """A Last-In, First-Out (LIFO) data structure."""

    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        if self.is_empty():
            raise IndexError("Stack is empty")
        return self._items.pop()

    def peek(self):
        if self.is_empty():
            raise IndexError("Stack is empty")
        return self._items[-1]

    def is_empty(self):
        return len(self._items) == 0

    def size(self):
        return len(self._items)

    def __str__(self):
        if self.is_empty():
            return "Stack: []"
        return "Stack: [" + ", ".join(str(item) for item in self._items) + " <-top]"


# =============================================================================
# QUEUE
# =============================================================================

class Queue:
    """A First-In, First-Out (FIFO) data structure."""

    def __init__(self):
        self._items = []

    def enqueue(self, item):
        self._items.append(item)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("Queue is empty")
        return self._items.pop(0)

    def peek(self):
        if self.is_empty():
            raise IndexError("Queue is empty")
        return self._items[0]

    def is_empty(self):
        return len(self._items) == 0

    def size(self):
        return len(self._items)

    def __str__(self):
        if self.is_empty():
            return "Queue: []"
        return "Queue: [front-> " + ", ".join(str(item) for item in self._items) + "]"


# =============================================================================
# APPLICATION 1: BALANCED BRACKETS
# =============================================================================

def is_balanced(expression):
    """
    Return True if all brackets/parens/braces in expression are balanced.

    Algorithm:
    - Push opening brackets onto a Stack.
    - When a closing bracket is encountered, pop and verify it matches.
    - At the end, the Stack must be empty.
    """
    matches = {')': '(', ']': '[', '}': '{'}
    stack = Stack()

    for char in expression:
        if char in '([{':
            stack.push(char)
        elif char in ')]}':
            if stack.is_empty():
                return False
            if stack.pop() != matches[char]:
                return False

    return stack.is_empty()


# =============================================================================
# APPLICATION 2: PRINT QUEUE SIMULATION
# =============================================================================

def simulate_print_queue(jobs):
    """
    Process print jobs in submission order using a Queue.

    Returns a list of "Printed: {job}" strings.
    """
    queue = Queue()
    for job in jobs:
        queue.enqueue(job)

    results = []
    while not queue.is_empty():
        job = queue.dequeue()
        results.append(f"Printed: {job}")

    return results


# =============================================================================
# APPLICATION 3: BROWSER HISTORY
# =============================================================================

class BrowserHistory:
    """
    Browser back/forward navigation implemented with two stacks.

    back_stack:    pages you can go back to (top = most recent previous page)
    forward_stack: pages you can go forward to (top = most recently backed-away-from page)
    """

    def __init__(self):
        self._current = None
        self._back_stack = Stack()
        self._forward_stack = Stack()

    def visit(self, url):
        """Navigate to url. Saves current page to back_stack. Clears forward_stack."""
        if self._current is not None:
            self._back_stack.push(self._current)
        self._current = url
        self._forward_stack = Stack()

    def back(self):
        """Go back one page. Raises IndexError('No back history') if unavailable."""
        if self._back_stack.is_empty():
            raise IndexError("No back history")
        self._forward_stack.push(self._current)
        self._current = self._back_stack.pop()

    def forward(self):
        """Go forward one page. Raises IndexError('No forward history') if unavailable."""
        if self._forward_stack.is_empty():
            raise IndexError("No forward history")
        self._back_stack.push(self._current)
        self._current = self._forward_stack.pop()

    def current_page(self):
        """Return the current page URL, or None if no page has been visited."""
        return self._current


# =============================================================================
# DEMO
# =============================================================================

def main():
    print("=" * 60)
    print("  DATA STRUCTURES DEMO")
    print("=" * 60)

    print("\n--- Stack (LIFO) ---")
    s = Stack()
    for value in [10, 20, 30]:
        s.push(value)
        print(f"  push({value})  ->  {s}")
    print(f"  peek()   ->  {s.peek()}")
    print(f"  pop()    ->  {s.pop()}   stack is now: {s}")

    print("\n--- Queue (FIFO) ---")
    q = Queue()
    for value in ["A", "B", "C"]:
        q.enqueue(value)
        print(f"  enqueue({value!r})  ->  {q}")
    print(f"  peek()     ->  {q.peek()!r}")
    print(f"  dequeue()  ->  {q.dequeue()!r}   queue is now: {q}")

    print("\n--- Balanced Brackets ---")
    test_cases = ["()", "()[]{}", "{[()]}", "([)]", "{", ""]
    for expr in test_cases:
        result = is_balanced(expr)
        display = repr(expr) if expr else '""'
        print(f"  is_balanced({display:12s}) ->  {result}")

    print("\n--- Print Queue Simulation ---")
    jobs = ["Report.pdf", "Photo.jpg", "Letter.docx"]
    results = simulate_print_queue(jobs)
    for line in results:
        print(f"  {line}")

    print("\n--- Browser History ---")
    browser = BrowserHistory()
    browser.visit("google.com")
    browser.visit("python.org")
    browser.visit("docs.python.org")
    print(f"  Current: {browser.current_page()}")
    browser.back()
    print(f"  After back(): {browser.current_page()}")
    browser.back()
    print(f"  After back(): {browser.current_page()}")
    browser.forward()
    print(f"  After forward(): {browser.current_page()}")
    browser.visit("realpython.com")
    print(f"  After visit('realpython.com'): {browser.current_page()}")
    try:
        browser.forward()
    except IndexError as e:
        print(f"  forward() raised IndexError: {e}")


if __name__ == "__main__":
    main()
