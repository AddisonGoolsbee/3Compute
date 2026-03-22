"""
Data Structures: Stacks and Queues
===================================

In this project, you'll implement two foundational data structures from
scratch using Python lists, then apply them to three real-world problems.

YOUR TASKS:
1. Implement the Stack class (push, pop, peek, is_empty, size, __str__)
2. Implement the Queue class (enqueue, dequeue, peek, is_empty, size, __str__)
3. Implement is_balanced() - bracket matching with a Stack
4. Implement simulate_print_queue() - print job scheduling with a Queue
5. Implement the BrowserHistory class - browser navigation with two Stacks

Run the tests to check your work: python test_structures.py
"""


# =============================================================================
# TODO #1: IMPLEMENT THE STACK CLASS
# =============================================================================

class Stack:
    """
    A Stack stores items in Last-In, First-Out (LIFO) order.

    Think of a stack of plates: you always add to the top,
    and you always remove from the top.

    Internal storage: self._items (a Python list)
    - The END of the list is the "top" of the stack.
    - self._items[-1] is the top item.

    Methods to implement:
    - push(item)   Add an item to the top
    - pop()        Remove and return the top item
    - peek()       Return the top item WITHOUT removing it
    - is_empty()   Return True if the stack has no items
    - size()       Return the number of items
    - __str__()    Return a readable string, e.g. "Stack: [1, 2, 3 <-top]"
    """

    def __init__(self):
        """Initialize an empty stack."""
        self._items = []

    def push(self, item):
        """
        Add item to the top of the stack.

        Args:
            item: The value to add (any type)

        HINT: Append to the end of self._items.
        """
        # TODO: Implement push
        pass  # Remove this line when you implement the method

    def pop(self):
        """
        Remove and return the top item from the stack.

        Returns:
            The item that was on top

        Raises:
            IndexError: If the stack is empty (message: "Stack is empty")

        HINT: Check is_empty() first, then remove from the end of self._items.
        """
        # TODO: Implement pop
        # if self.is_empty():
        #     raise IndexError("Stack is empty")
        # return self._items.pop()
        pass  # Remove this line when you implement the method

    def peek(self):
        """
        Return the top item WITHOUT removing it.

        Returns:
            The item on top of the stack

        Raises:
            IndexError: If the stack is empty (message: "Stack is empty")

        HINT: Return self._items[-1] after checking for empty.
        """
        # TODO: Implement peek
        pass  # Remove this line when you implement the method

    def is_empty(self):
        """
        Return True if the stack contains no items.

        HINT: Check the length of self._items.
        """
        # TODO: Implement is_empty
        pass  # Remove this line when you implement the method

    def size(self):
        """
        Return the number of items in the stack.

        HINT: Use len().
        """
        # TODO: Implement size
        pass  # Remove this line when you implement the method

    def __str__(self):
        """
        Return a human-readable string showing the stack contents.

        Format: "Stack: [item1, item2, item3 <-top]"
        If empty: "Stack: []"

        HINT: Build the string from self._items. The last element is the top.
        """
        # TODO: Implement __str__
        pass  # Remove this line when you implement the method


# =============================================================================
# TODO #2: IMPLEMENT THE QUEUE CLASS
# =============================================================================

