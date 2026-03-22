"""
INSTRUCTOR SOLUTION -- Data Analysis: Student Survey
=====================================================

This file contains complete implementations of all five student TODO functions.
Share with students only after the project is complete.

All functions use only Python standard library modules (csv, statistics, math).
"""

import csv
import math
import statistics


# =============================================================================
# SOLUTION: load_data
# =============================================================================

def load_data(filename):
    """Read a CSV file and return a list of row dicts with correct types."""
    rows = []
    with open(filename, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["grade"] = int(row["grade"])
            row["hours_sleep"] = float(row["hours_sleep"])
            row["hours_screen"] = float(row["hours_screen"])
            row["gpa"] = float(row["gpa"])
            rows.append(row)
    return rows


# =============================================================================
# SOLUTION: average
# =============================================================================

def average(values):
    """Return the arithmetic mean of a list, or 0.0 for an empty list."""
    if not values:
        return 0.0
    return sum(values) / len(values)


# =============================================================================
# SOLUTION: group_by
# =============================================================================

def group_by(data, column):
    """Group a list of dicts by the value of a given column."""
    groups = {}
    for row in data:
        key = row[column]
        if key not in groups:
            groups[key] = []
        groups[key].append(row)
    return groups


# =============================================================================
# SOLUTION: ascii_bar_chart
# =============================================================================

def print_separator(char="=", width=60):
    print(char * width)


def ascii_bar_chart(data_dict, title, max_width=40):
    """Print a scaled horizontal bar chart."""
    print()
    print(title)
    print_separator()

    if not data_dict:
        return

    max_value = max(data_dict.values())
    if max_value == 0:
        for label, value in data_dict.items():
            print(f"  {str(label).ljust(20)} | (no data)")
        return

    # Find the longest label for alignment
    label_width = max(len(str(k)) for k in data_dict.keys())

    for label, value in data_dict.items():
        bar_length = int((value / max_value) * max_width)
        bar = "\u2588" * bar_length
        print(f"  {str(label).ljust(label_width)} | {bar.ljust(max_width)} {value:.2f}")


# =============================================================================
# SOLUTION: correlation
# =============================================================================

def correlation(x_values, y_values):
    """Calculate the Pearson correlation coefficient."""
    if len(x_values) < 2 or len(y_values) < 2:
        return 0.0

    mean_x = statistics.mean(x_values)
    mean_y = statistics.mean(y_values)

    dx = [x - mean_x for x in x_values]
    dy = [y - mean_y for y in y_values]

    numerator = sum(a * b for a, b in zip(dx, dy))
    denominator = math.sqrt(sum(a ** 2 for a in dx) * sum(b ** 2 for b in dy))

    if denominator == 0:
        return 0.0

    return numerator / denominator


# =============================================================================
# DEMONSTRATION: run a quick sanity check
# =============================================================================

if __name__ == "__main__":
    data = load_data("student_survey.csv")
    print(f"Loaded {len(data)} rows")

    gpas = [r["gpa"] for r in data]
    print(f"Average GPA: {average(gpas):.3f}")

    by_grade = group_by(data, "grade")
    for grade in sorted(by_grade.keys()):
        gpas_g = [r["gpa"] for r in by_grade[grade]]
        print(f"  Grade {grade}: {average(gpas_g):.3f}")

    sleep_vals = [r["hours_sleep"] for r in data]
    r = correlation(sleep_vals, [r["gpa"] for r in data])
    print(f"Sleep vs GPA correlation: r = {r:.3f}")

    ascii_bar_chart(
        {"Low (< 6 hrs)": 2.13, "Medium (6-7 hrs)": 2.72, "High (8+ hrs)": 3.61},
        "Sample Chart"
    )
