# Data Analysis: Student Survey -- Instructor Lesson Plan

## Overview

Students analyze a fictional survey dataset of 150 high school students using Python's standard library. They implement data loading, aggregation, ASCII visualization, and correlation analysis, then discuss what their findings actually mean -- and what the dataset's limitations prevent them from concluding.

**Estimated Duration:** 5 class periods (45-50 minutes each)

**Grade Level:** 9-10

**Prerequisites:**
- Basic Python: variables, functions, loops, conditionals, lists
- Dictionaries: creating, reading, and iterating
- File I/O is helpful but not required (covered in Day 2)

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3B-DA-05** | Use data analysis tools and techniques to identify patterns in data representing complex systems. | Students compute group averages, build bar charts, and calculate correlation coefficients to identify relationships between sleep, screen time, and GPA. |
| **3B-DA-06** | Select data collection tools and techniques to generate data sets that support a claim or communicate information. | Day 5 discussion asks students to redesign the survey to reduce bias and better support specific claims. |
| **3A-DA-11** | Create interactive data visualizations using software tools to help others better understand real-world phenomena. | Students implement `ascii_bar_chart()` to produce terminal-based visualizations of the survey results. |
| **3A-IC-25** | Test and refine computational artifacts to reduce bias and equity deficits. | The built-in bias check surfaces the gender imbalance in the dataset; Day 5 is dedicated to discussing what this means for the validity of any conclusions. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3B-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A test suite (`test_analysis.py`) is provided; students run it after each function to verify correctness before moving on. |
| **3A-AP-13** | Create prototypes that use algorithms to solve computational problems. | Each of the five functions is an algorithmic component (parsing, averaging, grouping, visualizing, correlating) that combines into a complete analysis pipeline. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Parse** structured data from a CSV file into a usable Python data structure
2. **Aggregate** data by grouping rows and computing summary statistics
3. **Visualize** quantitative comparisons using a scaled ASCII bar chart
4. **Interpret** a Pearson correlation coefficient and explain what it does and does not prove
5. **Identify** sampling bias in a dataset and explain how it limits conclusions
6. **Distinguish** between correlation and causation using a concrete example from the data

---

## Lesson Sequence

### Day 1: What Is Data Analysis? (45 min)

**Objectives:**
- Understand what a dataset is and why analyzing one is useful
- Form initial hypotheses before writing any code
- Get familiar with the CSV file structure

**Activities:**

1. **Opening discussion (10 min):** Ask students: "How do scientists know that lack of sleep affects school performance?" Let them give answers. Most will say "studies" or "research." Follow up: "What does that actually mean? Where does the data come from?"

2. **Examine the dataset (15 min):**
   - Open `student_survey.csv` in a text editor or the terminal
   - Walk through the columns together: what does each one represent?
   - Ask students to scan the first 10-15 rows. What do they notice?
   - Discussion prompts:
     - "If you had to guess, which column do you think most affects GPA?"
     - "What would 'strong correlation' look like if you printed all the rows in order of sleep hours?"

3. **Form hypotheses (10 min):**
   Have students write down two predictions before any analysis:
   - "I think students who sleep more will have _____ GPA because..."
   - "I think screen time will _____ affect GPA because..."

   These are important to revisit on Day 4.

4. **Preview the project (10 min):**
   - Show the structure of `main.py`
   - Walk through the provided `main()` function so students know what they are building toward
   - Point out that `main()` is already written -- their job is to implement the five functions it calls

**Instructor Notes:**
- The goal of Day 1 is to build curiosity and stakes before any code is written.
- Students who form a hypothesis have a reason to care about whether the correlation function works correctly.

---

### Day 2: Loading and Grouping Data (45 min)

**Objectives:**
- Implement `load_data()` and understand CSV file format
- Implement `average()` and `group_by()`
- Run the first partial analysis

**Activities:**

1. **Mini-lesson: CSV files (10 min):**
   - Show what a CSV looks like as raw text (it is just comma-separated values)
   - Demonstrate `csv.DictReader` in the REPL: open the file, iterate a few rows, print them
   - Key insight: every value comes out as a string. Type conversion is the programmer's job.

2. **Implement `load_data()` (15 min):**
   - Students follow the TODO comments
   - Common mistake: forgetting `newline=""` in `open()` on Windows. Mention this proactively.
   - Common mistake: converting types outside the loop (so only the last row gets converted)
   - Run `python test_analysis.py` -- only the `load_data` tests should pass at this point