class Queue:
    """
    A Queue stores items in First-In, First-Out (FIFO) order.

    Think of a line at a store: the first person in line is the first served.
    New people join at the back; service happens at the front.

    Internal storage: self._items (a Python list)
    - Index 0 is the FRONT of the queue (next to be removed).
    - New items are appended to the END (back) of the list.

    Methods to implement:
    - enqueue(item)  Add an item to the back
    - dequeue()      Remove and return the front item
    - peek()         Return the front item WITHOUT removing it
    - is_empty()     Return True if the queue has no items
    - size()         Return the number of items
    - __str__()      Return a readable string, e.g. "Queue: [front-> 1, 2, 3]"
    """

    def __init__(self):
        """Initialize an empty queue."""
        self._items = []

    def enqueue(self, item):
        """
        Add item to the back of the queue.

        Args:
            item: The value to add (any type)

        HINT: Append to the end of self._items.
        """
        # TODO: Implement enqueue
        pass  # Remove this line when you implement the method

    def dequeue(self):
        """
        Remove and return the front item from the queue.

        Returns:
            The item at the front

        Raises:
            IndexError: If the queue is empty (message: "Queue is empty")

        HINT: Remove and return self._items[0] (pop from the front).
        """
        # TODO: Implement dequeue
        # if self.is_empty():
        #     raise IndexError("Queue is empty")
        # return self._items.pop(0)
        pass  # Remove this line when you implement the method

    def peek(self):
        """
        Return the front item WITHOUT removing it.

        Returns:
            The item at the front of the queue

        Raises:
            IndexError: If the queue is empty (message: "Queue is empty")

        HINT: Return self._items[0] after checking for empty.
        """
        # TODO: Implement peek
        pass  # Remove this line when you implement the method

    def is_empty(self):
        """
        Return True if the queue contains no items.
        """
        # TODO: Implement is_empty
        pass  # Remove this line when you implement the method

    def size(self):
        """
        Return the number of items in the queue.
        """
        # TODO: Implement size
        pass  # Remove this line when you implement the method

    def __str__(self):
        """
        Return a human-readable string showing the queue contents.

        Format: "Queue: [front-> item1, item2, item3]"
        If empty: "Queue: []"
        """
        # TODO: Implement __str__
        pass  # Remove this line when you implement the method


# =============================================================================
# TODO #3: BALANCED BRACKETS (uses Stack)
# =============================================================================

def is_balanced(expression):
    """
    Check whether all brackets, parentheses, and braces in a string are
    correctly matched and nested.

    Examples:
        is_balanced("()")       -> True
        is_balanced("()[]{}")   -> True
        is_balanced("{[()]}")   -> True
        is_balanced("([)]")     -> False  (wrong closing order)
        is_balanced("{")        -> False  (unmatched open bracket)
        is_balanced("")         -> True   (empty string is balanced)

    Args:
        expression (str): Any string. Non-bracket characters are ignored.

    Returns:
        bool: True if all brackets are balanced, False otherwise.

    HOW TO APPROACH THIS:
    =====================
    Use a Stack to track opening brackets you've seen but not yet closed.

    Algorithm:
        For each character in the expression:
            If it's an opening bracket  ( [ {
                Push it onto the stack
            If it's a closing bracket  ) ] }
                If the stack is empty, return False  (nothing to match)
                Pop the top of the stack
                If the popped bracket does NOT match the current closer, return False
        After processing all characters:
            Return True only if the stack is empty
            (a non-empty stack means some opening brackets were never closed)

    Matching pairs:  (  )     [  ]     {  }

    HINT: A dictionary makes matching easy:
        matches = {')': '(', ']': '[', '}': '{'}
    """
    # TODO: Implement is_balanced using a Stack
    # matches = {')': '(', ']': '[', '}': '{'}
    # stack = Stack()
    # for char in expression:
    #     if char in '([{':
    #         stack.push(char)
    #     elif char in ')]}':
    #         if stack.is_empty():
    #             return False
    #         if stack.pop() != matches[char]:
    #             return False
    # return stack.is_empty()
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: PRINT QUEUE SIMULATION (uses Queue)
# =============================================================================

def simulate_print_queue(jobs):
    """
    Simulate a printer processing a list of print jobs in the order they
    were submitted (first come, first served).

    Args:
        jobs (list of str): Job names in submission order.
                            Example: ["Report.pdf", "Photo.jpg", "Letter.docx"]

    Returns:
        list of str: Job completion messages in processing order.
                     Each message is formatted as: "Printed: {job}"
                     Example: ["Printed: Report.pdf", "Printed: Photo.jpg", ...]

    HOW TO APPROACH THIS:
    =====================
    1. Create a Queue
    2. Enqueue all jobs from the list
    3. Dequeue each job one at a time until the queue is empty
    4. For each dequeued job, append "Printed: {job}" to a results list
    5. Return the results list

    HINT: Use a while loop that continues as long as the queue is not empty.
    """
    # TODO: Implement simulate_print_queue using a Queue
    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #5: BROWSER HISTORY (uses two Stacks)
# =============================================================================

