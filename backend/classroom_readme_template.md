# Classroom: {{CLASSROOM_NAME}}

Access Code: `{{ACCESS_CODE}}`

## What is a 3Compute Classroom?

A classroom groups a set of participants (students) with one or more instructors. Everything (distributing assignments, collecting work, grading) is managed through 3Compute: the **Classrooms** page (web UI) and your classroom folder in the IDE are the two places you'll work from.

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

Each test file must be named `test_*.py` and runnable as a standalone Python script. Drop the following snippet at the top of every test file so the gradebook gets a consistent score even if the student's code crashes partway through:

```python
EXPECTED_TOTAL = 2  # total number of checks in this file

import atexit, os
passed = 0
failed = 0
if os.environ.get("TCOMPUTE_SCORE"):
    atexit.register(lambda: print(f"{passed}/{EXPECTED_TOTAL}"))


def check(description, got, expected):
    global passed, failed
    if got == expected:
        print(f"  PASS  {description}")
        passed += 1
    else:
        print(f"  FAIL  {description}")
        print(f"          expected: {expected!r}")
        print(f"          got:      {got!r}")
        failed += 1


from main import add, multiply  # import the student's code

check("add(2, 3) == 5", add(2, 3), 5)
check("multiply(4, 5) == 20", multiply(4, 5), 20)

print(f"Results: {passed}/{EXPECTED_TOTAL} tests passed")
```

Set `EXPECTED_TOTAL` to the number of `check(...)` calls in your file. Students see the `Results: N/M tests passed` line when they run the test script themselves; the gradebook reads the score separately.

If an assignment has multiple `test_*.py` files their results are summed into a single score.

## Publishing a Web App (custom subdomain)

If your project runs a web server (Flask, FastAPI, etc.), you can expose it publicly:

1. Start your app on any port in your assigned range (shown in the Ports panel).
2. Click the **Globe** icon in the terminal tab bar to open the **Ports** panel.
3. Enter a subdomain name (e.g. `myapp`) and the port your app is listening on.
4. Your app will be live at `https://myapp.app.3compute.org`.

Subdomains must be 3–32 lowercase letters, numbers, or hyphens.

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