3. **Implement `average()` and `group_by()` (15 min):**
   - `average()` is straightforward. Emphasize the empty list case.
   - `group_by()` is a pattern students will use again. Walk through the logic:
     - If the key is not in the dict yet, create an empty list
     - Then append the current row
   - After both are implemented, run the tests again

4. **First analysis (5 min):**
   - If time permits, add a few `print()` statements to call `group_by` and `average` manually
   - Have students print the average GPA for each grade level

**Common Student Errors:**

```python
# Wrong: type conversion happens after the loop, overwriting only the last row
for row in reader:
    rows.append(row)
row['grade'] = int(row['grade'])  # Only converts the last row!

# Right: convert inside the loop
for row in reader:
    row['grade'] = int(row['grade'])
    rows.append(row)
```

---

### Day 3: Visualization (45 min)

**Objectives:**
- Implement `ascii_bar_chart()`
- Understand scaling and proportional representation
- Produce readable output from the first analysis

**Activities:**

1. **Discussion: what makes a good chart? (5 min)**
   - A bar chart should make comparisons easy at a glance
   - The longest bar represents the maximum value
   - All other bars are scaled proportionally

2. **Work through the scaling logic together (10 min):**
   - Write this on the board: `bar_length = int((value / max_value) * max_width)`
   - Walk through examples: if max is 4.0 and max_width is 40, a value of 3.0 gets a bar of length 30
   - Ask students: "What happens if max_value is 0?"

3. **Implement `ascii_bar_chart()` (20 min):**
   - Students implement the function
   - Remind them about label alignment: `str(label).ljust(label_width)` makes columns line up
   - The block character `█` can be copied from the README or typed as `'\u2588'`

4. **Run partial `main()` (10 min):**
   - At this point, four of the five functions are done
   - Students can comment out the correlation lines in `main()` temporarily and run the analysis
   - They should see a working bar chart in the terminal

**Instructor Notes:**
- Students sometimes struggle with the edge case where `max_value` is 0. Remind them: if the max is 0, `int(0/0 * 40)` will crash. They need to check first.
- The visual output is rewarding at this stage. Give students a minute to show their charts to a neighbor.

---

### Day 4: Correlation Analysis (45 min)

**Objectives:**
- Implement `correlation()` (Pearson r)
- Interpret correlation coefficients
- Revisit Day 1 hypotheses using actual data

**Activities:**

1. **Introduce the concept (10 min):**
   - Correlation measures how closely two variables move together
   - Draw a rough scatter plot on the board: if one variable goes up, does the other tend to go up too?
   - Define the range: -1 (perfect negative), 0 (no relationship), +1 (perfect positive)
   - Rule of thumb: |r| > 0.5 is moderate to strong; |r| < 0.2 is weak

2. **Walk through the formula (10 min):**
   - Write on the board: `r = sum(dx * dy) / sqrt(sum(dx^2) * sum(dy^2))`
   - Where `dx = x - mean_x` and `dy = y - mean_y`
   - This is the dot product of the deviation vectors, normalized
   - Students do not need to derive this -- they need to implement it

3. **Implement `correlation()` (20 min):**
   - The tricky parts: handling empty lists, and guarding against zero denominator
   - `statistics.mean()` is provided -- students do not need to call `average()`
   - Test against the known cases in `test_analysis.py`: perfect positive, perfect negative, no correlation

4. **Interpret the results (5 min):**
   - Run the full `main()` analysis
   - Ask students: "Does the sleep/GPA result match your hypothesis from Day 1?"
   - "What about screen time? Were you surprised?"

**Key Discussion: Correlation vs. Causation**

This is the most important conceptual discussion of the unit. Do not skip it.

Ask: "We found that sleep hours and GPA are correlated. Does that mean sleeping more causes higher grades?"

Push students to generate alternative explanations:
- A third variable (time management skills) could cause both
- The causal arrow could run the other way: students with lower stress sleep more *because* their grades are already fine
- It could be genuinely causal, but we cannot tell from this data alone

Tell students: correlation is a necessary condition for causation (two things that are not correlated cannot be causally related), but it is not sufficient. Establishing causation requires controlled experiments or careful statistical designs.

---

### Day 5: Bias and Critical Analysis (45 min)

**Objectives:**
- Understand sampling bias and its consequences
- Evaluate which conclusions from the dataset are and are not valid
- Discuss how datasets reflect the choices of the people who collected them

**Activities:**

1. **Review the gender distribution output (10 min):**
   - The analysis prints a bias check showing 85 M, 50 F, 15 Other
   - Ask: "Does this seem representative of a typical high school?"
   - Introduce the term "sampling bias": when the sample over- or under-represents certain groups

