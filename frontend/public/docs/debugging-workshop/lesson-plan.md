# Debugging Workshop: Instructor Lesson Plan

## Overview

Students receive a Python file containing five functions, each with a logic bug.
They run a test suite, systematically diagnose each failure, document their
reasoning, write additional test cases to verify their fixes, and extend one
function with new functionality.

**Estimated Duration:** 3-4 class periods (45-50 minutes each)

**Grade Level:** 9-10

**Prerequisites:**
- Basic Python: variables, functions, conditionals, loops
- Some familiarity with lists and strings
- No prior debugging experience required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-CS-03** | Develop guidelines that convey systematic troubleshooting strategies that others can use to identify and fix errors. | Students learn and apply a four-step debugging process (read the error, isolate, hypothesize, test). They document each step in `debugging_notes.md`, producing a reusable reference. |
| **3A-AP-21** | Evaluate and refine computational artifacts to make them more usable and accessible. | Students improve five broken programs by identifying the source of each failure and making targeted corrections. |
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A provided test suite drives the debugging process. Students also write their own additional test cases to confirm their fixes cover edge cases. |
| **3B-AP-22** | Modify an existing program to add additional functionality and discuss intended and unintended implications. | The extension challenge asks students to add a `get_grade_points` function and explicitly discuss implications for existing code and future maintainability. |
| **3B-AP-23** | Evaluate key qualities of a program through a process such as a code review. | The optional Day 4 activity includes a structured peer code review using the checklist in the README. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis. | Debugging naturally decomposes a broken program into independent functions, each isolated and fixed in turn. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Apply** a systematic four-step process to diagnose a logic error in a function
2. **Distinguish** between syntax errors (caught by Python) and logic errors (caught by tests or reasoning)
3. **Use** print statements strategically to trace program execution
4. **Write** test cases that target boundary values and edge cases
5. **Document** a debugging session clearly enough that another person could follow their reasoning
6. **Discuss** the implications of adding new functionality to existing code

---

## Lesson Sequence

### Day 1: Introduction to Debugging (45 min)

**Objectives:**
- Distinguish syntax errors from logic errors
- Understand the four-step debugging process
- Try debugging without a computer first

**Activities:**

1. **Warm-up discussion (5 min):**
   Ask students: "Has a program ever done something unexpected even though Python
   didn't give an error? What did you do?" Collect a few responses. This surfaces
   prior experience and frames the difference between crashes and wrong answers.

2. **Direct instruction: bug types (10 min):**
   Cover the four bug types from the README on the board with simple examples.
   Emphasize that logic errors are silent: Python runs the code without complaint
   and returns a wrong answer. The only way to catch them is to know what the
   correct answer should be.

3. **Unplugged activity: paper debugging (15 min):**
   Give students this printed function and ask them to find the bug by hand:

   ```python
   def celsius_to_fahrenheit(c):
       """Converts Celsius to Fahrenheit. Formula: (C * 9/5) + 32"""
       return (c * 9) + 32
   ```

   Ask: "What does this return for c=0? What should it return? Where is the error?"
   Then repeat for c=100.

   This is a deliberate warm-up on paper before the computer work. Students who
   struggle here will need more scaffolding on Day 2.

4. **Introduce the project (10 min):**
   Walk through the structure of `buggy_programs.py` and `test_programs.py` together.
   Show how to run `python test_programs.py` and read the output. Pick one failing
   test and walk through steps 1-2 of the debugging process together, stopping
   before you reach the fix.

5. **Wrap-up (5 min):**
   Students open the project and run the tests on their own. Their homework or
   start-of-Day-2 task: identify which tests fail and write one hypothesis for
   Bug 1 in their notes.

**Materials:**
- Printed copies of the paper debugging warm-up (optional but recommended)
- Project template access

---

### Day 2: Fix Bugs 1, 2, and 3 (45 min)

**Objectives:**
- Apply the four-step process to diagnose and fix off-by-one, missing-case, and wrong-initial-value bugs
- Use print debugging to trace execution

**Activities:**

