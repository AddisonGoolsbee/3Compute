# Debugging Notes

Use this document to record your process as you work through each bug.
Writing it down helps you think more clearly and builds habits that carry
over to any future debugging you do.

Fill in each section after you fix that function.

---

## Bug 1: `calculate_grade`

**What tests failed?**

(List the specific test cases that showed the wrong output.)

**What I tried:**

(Describe what you looked at first, what print statements you added, etc.)

**Root cause:**

(One or two sentences explaining exactly what the bug was.)

**Fix:**

(Show the line(s) you changed. Before and after.)

---

## Bug 2: `count_vowels`

**What tests failed?**

**What I tried:**

**Root cause:**

**Fix:**

---

## Bug 3: `find_max`

**What tests failed?**

**What I tried:**

**Root cause:**

**Fix:**

---

## Bug 4: `reverse_words`

**What tests failed?**

**What I tried:**

**Root cause:**

**Fix:**

---

## Bug 5: `is_prime`

**What tests failed?**

**What I tried:**

**Root cause:**

**Fix:**

---

## Extension Challenge

After fixing all five bugs, add a `get_grade_points(grade: str) -> float` function
to `buggy_programs.py`. It should map letter grades to GPA points:

| Grade | GPA Points |
|-------|-----------|
| A     | 4.0       |
| B     | 3.0       |
| C     | 2.0       |
| D     | 1.0       |
| F     | 0.0       |

**Design questions to answer before you write any code:**

1. What should the function do if it receives an invalid grade like "Z" or "a"?
2. Does adding this function require any changes to `calculate_grade`? Why or why not?
3. If a future programmer changes the grading scale (say, adds an A+ for scores 97+),
   what would they need to update? Is there a way to design the two functions to reduce
   that risk?

**After writing the function:**

Write at least 6 test cases for it in the "Your Tests" section of `test_programs.py`.
Include at least one test for each valid grade and one test for an invalid input.

**What unintended implications did you consider?**

(Write your answer here after completing the extension.)
