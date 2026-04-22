# Data Analysis: Student Survey

In this project you analyze a dataset of 150 fictional high school students. You look for patterns, build a couple of visualizations, and think critically about what the data can and cannot tell you.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- How to load and parse CSV data using Python's built-in `csv` module
- How to summarize data by computing averages and grouping rows
- How to build an ASCII bar chart from scratch
- How to measure the relationship between two variables using correlation
- How to identify bias in a dataset and explain why it matters

## Setup

Right-click the `Data-Analysis` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

The project only uses Python's standard library, but `requirements.txt` is included for consistency:

```bash
pip install -r requirements.txt
```

Open `main.py` and read the `main()` function so you can see which helper functions are called and in what order. Complete the TODOs in order (1 through 5). As you work, run the tests:

```bash
python test_analysis.py
```

Once every test passes, run the full analysis:

```bash
python main.py
```

## What This README Covers

- The dataset and its columns
- The five functions you will implement, with hints for each
- How to interpret correlation, sampling bias, and the screen-time result
- Real-world connections across public health, education, technology, and government
- Extension challenges, reflection questions, a code review checklist, and troubleshooting

## The Dataset

`student_survey.csv` contains survey responses from 150 fictional high school students. The columns are:

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | integer | Unique student identifier (1-150) |
| `grade` | integer | Grade level (9, 10, 11, or 12) |
| `gender` | string | M, F, or Other |
| `hours_sleep` | float | Average hours of sleep per night |
| `hours_screen` | float | Average hours of recreational screen time per day |
| `gpa` | float | Current GPA (1.5 to 4.0) |
| `extracurricular` | string | Whether the student participates in extracurriculars (Yes/No) |

Open the CSV and scan through a few rows before you start coding. What patterns jump out? What questions would you want to answer with this data?

## Your Tasks

Open `main.py` and complete these functions in order.

### TODO #1: `load_data(filename)`

Read the CSV file and return a list of dicts.

**Hints:**

- Use `csv.DictReader` inside a `with open(filename)` block.
- Each row comes out as a dict of string values. Convert the numeric columns.
- `grade` should be `int`. The remaining numeric columns should be `float`.

### TODO #2: `average(values)`

Calculate the mean of a list of numbers.

**Hints:**

- Handle the empty list case first (return `0.0`).
- Otherwise: `sum(values) / len(values)`.

### TODO #3: `group_by(data, column)`

Split the dataset into groups based on a column value.

**Hints:**

- Build a dict where each key is a unique value from that column.
- Each key maps to the list of rows that have that value.
- This is sometimes called "splitting" or "partitioning" a dataset.

### TODO #4: `ascii_bar_chart(data_dict, title, max_width=40)`

Print a horizontal bar chart.

**Hints:**

- Scale bar lengths so the largest value gets `max_width` characters.
- Use the block character `█` (copy it from here or use `'█'`).
- Use `str.ljust(width)` to keep the label column aligned.

Example output:

```
Average GPA by Sleep Category
============================================================
Low (< 6 hrs)        | ████████████████████████   2.13
Medium (6-7 hrs)     | ████████████████████████████   2.72
High (8+ hrs)        | ████████████████████████████████████████   3.61
```

### TODO #5: `correlation(x_values, y_values)`

Calculate the Pearson correlation coefficient.

**Hints:**

- Use `statistics.mean()` for the means.
- Formula: `r = sum((xi - x_mean)(yi - y_mean)) / sqrt(sum((xi - x_mean)^2) * sum((yi - y_mean)^2))`.
- Return `0.0` if the denominator is zero.

## Understanding the Results

Once your implementation works, the analysis will print a handful of things. Here is what to look for.

### Correlation vs Causation

The dataset is designed so that students who sleep more also tend to have higher GPAs. You should see a correlation coefficient (`r`) above 0.5 for sleep vs GPA.

Does that mean sleep *causes* higher grades?

Not necessarily. Correlation measures how closely two variables move together. It does not tell you which one causes the other, or whether some third factor causes both. A few alternative explanations for the sleep/GPA relationship:

- Students with less academic stress may sleep more *and* have higher grades.
- Students with strong time-management skills may both sleep well *and* study effectively.
- The relationship may genuinely be causal in one direction, the other, or both.

