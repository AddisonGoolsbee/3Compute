# Classroom: {{CLASSROOM_NAME}}

Access Code: `{{ACCESS_CODE}}`

## What is a CS Room Classroom?

A classroom groups a set of participants (students) with one or more instructors. Everything (distributing assignments, collecting work, grading) is managed through CS Room: the **Classrooms** page (web UI) and your classroom folder in the IDE are the two places you'll work from.

For each classroom you own:

- A host directory is mounted inside your container at `/classrooms/{{CLASSROOM_ID}}`
- A `drafts/` folder holds work-in-progress assignments that students **cannot** see yet
- An `assignments/` folder holds published assignments. This is the source of truth students see as reference copies.
- A `participants/` folder contains per-student workspaces. Each student's personal edits live here.

## Adding an assignment

There are three ways to create an assignment. Pick whichever fits the moment:

1. **Upload a folder** (Classrooms page → your classroom → Assignments tab → **Upload Folder**). The uploaded folder lands as a draft.
2. **Import a lesson** from the **Lessons** page, then pick this classroom and choose **Save as draft** or **Publish** directly.
3. **Work in the IDE**. Drop a folder into `drafts/`, or drop one straight into `assignments/` to publish immediately.

### Drafts vs. published

- **Drafts** (`drafts/`): private to you. Edit freely in the IDE, preview as many times as you want. Students don't see them.
- **Published** (`assignments/`): the moment a folder lands in `assignments/`, it's distributed. In the Assignments tab, click **Publish** on a draft to move it. Or in the IDE, drag a folder from `drafts/` into `assignments/` for the same effect.

### What happens when you publish

- Every current student instantly gets their own editable copy inside their classroom folder.
- Future students who join later automatically receive every published assignment on first login.
- Your `assignments/` folder stays the source of truth. If you fix a bug or update instructions there later, **existing students' copies are not overwritten** (so their work is never clobbered), but they can always see your latest version through a hidden `.templates/` folder in their classroom. New students joining after the edit get the updated version.

### Deleting an assignment

Delete from the **Assignments** tab, or remove the folder from `assignments/` in the IDE. Students keep their existing copies, but the assignment disappears from the gradebook and won't be given to new joiners.

## What students see

When a student joins, they see your classroom as a folder in their file explorer. Inside:

- One folder per published assignment (their own editable copy).
- A hidden `.templates/` symlink that points at your live `assignments/`. Useful if they want the original files back or want to diff against your latest version. Hidden by default; they toggle **Show hidden files** in the file explorer to reveal it.

Students cannot create new top-level folders in the classroom and cannot modify `.templates/`.

## Tests & grading

Files named `test_*.py` inside an assignment are run for automated grading. Students can read them but can't modify them. Scores show up in the **Gradebook** tab. You can run tests manually from the **Students** tab or the gradebook.

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

If an assignment has multiple `test_*.py` files their results are summed into a single score.

## Archiving this classroom

If you no longer need this classroom visible in your file explorer:

1. Right-click the classroom folder
2. Select **Archive**
3. The classroom moves to your `archive/` folder (gray folder at the bottom of the explorer)
4. To restore: right-click the classroom in `archive/` and select **Restore**

Archiving is personal; it only affects your view. Other users still see the classroom normally. Users cannot join an archived classroom.

## Access Code

Share the access code above with participants so they can join. Keep it private. Anyone with the code can join.

---

*This README is auto-generated and will be regenerated on container restart. You can safely delete it if not needed.*