1. **Review (5 min):**
   Have two or three students share their hypothesis for Bug 1 from the warm-up.
   Do not confirm or deny yet. Let them test it during the work period.

2. **Structured work time (35 min):**
   Students work on bugs 1, 2, and 3. Circulate and ask Socratic questions rather
   than providing answers:
   - "What does the test tell you the input was?"
   - "What did you expect that line to evaluate to? What does it actually evaluate to?"
   - "Have you added a print statement to confirm your hypothesis?"

   Common sticking points by bug:

   **Bug 1 (calculate_grade):** Students often spot the wrong boundary quickly once
   they test 80, 70, or 60 directly. The challenge is articulating why the boundary
   is wrong. Push them to explain it in words before changing the code.

   **Bug 2 (count_vowels):** Students may not think to test uppercase right away.
   If they are stuck, ask: "Does the docstring say anything about case?" This is a
   good moment to discuss reading specifications carefully.

   **Bug 3 (find_max):** This is the subtlest of the three. The function works fine
   for lists of positive numbers, which is most of what students test first. Ask:
   "What happens if every number in the list is negative? What is `max_val` before
   the loop starts?"

3. **Debrief (5 min):**
   Brief whole-class check-in. How many have all three? What was hardest?

**Instructor Notes:**
- Bug 3 is intentionally harder than the other four. If most students are stuck at
  the end of the period, a hint is appropriate: "Try calling `find_max([-5, -2, -9])`
  and see what you get."

---

### Day 3: Fix Bugs 4 and 5, Write Tests (45 min)

**Objectives:**
- Fix the remaining two bugs
- Write additional test cases that target the exact inputs the bugs affect
- Complete `debugging_notes.md`

**Activities:**

1. **Warm-up: test case design (10 min):**
   Before students open their computers, present this question:

   "A function called `is_even(n)` is supposed to return True for even numbers and
   False for odd numbers. List five test cases you would run to feel confident it
   works. Justify each one."

   Discuss as a class. The goal is to surface the concept of boundary testing and
   category coverage (zero, negative, large number) before students write their own
   tests for the debugging project.

2. **Structured work time: bugs 4 and 5 (20 min):**
   Students finish the remaining two bugs.

   **Bug 4 (reverse_words):** This one raises an actual exception, which is a
   different experience from the silent logic errors. Students see a traceback for
   the first time in this project. Point out that the traceback tells you exactly
   which line failed and what the error was. Ask: "What does `split("")` mean?
   What does `split()` mean? What is the difference?"

   **Bug 5 (is_prime):** Students need to test n=0 or n=1. The function handles
   every case correctly except the `n < 2` edge case, where the condition returns
   the wrong value. This reinforces reading the docstring: "By definition, 1 is not
   prime."

3. **Writing test cases (15 min):**
   Students add their own test cases to the "Your Tests" section of `test_programs.py`.
   Require at least two test cases per function (ten total). Encourage them to test
   the specific inputs that would have triggered their bugs.

   Walking around and reviewing their tests is more valuable here than reviewing
   their fixes. A student who writes `check("score 80 -> B", calculate_grade(80), "B")`
   understands the bug. A student who writes `check("score 95 -> A", calculate_grade(95), "A")`
   may have fixed the code without understanding why.

**Instructor Notes:**
- Students who finish early can start `debugging_notes.md` if they have not already.
  Require the notes to be complete before the extension challenge.

---

### Day 4 (Optional): Code Review and Extension (45 min)

**Objectives:**
- Practice structured peer code review
- Add `get_grade_points` and discuss implications of new functionality
- Reflect on program quality

**Activities:**

1. **Peer code review (20 min):**
   Students pair up and exchange their fixed `buggy_programs.py` files. Each reviewer
   checks:
   - Do all tests pass?
   - Is each fix minimal (changes only what is necessary)?
   - Is the code readable? Are variable names still clear?
   - Does `debugging_notes.md` accurately describe the root cause?

   Students give written feedback on one thing they noticed. The goal is not to find
   new bugs at this point, but to practice the habit of reading others' code
   critically.

