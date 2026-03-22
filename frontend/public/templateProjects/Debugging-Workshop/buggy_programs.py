"""
Debugging Workshop
==================

This file contains 5 Python functions. Each one has a bug.

Your job:
1. Run the test suite to see which tests fail:   python test_programs.py
2. Read the failing tests carefully to understand what the function should do
3. Trace through the logic to find the bug
4. Fix it, then re-run the tests to confirm
5. Document your process in debugging_notes.md

The bugs are NOT typos or syntax errors. Python would catch those immediately.
Each bug is a logic error that only shows up for certain inputs.

Good luck.
"""


# =============================================================================
# FUNCTION 1: calculate_grade
# =============================================================================

def calculate_grade(score: int) -> str:
    """
    Returns a letter grade based on a numeric score (0-100).

    Grading scale:
        90-100  ->  A
        80-89   ->  B
        70-79   ->  C
        60-69   ->  D
        0-59    ->  F
    """
    if score >= 90:
        return "A"
    elif score >= 79:
        return "B"
    elif score >= 69:
        return "C"
    elif score >= 59:
        return "D"
    else:
        return "F"


# =============================================================================
# FUNCTION 2: count_vowels
# =============================================================================

def count_vowels(text: str) -> int:
    """
    Returns the number of vowels (a, e, i, o, u) in the given text.
    The count is case-insensitive, so 'A' and 'a' both count as vowels.
    Returns 0 for an empty string.
    """
    count = 0
    for char in text:
        if char in "aeiou":
            count += 1
    return count


# =============================================================================
# FUNCTION 3: find_max
# =============================================================================

def find_max(numbers: list) -> int | float:
    """
    Returns the largest number in the list.
    Raises ValueError if the list is empty.
    """
    if len(numbers) == 0:
        raise ValueError("List cannot be empty")

    max_val = 0
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val


# =============================================================================
# FUNCTION 4: reverse_words
# =============================================================================

def reverse_words(sentence: str) -> str:
    """
    Returns the sentence with the word order reversed.
    Example: "hello world" -> "world hello"
    Example: "one two three" -> "three two one"
    """
    words = sentence.split("")
    words.reverse()
    return " ".join(words)


# =============================================================================
# FUNCTION 5: is_prime
# =============================================================================

def is_prime(n: int) -> bool:
    """
    Returns True if n is a prime number, False otherwise.
    By definition, 1 is not prime. 2 is prime.
    """
    if n < 2:
        return True
    for i in range(2, n):
        if n % i == 0:
            return False
    return True
