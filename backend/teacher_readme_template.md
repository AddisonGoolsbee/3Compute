# Welcome to CS Room!

CS Room is a free educational platform that gives you and your students cloud-based development environments. No local setup required.

## Getting Started

1. **Templates**: click Templates in the file explorer to create a new project from a starter (e.g. Website, Discord Bot). The template files are copied into your workspace.
2. **Upload**: upload your own files or folders using the Upload button.
3. **New**: create new files or folders with the New button.

You also have a full Linux terminal below the editor. Some useful commands:
- `python file.py` to run a Python script
- `mkdir folder_name` to create a folder
- `rm file_name` to delete a file (irreversible!)
- `cd folder_name` to change to a folder

## Managing Classrooms

### Creating a classroom
Go to the **Classrooms** page and click **Create**. Share the join code with your students.

### Adding assignments
1. Open your classroom from the **Classrooms** page, go to the **Assignments** tab, and click **Upload assignment** to upload a folder with your starter code and any `test_*.py` test files.
2. Your upload appears as a draft. Click **Edit in workspace** to refine it, then click **Publish** when ready.
3. You can also manage assignments in the IDE. Drafts live in the classroom's `drafts/` folder; published assignments live in `assignments/`. To publish a draft, use the **Publish** button in the Assignments tab (drag-and-drop inside the IDE moves files but does not push them to students).

Every current student receives a copy when you publish. Students who join later also get all assignments automatically. Once published, edits to the original are not synced to existing students, but the template is updated for future students. Current students can view the modifications in their classroom's `.templates/` folder (hidden by default — they enable **Show hidden files** in the explorer to see it), even if it is not on their copy of the assignment.

### Deleting assignments
Delete the assignment from the **Assignments** tab, or remove the folder from your classroom's `assignments/` folder in the IDE. Students keep their existing copies, but the assignment will no longer appear in the gradebook or be distributed to new students.

### Test files & grading
Files named `test_*.py` are used for automated grading. Students can see them but cannot modify them. Run tests from the classroom detail page to see scores.

You can also import lessons with pre-written tests from the **Lessons** page.

### Writing your own tests
Each test file must be named `test_*.py` and runnable as a standalone Python script. Use Python's built-in `unittest` module — no `pip install` needed. The script below is the canonical pattern: write your `unittest.TestCase` classes, then drop the runner block at the bottom. The runner emits an `N/M` score line that the gradebook reads automatically, no manual test counting required.

```python
import os
import sys
import unittest

from main import add, multiply  # import the student's code


class TestAdd(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(add(2, 3), 5)


class TestMultiply(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(multiply(4, 5), 20)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(
        unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    )
    n_failed = len(result.failures) + len(result.errors)
    n_passed = result.testsRun - n_failed - len(result.skipped)

    if os.environ.get("TCOMPUTE_SCORE"):
        # Gradebook reads this line. Must be the last non-empty stdout line.
        print(f"{n_passed}/{result.testsRun}")

    sys.exit(0 if result.wasSuccessful() else 1)
```

Each `test_*` method counts as one test. If a student's code raises an exception (including `NotImplementedError`), the rest of the tests still run, and the gradebook still gets an honest `passed/total` score.

If an assignment has multiple `test_*.py` files, their results are combined into a single score.

### Tracking progress
The **Students** tab lets you view each student's progress. Select an assignment, then click on a student to see their files and test results. You can also run tests from here.

The **Gradebook** tab shows a matrix of all students and assignments with their scores. You can grade assignments automatically through test cases or use manual scoring. Students cannot see the gradebook.

### Student restrictions
Students can only create and edit files inside their assignment folders. They cannot create new top-level folders in the classroom.

## Workspace Tour

- **File Explorer** (left): browse, upload, create, and delete files.
- **Editor** (center): edit code with syntax highlighting. Use the Save button or the language selector to change highlighting mode. Toggle Markdown preview for `.md` files.
- **Terminal** (bottom): full shell access. Open multiple tabs; closing a tab stops its processes.

## Learn more

Open any template's `README.md` after creating it for project-specific instructions.