The key question to ask: *What else might explain both variables moving together?*

### Sampling Bias

Look at the gender breakdown in the output. The survey contains 85 male respondents, 50 female, and only 15 who identify as Other.

This is called **sampling bias**: the sample does not proportionally represent the population it is supposed to describe.

Consequences:

- If you compute average GPA by gender, the "Other" group average is based on only 15 students. A few unusual values swing the average significantly.
- Any conclusions about gender and academic performance are unreliable because the groups are not equally sampled.
- Claims such as "students who identify as Other have lower/higher GPAs than female students" cannot be made confidently from this data.

The broader question: **Who is missing from this dataset?** If the survey was only distributed in certain classes, or completed only by students with time to fill it out, the results reflect those students, not the full student population.

### Screen Time and GPA

The screen time vs GPA correlation should be weak (close to zero). This is realistic: the relationship between recreational screen time and academic performance is genuinely unclear in research. Some studies find a small negative effect; others find none. Be skeptical when someone presents a dataset as proof of a strong relationship that other researchers have struggled to establish.

## Real-World Connections

Data analysis is used in nearly every field:

- **Public health:** researchers analyze patient data to understand which treatments work and for whom.
- **Education policy:** districts analyze test scores and attendance data to identify where students need more support.
- **Technology:** recommendation systems analyze user behavior to suggest content.
- **Government:** census data shapes decisions about school funding, road construction, and voting districts.

In every case, the same questions apply. Is the data representative? What biases does it carry? Are the correlations meaningful, or could they be explained by something else?

## Extension Challenges

Once all five functions work and the tests pass, try one of these.

### Easy: Find the Extremes

Print the student with the highest GPA and the student with the lowest GPA. Include all of their survey data.

**Hint:** Python's built-in `max()` and `min()` take a `key` argument.

### Medium: GPA Percentile

For each student, calculate their GPA percentile: the percentage of students who have a GPA at or below theirs.

Example: if 120 out of 150 students have a GPA <= 3.2, then a student with GPA 3.2 is in the 80th percentile.

**Hint:** Sort the GPA values, then for each student count how many values are at or below theirs.

### Hard: Linear Regression

Implement simple linear regression to find the line of best fit for sleep hours vs GPA.

Formulas for the slope (`m`) and intercept (`b`) in `y = mx + b`:

```
m = sum((xi - x_mean)(yi - y_mean)) / sum((xi - x_mean)^2)
b = y_mean - m * x_mean
```

Once you have `m` and `b`, print the equation and use it to predict the GPA of a student who sleeps 7.5 hours per night.

## Reflection Questions

After completing the project, consider these.

1. The sleep/GPA correlation is positive. Can you think of two different explanations for why this might be true?
2. The survey over-represents male students. How would you redesign the survey to get a more representative sample?
3. Screen time shows little correlation with GPA in this dataset. What other variables might you collect to better understand the relationship?
4. Suppose a school administrator uses this data to argue that students should go to bed earlier. Is that a valid conclusion? What would you need to know before agreeing?
5. If you were designing your own survey to study a different question, what three columns would you include, and why?

## Code Review Checklist

Before submitting:

- [ ] All tests pass (`python test_analysis.py`)
- [ ] The analysis runs without errors (`python main.py`)
- [ ] `load_data` correctly converts all numeric columns
- [ ] `average` handles an empty list without crashing
- [ ] `group_by` puts every row into exactly one group
- [ ] `ascii_bar_chart` produces readable output
- [ ] `correlation` returns a value between -1 and 1

## Troubleshooting

### `load_data` Returns Rows with String GPAs

Make sure you are converting inside the loop, not after it. `row['gpa'] = float(row['gpa'])` needs to run for every row.

### `ascii_bar_chart` Crashes with an Empty Dict

Add a guard at the top: if `data_dict` is empty, print the title and return.

### `correlation` Returns `nan` or Crashes

This usually means a division by zero. Check that the denominator is non-zero before dividing.

### All Tests Pass but the Chart Looks Wrong

Check your bar-scaling formula. The bar for the maximum value should be exactly `max_width` characters. Bars for smaller values should be proportionally shorter.
