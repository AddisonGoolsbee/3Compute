"""
Recursion Warm-Up: factorial(n) — REFERENCE IMPLEMENTATION
===========================================================

Instructor reference. Do not share with students.
"""


def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)


if __name__ == "__main__":
    for i in range(6):
        print(f"factorial({i}) = {factorial(i)}")
