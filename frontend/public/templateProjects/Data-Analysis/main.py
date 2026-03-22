"""
Data Analysis: Student Survey
==============================

In this project, you'll analyze a dataset of 150 fictional high school students.
You'll find patterns in the data, build ASCII visualizations, and think critically
about what the data can and cannot tell you.

YOUR TASKS:
1. Implement load_data(filename)   - Read CSV into a list of dicts
2. Implement average(values)       - Calculate the mean of a list
3. Implement group_by(data, col)   - Group rows by a column's value
4. Implement ascii_bar_chart(...)  - Print a horizontal bar chart
5. Implement correlation(x, y)     - Pearson correlation coefficient

Run the tests to check your work: python test_analysis.py
Then run the full analysis:        python main.py
"""

import csv
import statistics


# =============================================================================
# HELPER FUNCTIONS (PROVIDED)
# =============================================================================

def sleep_category(hours):
    """Categorize sleep hours into Low, Medium, or High."""
    if hours < 6:
        return "Low (< 6 hrs)"
    elif hours < 8:
        return "Medium (6-7 hrs)"
    else:
        return "High (8+ hrs)"


def print_separator(char="=", width=60):
    """Print a separator line."""
    print(char * width)


# =============================================================================
# TODO #1: LOAD DATA
# =============================================================================

def load_data(filename):
    """
    Read a CSV file and return a list of row dictionaries.

    Args:
        filename: Path to a CSV file

    Returns:
        A list of dicts, one per row. Numeric columns are converted:
            - 'grade'        -> int
            - 'hours_sleep'  -> float
            - 'hours_screen' -> float
            - 'gpa'          -> float
        All other columns remain strings.

    HINT: Use csv.DictReader to read the file. Each row comes out as a dict
          with column names as keys. You'll need to convert the numeric columns
          manually, e.g. row['grade'] = int(row['grade'])

    Example:
        data = load_data('student_survey.csv')
        print(data[0])
        # {'student_id': '1', 'grade': 10, 'gender': 'M',
        #  'hours_sleep': 7.0, 'hours_screen': 3.5, 'gpa': 2.9,
        #  'extracurricular': 'No'}
    """
    # TODO: Open the file with open() and csv.DictReader
    # TODO: For each row, convert the numeric columns to the right types
    # TODO: Append each row to a list and return it

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #2: AVERAGE
# =============================================================================

def average(values):
    """
    Calculate the arithmetic mean of a list of numbers.

    Args:
        values: A list of numeric values

    Returns:
        The mean as a float. Returns 0.0 if the list is empty.

    HINT: Sum all the values and divide by the count.
          Remember to handle the empty list case first.

    Example:
        average([2.0, 3.0, 4.0])  # returns 3.0
        average([])               # returns 0.0
    """
    # TODO: Return 0.0 if values is empty
    # TODO: Otherwise return sum(values) / len(values)

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #3: GROUP BY
# =============================================================================

def group_by(data, column):
    """
    Split a list of row dicts into groups based on a column's value.

    Args:
        data:   A list of dicts (e.g. from load_data)
        column: The key to group by (e.g. 'grade' or 'gender')

    Returns:
        A dict mapping each unique value in that column to the list of rows
        that have that value.

    HINT: Start with an empty dict. For each row, check if row[column] is
          already a key. If not, create a new empty list for it. Then append
          the row to the list.

    Example:
        groups = group_by(data, 'grade')
        # groups[9]  -> list of all 9th grade rows
        # groups[10] -> list of all 10th grade rows
        # ...
    """
    # TODO: Build and return the groups dict

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #4: ASCII BAR CHART
# =============================================================================

def ascii_bar_chart(data_dict, title, max_width=40):
    """
    Print a horizontal bar chart to the terminal.

    Args:
        data_dict: A dict mapping label (str) -> numeric value
        title:     A string title printed above the chart
        max_width: The longest bar should be this many characters wide

    Output format (one row per label):
        label        | ████████████████████ 3.45

    The bars are scaled relative to the largest value in data_dict.
    If the max value is 0, skip drawing bars.

    HINT:
        - Find the max value first so you can scale the others
        - bar_length = int((value / max_value) * max_width)
        - Use the block character: '\u2588' (or just copy: █)
        - Use f-strings to align the label column with ljust()

    Example output:
        GPA by Grade
        ============================================================
        Grade 9     | ████████████████████████████████████████ 2.88
        Grade 10    | ██████████████████████████████████████   2.75
        ...
    """
    print()
    print(title)
    print_separator()

    # TODO: Find the maximum value (handle the case where max is 0)
    # TODO: For each label/value pair, calculate bar length and print the row

    pass  # Remove this line when you implement the function


# =============================================================================
# TODO #5: CORRELATION
# =============================================================================

