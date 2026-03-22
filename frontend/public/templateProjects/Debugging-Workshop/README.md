# Debugging Workshop

This project contains 5 Python programs that have bugs. Your job is to find and fix them.

Each function works for some inputs but returns the wrong answer for others. The bugs are
not typos and Python will not point them out for you. You will need to read the logic,
test with specific inputs, and think carefully about what the code is actually doing vs.
what it is supposed to do.

## Quick Start

1. **Read the code:** Open `buggy_programs.py` and read each function and its docstring
2. **Run the tests:** `python test_programs.py`
3. **Pick a failing function:** Read the test output to understand what went wrong
4. **Debug it:** Use the process below
5. **Document it:** Fill in `debugging_notes.md` as you go
6. **Repeat** until all tests pass

---

## The Functions

| Function | What it does |
|----------|-------------|
| `calculate_grade(score)` | Returns a letter grade (A/B/C/D/F) for a numeric score |
| `count_vowels(text)` | Counts vowels in a string, case-insensitive |
| `find_max(numbers)` | Returns the largest number in a list |
| `reverse_words(sentence)` | Reverses the order of words in a sentence |
| `is_prime(n)` | Returns True if n is prime, False otherwise |

---

## Systematic Debugging Process

When a test fails, work through these four steps before changing any code.

### Step 1: Read the failing test carefully

The test tells you the exact input that caused the problem and what output was expected.
That is your starting point. Do not guess.

```
❌ score 80 -> B
     expected: 'B'
     got:      'C'
```

This tells you: `calculate_grade(80)` returned `'C'` but should return `'B'`.

### Step 2: Isolate the problem

Trace through the function by hand for that specific input. Use the simplest failing
input, not a complicated one. For `calculate_grade(80)`, walk through each `if`/`elif`
condition one by one and check which branch runs.

You can also add a quick print statement to confirm what the code is doing:

```python
def calculate_grade(score):
    print(f"score={score}")
    if score >= 90:
        print("taking the A branch")
        return "A"
    elif score >= 79:
        print("taking the B branch")
        return "B"
    ...
```

Remove the print statements once you have found the bug.

### Step 3: Form a hypothesis

Before making any change, state clearly what you think the bug is. Write it in
`debugging_notes.md`. A hypothesis like "the B boundary is wrong, it should be 80
not 79" is specific enough to test. "Something is off with the conditions" is not.

### Step 4: Test your hypothesis

Make the change you think will fix it, then run `python test_programs.py` again.
If the tests you expected to pass now pass, and no new tests broke, you are done
with that function.

If the tests still fail, your hypothesis was wrong. Go back to step 2 with new
information.

---

## Common Bug Types

Knowing the categories helps you spot them faster.

**Off-by-one error:** A boundary condition is one too high or one too low.

```python
# Supposed to include 80, but 80 >= 81 is False
if score >= 81:
    return "B"
```

**Wrong operator or variable:** The right logic, but using the wrong thing.

```python
# Checks for uppercase C but lowercase is also a vowel
if char in "AEIOU":
    count += 1
```

**Bad initial value:** A variable is initialized to the wrong starting value,
which makes the function fail for certain input ranges.

```python
# If all numbers in the list are negative, this will never update
max_val = 0
```

**Wrong argument:** Calling a method or function with an argument that is close
to right but not quite.

```python
# split("") raises an error; split() or split(" ") is what was meant
words = sentence.split("")
```

**Edge case not handled:** The function works for typical inputs but a certain
category of input (empty list, zero, negative number) was not considered.

```python
# n=1 should return False, but the code never checks for it
def is_prime(n):
    for i in range(2, n): ...
```

---

## Print Debugging

Adding temporary print statements is one of the most straightforward debugging
techniques. The goal is to confirm what values the code actually sees at each step.

```python
def find_max(numbers):
    max_val = 0
    print(f"starting with max_val={max_val}")
    for num in numbers:
        print(f"  checking num={num}, current max_val={max_val}")
        if num > max_val:
            max_val = num
            print(f"  updated max_val to {max_val}")
    print(f"returning {max_val}")
    return max_val
```

Run it with the input that fails and read the trace. The bug will usually become
visible.

Remember to remove print statements when you are done.

---

## The Rubber Duck Method

If you are stuck, explain the function out loud as if you are teaching it to
someone who has never seen code. Say every step: "First it checks if the length
is zero. Then it sets max_val to 0. Then it loops through each number..."

You will often catch the problem yourself mid-sentence. The act of putting it into
words forces your brain to actually process each line rather than skim over it.

If no rubber duck is available, write the explanation in your debugging notes.

---

## Writing Good Test Cases

After you fix each bug, add test cases to the "Your Tests" section of
`test_programs.py`. A good test case:

- Uses a specific input you can reason about manually
- Focuses on the boundaries of the function's behavior
- Covers cases that are easy to get wrong (zero, negative, empty, uppercase)

For example, if a function works on ranges, always test the exact boundary values:

```python
check("score 80 -> B", calculate_grade(80), "B")   # lowest B
check("score 79 -> C", calculate_grade(79), "C")   # highest C
```

---

## Extension Challenge

Once all five bugs are fixed, try this extension. Details are in `debugging_notes.md`.

Add a `get_grade_points(grade: str) -> float` function that maps a letter grade to
GPA points (A=4.0, B=3.0, C=2.0, D=1.0, F=0.0).

Before writing the function, answer the design questions in your notes. After writing
it, add test cases in `test_programs.py` and reflect on what implications adding this
new function has on the existing code.