2. **Extension challenge (20 min):**
   Students who have completed the notes work on the `get_grade_points` extension.
   The key discussion to facilitate:

   - "If you change the grading scale later, do you now have two places to update
     instead of one? Is that a problem?"
   - "What happens if someone calls `get_grade_points('Z')`? Should it raise an
     error, return a default, or something else? Who decides?"
   - "Is there any way to write `calculate_grade` and `get_grade_points` so that the
     grading scale only lives in one place in the code?"

   This discussion connects to real software maintenance concerns without requiring
   students to know design patterns. The point is to develop the habit of thinking
   ahead.

3. **Wrap-up (5 min):**
   Ask: "What is one thing you will do differently next time you write a function?"
   Collect a few answers. Common good answers: test with edge cases from the start,
   read the docstring before assuming you understand the function, initialize
   variables more carefully.

---

## Assessment Ideas

### Formative Assessment

- **Test suite results:** The test output is objective. Students can self-report
  their pass count at the end of each day.
- **Debugging notes:** Review notes for specificity. "The boundary was wrong" is
  incomplete. "The condition `>= 79` should be `>= 80` because 80 is the lowest B
  grade" is complete.
- **Test cases written:** Check that student-added tests cover the exact inputs that
  triggered each bug, not just cases the original tests already covered.

### Summative Assessment

**Option A: Notes and code submission**

Students submit their completed `buggy_programs.py` and `debugging_notes.md`.

Rubric:
- All 5 bugs fixed, all tests pass (40%)
- Debugging notes: each section has a specific root cause and before/after fix (40%)
- Student-written test cases: at least 10 total, targeting boundaries and edge cases (20%)

**Option B: Live debugging**

Present a student with a new buggy function they have not seen. Give them 10 minutes
to find and fix it using the four-step process. Ask them to narrate what they are doing.

Rubric:
- Reads the failing test before changing code (20%)
- Adds a print statement or traces by hand before guessing (30%)
- States a specific hypothesis before making a change (30%)
- Fix is correct (20%)

**Option C: Extension and reflection**

Students complete the `get_grade_points` extension and write a one-page response
addressing the design questions in `debugging_notes.md`.

---

## Differentiation

### For students who need more support

- Have them work on bugs 1 and 2 on Day 1 so they have more time
- Provide the hint: "Try the function with the exact boundary value from the docstring"
  before they spend more than 10 minutes stuck
- Allow pair work throughout; one student traces by hand while the other watches the
  output

### For students who finish early

- Skip the extension and ask them to write a sixth buggy function with a deliberate
  logic error, then trade it with another student who finished early
- Ask them to write a short explanation of each bug type suitable for a student who
  has never debugged before (this is a useful exercise in articulating what they know)
- Challenge: can they write a function where the same logic error causes wrong
  output for one input type but not another? What does that suggest about test
  coverage?

---

## Common Student Errors and How to Respond

| What you observe | Likely issue | What to ask |
|-----------------|--------------|-------------|
| Student changes code immediately after seeing a failing test | Not reading carefully before acting | "Before you change anything, tell me what input caused the failure and what you expected to get back." |
| Student adds print statements everywhere | Not forming a hypothesis first | "What specific thing are you trying to confirm? Where in the function would you put the print to answer that question?" |
| Student fixes the bug but notes say "I changed the number and it worked" | Did not understand root cause | "Why was the old number wrong? What rule does the docstring describe that the old code violated?" |
| Student's new test cases all pass before they fix anything | Tests duplicate the original test cases | "Run just your new tests before you make a fix. If they pass, they are not testing the right thing." |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete fixed version with explanations (instructor only) |
| `lesson-plan.md` | This document |
| **Debugging-Workshop student template** | |
| `buggy_programs.py` | Five functions with logic bugs |
| `test_programs.py` | Test suite with student test section |
| `debugging_notes.md` | Template for documenting the debugging process |
| `README.md` | Student-facing instructions and reference |
| `requirements.txt` | Empty (no dependencies) |

---

*Last updated: March 2026*
