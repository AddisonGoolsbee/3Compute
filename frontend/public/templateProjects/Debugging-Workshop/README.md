# Debugging Workshop

This project contains five Python functions that all have bugs. Your job is to find the bugs and fix them.

Each function works correctly for some inputs but returns the wrong answer for others. The bugs are not typos, so Python will not point them out for you. You have to read the logic, test with specific inputs, and think carefully about what the code is actually doing compared to what it is supposed to do.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## Setup

Right-click the `Debugging-Workshop` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies:

```bash
pip install -r requirements.txt
```

## What This README Covers

- The five buggy functions and what each is supposed to do
- A four-step systematic debugging process
- Common bug categories: off-by-one, wrong operator, bad initial value, unhandled edge cases
- Print debugging and the rubber duck method
- How to write good test cases
- An extension challenge for adding a new function

## How to Work Through It

1. Open `buggy_programs.py` and read each function along with its docstring. The docstring describes what the function is supposed to do.
2. Run the tests:

   ```bash
   python test_programs.py
   ```

3. Pick a failing function. The test output tells you what input broke it and what output was expected.
4. Debug it using the process below.
5. Record what you found in `debugging_notes.md` as you go.
6. Repeat until every test passes.

## The Functions

| Function | What It Should Do |
|----------|-------------------|
| `calculate_grade(score)` | Returns a letter grade (A/B/C/D/F) for a numeric score |
| `count_vowels(text)` | Counts vowels in a string, case-insensitive |
| `find_max(numbers)` | Returns the largest number in a list |
| `reverse_words(sentence)` | Reverses the order of words in a sentence |
| `is_prime(n)` | Returns True if n is prime, False otherwise |

## A Systematic Debugging Process

When a test fails, work through these four steps before changing any code.

### Step 1: Read the Failing Test Carefully

The test tells you the exact input that caused the problem and what was expected. Start there; do not guess.

```
score 80 -> B
     expected: 'B'
     got:      'C'
```

That tells you that `calculate_grade(80)` returned `'C'` but should have returned `'B'`.

### Step 2: Isolate the Problem

Trace through the function by hand for that one failing input. Use the simplest failing case, not a complicated one. For `calculate_grade(80)`, walk through each `if` and `elif` condition in order and check which branch actually runs.

You can also add a temporary print statement to confirm what the code is doing:

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

Remove the prints once you find the bug.

### Step 3: Form a Hypothesis

Before changing anything, write down what you think the bug is. Put it in `debugging_notes.md`. A specific hypothesis like "the B boundary is wrong; it should be 80, not 79" is something you can test. "Something is off with the conditions" is not.

### Step 4: Test Your Hypothesis

Make the change you think will fix it, then run `python test_programs.py` again. If the tests you expected to pass now pass, and no other tests broke, the function is done.

If the tests still fail, your hypothesis was wrong. Return to Step 2 with what you learned.

## Common Bug Types

Knowing the categories makes them easier to spot.

### Off-by-One Errors

A boundary is one too high or one too low.

```python
# Supposed to include 80, but 80 >= 81 is False
if score >= 81:
    return "B"
```

### Wrong Operator or Variable

The right logic, but referring to the wrong thing.

```python
# Checks only uppercase, but lowercase c is also a vowel
if char in "AEIOU":
    count += 1
```

### Bad Initial Value

A variable starts at the wrong value, causing the function to fail for certain inputs.

```python
# If every number in the list is negative, this never updates
max_val = 0
```

### Wrong Argument

A function is called with an argument that is close but not quite correct.

```python
# split("") raises an error. split() or split(" ") is what was meant.
words = sentence.split("")
```

### Unhandled Edge Case

The function works for normal inputs but breaks on empty lists, zero, negatives, or similar.

```python
# n=1 should return False, but the code never checks for it
def is_prime(n):
    for i in range(2, n): ...
```

## Print Debugging

Adding temporary print statements is one of the simplest debugging tools available. The goal is to confirm what values the code actually sees at each step.

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

Run the function with the failing input and read the trace. The bug usually becomes obvious.

Delete the print statements once you are finished.

## The Rubber Duck Method

If you are stuck, explain the function aloud as if you were teaching it to someone who has never seen code. Describe every step: "First it checks if the length is zero. Then it sets max_val to 0. Then it loops through each number..."

You will often notice the bug mid-sentence. Saying it aloud forces your brain to actually read each line instead of skimming.

If no rubber duck is available, write the explanation in your debugging notes instead.

## Writing Good Test Cases

After you fix a bug, add test cases to the "Your Tests" section of `test_programs.py`. A good test case:

- Uses a specific input you can reason about by hand
- Focuses on the boundaries of the function's behavior
- Covers cases that are easy to get wrong, such as zero, negatives, empty values, or uppercase

For a function that behaves differently across ranges, always test the exact boundary values:

```python
check("score 80 -> B", calculate_grade(80), "B")   # lowest B
check("score 79 -> C", calculate_grade(79), "C")   # highest C
```

## Extension Challenge

Once all five bugs are fixed, try this. Details are in `debugging_notes.md`.

Add a `get_grade_points(grade: str) -> float` function that maps a letter grade to GPA points (A=4.0, B=3.0, C=2.0, D=1.0, F=0.0).

Before writing the function, answer the design questions in your notes. After writing it, add test cases in `test_programs.py` and reflect on how the new function affects the existing code.
