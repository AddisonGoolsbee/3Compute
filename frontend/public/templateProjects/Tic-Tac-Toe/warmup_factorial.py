"""
Recursion Warm-Up: factorial(n)
================================

Before you tackle minimax, get one easy recursive function under your belt.

The factorial of a non-negative integer n (written n!) is the product of
every positive integer up to n:

    0! = 1                  (defined this way — the empty product)
    1! = 1
    2! = 2 * 1 = 2
    3! = 3 * 2 * 1 = 6
    4! = 4 * 3 * 2 * 1 = 24
    5! = 5 * 4 * 3 * 2 * 1 = 120

You COULD write this with a for loop, but write it recursively. Recursion
is the only way through minimax later, so practice the shape now.

EVERY RECURSIVE FUNCTION HAS TWO PARTS:

    1. Base case — the smallest input the function knows how to answer
       directly, with no further calls. For factorial, that's n == 0.
    2. Recursive case — express the answer for n using the answer for a
       SMALLER input. For factorial: n! = n * (n - 1)!

Sketch:

    factorial(n):
        if n == 0:
            return 1                          # base case
        return n * factorial(n - 1)           # recursive case

Run the test suite to check your work:

    python test_warmup.py

Once it passes, move on to main.py.
"""


def factorial(n):
    """
    Return n! (n factorial) for a non-negative integer n.

    Args:
        n: a non-negative integer (0, 1, 2, 3, ...)

    Returns:
        The product 1 * 2 * ... * n.  factorial(0) is 1.
    """
    raise NotImplementedError("Implement factorial() in warmup_factorial.py")


if __name__ == "__main__":
    # Quick sanity check — run this file directly to see your output.
    for i in range(6):
        print(f"factorial({i}) = {factorial(i)}")