class BrowserHistory:
    """
    Simulate the back/forward navigation of a web browser.

    Design:
        back_stack    -- pages you can go BACK to (most recent at top)
        forward_stack -- pages you can go FORWARD to after pressing Back

    Rules:
        visit(url):
            Push the current page onto back_stack (if there is a current page).
            Set current page to url.
            Clear forward_stack (visiting a new page erases forward history).

        back():
            Push the current page onto forward_stack.
            Pop the top of back_stack and make it the current page.
            Raise IndexError("No back history") if back_stack is empty.

        forward():
            Push the current page onto back_stack.
            Pop the top of forward_stack and make it the current page.
            Raise IndexError("No forward history") if forward_stack is empty.

        current_page():
            Return the current page URL (a string), or None if no page loaded.
    """

    def __init__(self):
        """Initialize with no current page and empty history stacks."""
        self._current = None
        self._back_stack = Stack()
        self._forward_stack = Stack()

    def visit(self, url):
        """
        Navigate to a new URL.

        - If there is a current page, push it onto back_stack.
        - Set current page to url.
        - Clear forward_stack (new navigation erases forward history).

        Args:
            url (str): The URL to navigate to.

        HINT: To clear a stack, you can create a new empty Stack:
              self._forward_stack = Stack()
        """
        # TODO: Implement visit
        pass  # Remove this line when you implement the method

    def back(self):
        """
        Go back to the previous page.

        - Push current page onto forward_stack.
        - Pop back_stack and set it as the current page.

        Raises:
            IndexError: With message "No back history" if back_stack is empty.
        """
        # TODO: Implement back
        pass  # Remove this line when you implement the method

    def forward(self):
        """
        Go forward to the next page (after pressing Back).

        - Push current page onto back_stack.
        - Pop forward_stack and set it as the current page.

        Raises:
            IndexError: With message "No forward history" if forward_stack is empty.
        """
        # TODO: Implement forward
        pass  # Remove this line when you implement the method

    def current_page(self):
        """
        Return the URL of the current page, or None if no page is loaded.
        """
        # TODO: Implement current_page
        pass  # Remove this line when you implement the method


# =============================================================================
# DEMO (PROVIDED) - runs when you execute: python main.py
# =============================================================================

def main():
    print("=" * 60)
    print("  DATA STRUCTURES DEMO")
    print("=" * 60)

    # --- Stack demo ---
    print("\n--- Stack (LIFO) ---")
    s = Stack()
    for value in [10, 20, 30]:
        s.push(value)
        print(f"  push({value})  ->  {s}")
    print(f"  peek()   ->  {s.peek()}")
    print(f"  pop()    ->  {s.pop()}   stack is now: {s}")

    # --- Queue demo ---
    print("\n--- Queue (FIFO) ---")
    q = Queue()
    for value in ["A", "B", "C"]:
        q.enqueue(value)
        print(f"  enqueue({value!r})  ->  {q}")
    print(f"  peek()     ->  {q.peek()!r}")
    print(f"  dequeue()  ->  {q.dequeue()!r}   queue is now: {q}")

    # --- Balanced brackets ---
    print("\n--- Balanced Brackets ---")
    test_cases = ["()", "()[]{}", "{[()]}", "([)]", "{", ""]
    for expr in test_cases:
        result = is_balanced(expr)
        display = repr(expr) if expr else '""'
        print(f"  is_balanced({display:12s}) ->  {result}")

    # --- Print queue simulation ---
    print("\n--- Print Queue Simulation ---")
    jobs = ["Report.pdf", "Photo.jpg", "Letter.docx"]
    results = simulate_print_queue(jobs)
    for line in results:
        print(f"  {line}")

    # --- Browser history ---
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
    # Quick check: if the classes aren't implemented yet, show a helpful message
    s = Stack()
    if s.is_empty() is None:
        print("It looks like you haven't implemented the required classes yet.")
        print("Open main.py and complete the TODO sections:")
        print("  1. Stack class")
        print("  2. Queue class")
        print("  3. is_balanced()")
        print("  4. simulate_print_queue()")
        print("  5. BrowserHistory class")
        print("\nRun 'python test_structures.py' to test your implementations.")
    else:
        main()