2. **Discuss consequences (15 min):**

   Discussion questions:
   - "If we compute average GPA for students who identify as Other, that average is based on only 15 people. How much should we trust it?"
   - "Imagine one of those 15 students had an unusual situation -- transferred schools, had a health issue. How much would that one person shift the average?"
   - "Who might be missing from this dataset entirely?" (students who did not speak the language the survey was written in, students who were absent the day it was distributed, students who did not feel comfortable answering certain questions)

3. **Redesign exercise (15 min):**
   Have students answer in writing or pairs:
   - What changes would you make to the survey to reduce gender sampling bias?
   - What additional column would you add to capture something the current dataset misses?
   - If you could only ask students 3 questions, which would you pick to best understand academic performance?

4. **Wrap-up (5 min):**
   - Revisit the learning objectives from Day 1
   - Ask students what they would tell someone who cited this dataset as proof that "boys sleep more than girls" or "screen time hurts grades"

**Instructor Notes:**
- The goal is not to make students distrust all data. It is to make them ask "who collected this, how, and who is represented?"
- Students who engage with this discussion are developing habits that matter far beyond this class.

**Closing Prompt:**
> "Every dataset was created by people making choices: who to survey, what to ask, how to record answers. Those choices shape what the data can and cannot tell you."

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** `test_analysis.py` gives immediate, per-function feedback. Students can share their pass/fail output with you.
- **Exit ticket (Day 4):** "Explain in two sentences: what does r = 0.7 mean, and what does it not mean?"
- **Exit ticket (Day 5):** "Name one conclusion you can draw from this dataset and one you cannot."

### Summative Assessment

**Option A: Code Submission**
- Submit completed `main.py`
- Rubric:
  - All tests pass (50%)
  - Bar chart output is readable and correctly scaled (20%)
  - Code is readable with appropriate variable names (30%)

**Option B: Written Analysis**
Have students write a 1-2 paragraph "data analysis report" addressed to a fictional school principal. Requirements:
- Describe one finding from the data (with a specific number)
- Explain one limitation of the dataset
- State one conclusion that would require additional data before it could be made

**Option C: Extension Project**
Students complete one or more extension challenges from the README and write a paragraph explaining what they found and how they approached it.

---

## Differentiation

### For Students Who Need More Support

- Provide a partially completed `load_data()` with the `csv.DictReader` loop already written, leaving only the type conversions to fill in
- Pair students for `correlation()`: have one student look up the formula while the other writes the code
- Allow students to skip `ascii_bar_chart()` and use a simple `print(label, value)` loop instead; they can still run most of the analysis

### For Advanced Students

- Assign the linear regression extension challenge before Day 4, then have them compare their `m` and `b` values with the class's correlation coefficient -- they should be related
- Ask: can you rewrite `group_by` to accept a function argument instead of a column name, so it can group by any computed property? (This is a step toward understanding functional programming)
- Challenge: modify the analysis to detect and report outliers (students more than 2 standard deviations from the mean GPA)

---

## Discussion Prompts

Use these throughout the unit to deepen the conversation:

1. "What is the difference between a fact and a conclusion? Which one does this dataset give you?"

2. "If the survey had 1000 students instead of 150, would your confidence in the results change? Why?"

3. "A news headline reads: 'Study Finds Students Who Sleep More Get Better Grades.' What questions would you want answered before sharing that article?"

4. "Suppose a school used this data to start a mandatory 9 PM lights-out policy. What would you say to them?"

5. "What questions about high school students cannot be answered by this dataset no matter how good the analysis is?"

---

## Common Misconceptions

| Misconception | Reality |
|---------------|---------|
| "A high correlation proves a cause." | Correlation shows that two variables move together. It does not identify which causes which, or whether both are caused by a third variable. |
| "More data always means better conclusions." | A biased sample does not become unbiased just by adding more biased rows. A random sample of 200 is often more useful than a biased sample of 2000. |
| "If our code runs and produces output, our analysis is correct." | Code can run correctly and still produce misleading results if the data quality is poor or the questions are framed incorrectly. |
| "The average summarizes the group." | Averages hide variation. A class with GPAs of 4.0, 4.0, 4.0, 1.5 has the same average as a class with four students at 3.375. |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only) |
| `lesson-plan.md` | This document |
| **Data-Analysis student template:** | |
| `main.py` | Scaffolded code with TODOs and provided `main()` |
| `test_analysis.py` | Test suite for all five functions |
| `README.md` | Student-facing instructions and background reading |
| `student_survey.csv` | The fictional dataset (150 rows) |
| `requirements.txt` | Empty (standard library only) |

---

*Last updated: March 2026*
