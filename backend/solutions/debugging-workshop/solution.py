"""
Debugging Workshop: Instructor Solution
========================================

This file shows the corrected versions of all five functions and explains
each bug and fix. Keep this file instructor-only.

Do not distribute to students before they have completed the project.
"""


# =============================================================================
# FUNCTION 1: calculate_grade
# =============================================================================
#
# BUG:
#   The boundary conditions for B, C, and D are each one too low.
#   Original code used >= 79, >= 69, >= 59.
#   A score of 80 would evaluate 80 >= 79 as True and return "B" — wait,
#   that actually returns B correctly for 80. The real failure is at the
#   *top* of each range:
#
#     calculate_grade(79) -> should be C, but 79 >= 79 is True -> returns "B"
#     calculate_grade(69) -> should be D, but 69 >= 69 is True -> returns "C"
#     calculate_grade(59) -> should be F, but 59 >= 59 is True -> returns "D"
#
#   In other words, the boundaries are off by one: 79 should be the highest C,
#   not the lowest B. Same for 69 and 59.
#
# FIX:
#   Change the thresholds from >= 79, >= 69, >= 59
#                              to >= 80, >= 70, >= 60.
#
# WHY STUDENTS MISS IT:
#   If you only test "typical" scores like 85, 75, 65 the bug is invisible.
#   It only surfaces when you test the exact boundary value for each grade.

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
    elif score >= 80:   # was: >= 79
        return "B"
    elif score >= 70:   # was: >= 69
        return "C"
    elif score >= 60:   # was: >= 59
        return "D"
    else:
        return "F"


# =============================================================================
# FUNCTION 2: count_vowels
# =============================================================================
#
# BUG:
#   The membership test `if char in "aeiou"` only matches lowercase vowels.
#   Uppercase letters like 'A', 'E', 'I', 'O', 'U' are not in the string
#   "aeiou", so they are silently skipped.
#
# FIX:
#   Change `if char in "aeiou"` to `if char.lower() in "aeiou"`.
#   Alternatively: `if char in "aeiouAEIOU"`.
#
# WHY STUDENTS MISS IT:
#   If you test with "hello" or "python" the function returns the right answer.
#   You need to test with a string that actually contains uppercase vowels.

def count_vowels(text: str) -> int:
    """
    Returns the number of vowels (a, e, i, o, u) in the given text.
    The count is case-insensitive, so 'A' and 'a' both count as vowels.
    Returns 0 for an empty string.
    """
    count = 0
    for char in text:
        if char.lower() in "aeiou":   # was: if char in "aeiou"
            count += 1
    return count


# =============================================================================
# FUNCTION 3: find_max
# =============================================================================
#
# BUG:
#   `max_val` is initialized to 0 instead of `numbers[0]`.
#   This works fine when the list contains at least one positive number,
#   because any positive number beats the starting value of 0.
#   But when every number in the list is negative, no number is ever
#   greater than 0, so `max_val` stays at 0 and the function returns 0
#   instead of the actual largest (least-negative) value.
#
# FIX:
#   Initialize max_val = numbers[0] instead of max_val = 0.
#   Since the empty-list check happens before this line, numbers[0] is safe.
#
# WHY STUDENTS MISS IT:
#   The typical test inputs for a max function are positive numbers.
#   All-negative lists are an easy edge case to overlook.

def find_max(numbers: list) -> int | float:
    """
    Returns the largest number in the list.
    Raises ValueError if the list is empty.
    """
    if len(numbers) == 0:
        raise ValueError("List cannot be empty")

    max_val = numbers[0]   # was: max_val = 0
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val


# =============================================================================
# FUNCTION 4: reverse_words
# =============================================================================
#
# BUG:
#   `sentence.split("")` passes an empty string as the separator. Python's
#   str.split() does not accept an empty string separator and raises:
#     ValueError: empty separator
#
# FIX:
#   Change `sentence.split("")` to `sentence.split()`.
#   Calling split() with no argument splits on any whitespace, which is the
#   correct behavior for splitting a sentence into words.
#   (sentence.split(" ") also works for simple single-space sentences.)
#
# WHY STUDENTS MISS IT:
#   split("") looks plausible at a glance: students sometimes think "" means
#   "split on spaces". The distinction between split() and split("") is subtle
#   and easy to overlook unless you know what each does.

def reverse_words(sentence: str) -> str:
    """
    Returns the sentence with the word order reversed.
    Example: "hello world" -> "world hello"
    Example: "one two three" -> "three two one"
    """
    words = sentence.split()   # was: sentence.split("")
    words.reverse()
    return " ".join(words)


# =============================================================================
# FUNCTION 5: is_prime
# =============================================================================
#
# BUG:
#   The condition `if n < 2: return True` is backwards.
#   By definition, 0 and 1 are not prime. The condition should return False
#   for any n < 2, not True.
#
# FIX:
#   Change `return True` to `return False` inside the `if n < 2` block.
#
# WHY STUDENTS MISS IT:
#   Primes are typically associated with returning True, so returning True
#   at the top of the function can feel natural before you think it through.
#   Students also tend to test with positive integers greater than 1 first,
#   where this condition never runs.

def is_prime(n: int) -> bool:
    """
    Returns True if n is a prime number, False otherwise.
    By definition, 1 is not prime. 2 is prime.
    """
    if n < 2:
        return False   # was: return True
    for i in range(2, n):
        if n % i == 0:
            return False
    return True


# =============================================================================
# EXTENSION: get_grade_points
# =============================================================================
#
# One clean implementation. Note that the grade-to-points mapping is defined
# once in a dictionary. If the grading scale changes, there is only one place
# to update, and both functions can use it.
#
# Students are not expected to arrive at this design automatically; it is
# included here as a discussion point for the code review day.

GRADE_POINTS = {
    "A": 4.0,
    "B": 3.0,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0,
}


def get_grade_points(grade: str) -> float:
    """
    Returns the GPA point value for a letter grade.
    Valid grades: A, B, C, D, F.
    Raises ValueError for any other input.
    """
    if grade not in GRADE_POINTS:
        raise ValueError(f"Invalid grade: {repr(grade)}")
    return GRADE_POINTS[grade]