def correlation(x_values, y_values):
    """
    Calculate the Pearson correlation coefficient between two lists.

    Args:
        x_values: A list of numbers
        y_values: A list of numbers (same length as x_values)

    Returns:
        A float between -1.0 and 1.0, where:
            1.0  = perfect positive correlation
           -1.0  = perfect negative correlation
            0.0  = no linear correlation
        Returns 0.0 if either list is empty or has zero variance.

    FORMULA:
        r = sum((x - mean_x) * (y - mean_y))
            ----------------------------------------
            sqrt(sum((x - mean_x)^2) * sum((y - mean_y)^2))

    HINT:
        - Use statistics.mean() to get the mean of each list
        - Calculate the deviations from the mean for each list
        - Watch out for division by zero (return 0.0 if denominator is 0)

    Example:
        correlation([1, 2, 3], [2, 4, 6])   # returns ~1.0 (perfect positive)
        correlation([1, 2, 3], [6, 4, 2])   # returns ~-1.0 (perfect negative)
        correlation([1, 2, 3], [3, 1, 2])   # returns ~0.0 (no correlation)
    """
    # TODO: Handle edge cases (empty lists or lists of length 1)
    # TODO: Calculate mean_x and mean_y using statistics.mean()
    # TODO: Calculate deviations: dx = [x - mean_x for x in x_values]
    # TODO: Calculate numerator: sum of dx[i] * dy[i]
    # TODO: Calculate denominator: sqrt(sum(dx^2) * sum(dy^2))
    # TODO: Return numerator / denominator (or 0.0 if denominator is 0)

    pass  # Remove this line when you implement the function


# =============================================================================
# MAIN ANALYSIS (PROVIDED)
# =============================================================================

def main():
    print_separator()
    print("  STUDENT SURVEY DATA ANALYSIS")
    print_separator()

    # ---- Load data ----------------------------------------------------------
    data = load_data("student_survey.csv")

    if data is None:
        print("load_data() returned None. Did you implement it?")
        return

    print(f"\nLoaded {len(data)} student records.")
    print(f"Columns: {', '.join(data[0].keys())}")

    # ---- Average GPA by sleep category -------------------------------------
    print("\n--- GPA by Sleep Category ---")
    sleep_groups = {}
    for row in data:
        cat = sleep_category(row["hours_sleep"])
        if cat not in sleep_groups:
            sleep_groups[cat] = []
        sleep_groups[cat].append(row["gpa"])

    gpa_by_sleep = {}
    for cat, gpas in sleep_groups.items():
        avg = average(gpas)
        count = len(gpas)
        gpa_by_sleep[cat] = avg
        print(f"  {cat:20s}  n={count:3d}  avg GPA = {avg:.2f}")

    ascii_bar_chart(gpa_by_sleep, "Average GPA by Sleep Category")

    # ---- Average GPA by grade ----------------------------------------------
    print("\n--- GPA by Grade ---")
    by_grade = group_by(data, "grade")
    gpa_by_grade = {}
    for grade in sorted(by_grade.keys()):
        gpas = [r["gpa"] for r in by_grade[grade]]
        avg = average(gpas)
        gpa_by_grade[f"Grade {grade}"] = avg
        print(f"  Grade {grade}:  n={len(gpas):3d}  avg GPA = {avg:.2f}")

    ascii_bar_chart(gpa_by_grade, "Average GPA by Grade")

    # ---- Correlation analysis ----------------------------------------------
    print_separator()
    print("CORRELATION ANALYSIS")
    print_separator()

    sleep_vals = [r["hours_sleep"] for r in data]
    screen_vals = [r["hours_screen"] for r in data]
    gpa_vals = [r["gpa"] for r in data]

    r_sleep_gpa = correlation(sleep_vals, gpa_vals)
    r_screen_gpa = correlation(screen_vals, gpa_vals)

    print(f"\n  Sleep hours vs GPA:        r = {r_sleep_gpa:+.3f}")
    print(f"  Screen time vs GPA:        r = {r_screen_gpa:+.3f}")
    print()
    print("  Interpreting r:")
    print("    |r| > 0.5  ->  moderate to strong correlation")
    print("    |r| < 0.2  ->  weak or no linear correlation")

    # ---- Extracurricular analysis ------------------------------------------
    print_separator()
    print("EXTRACURRICULAR ACTIVITIES")
    print_separator()

    by_extra = group_by(data, "extracurricular")
    for status in sorted(by_extra.keys()):
        gpas = [r["gpa"] for r in by_extra[status]]
        avg = average(gpas)
        print(f"\n  Extracurricular = {status:3s}:  n={len(gpas):3d}  avg GPA = {avg:.2f}")

    # ---- Bias check --------------------------------------------------------
    print_separator()
    print("SAMPLING BIAS CHECK")
    print_separator()

    by_gender = group_by(data, "gender")
    print("\n  Gender distribution in the survey:")
    total = len(data)
    for gender in sorted(by_gender.keys()):
        count = len(by_gender[gender])
        pct = count / total * 100
        print(f"    {gender:6s}: {count:3d} students ({pct:.1f}%)")

    print()
    print("  >> Notice the imbalance. Male students make up a large majority.")
    print("  >> Any conclusions about gender differences in this data should")
    print("     be treated with caution: the sample sizes are unequal, and")
    print("     students who identify as 'Other' are underrepresented.")
    print("  >> Who might be missing from this dataset entirely?")

    print()
    print_separator()
    print("  Analysis complete.")
    print_separator()


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    # Quick check that functions are implemented
    test = load_data("student_survey.csv")
    if test is None:
        print("It looks like load_data() is not implemented yet.")
        print("Open main.py and complete the TODO sections:")
        print("  1. load_data()")
        print("  2. average()")
        print("  3. group_by()")
        print("  4. ascii_bar_chart()")
        print("  5. correlation()")
        print("\nRun 'python test_analysis.py' to test your work as you go.")
    else:
        main()
