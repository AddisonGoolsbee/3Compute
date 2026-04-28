# Building a File System: Instructor Lesson Plan

## Overview

Students implement a simplified in-memory file system (MiniFS) to understand
how the operating system abstracts hardware storage. By writing the code
themselves, they see exactly what operations are hidden behind everyday calls
like `open()`, `read()`, and `write()`.

The project has two files students interact with:
- `file_system.py`: the MiniFS class (students fill in six TODO methods)
- `main.py`: a REPL shell that uses MiniFS (fully provided, no changes needed)

**Estimated Duration:** 4-5 class periods (45-50 minutes each)

**Grade Level:** 9-10 (primary), 11-12 (supporting)

**Prerequisites:**
- Functions, return values, and basic error handling in Python
- Dictionaries (reading, writing, checking for keys)
- Familiarity with file paths (`/home/user/file.txt` style)
- Helpful but not required: prior exposure to exceptions (`raise`, `try/except`)

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment
> review. The crosswalk below shows which standards this project is designed
> to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-CS-01** | Explain how abstractions hide the underlying implementation details of computing systems embedded in everyday objects. | Students build the abstraction layer themselves, making visible what `open()` hides. The README connects this to embedded systems (car infotainment, thermostats). |
| **3A-CS-02** | Compare levels of abstraction and interactions between application software, system software, and hardware layers. | The abstraction stack diagram and day 1 discussion walk through each layer from hardware to Python's `open()`. |
| **3B-CS-01** | Categorize the roles of operating system software. | Students implement OS responsibilities directly: data storage and retrieval, access tracking, directory organization. Memory management and process management are discussed. |
| **3A-DA-10** | Evaluate the tradeoffs in how data elements are organized and where data is stored. | The README's storage tradeoff table (RAM vs SSD vs disk vs cloud) anchors a discussion on day 5. Students also experience the volatility tradeoff: MiniFS loses all data on exit. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis. | Each TODO is a discrete sub-problem; students build a working system by composing the six methods. |
| **3A-AP-23** | Document design decisions using text, graphics, presentations, or demonstrations in the development of complex programs. | Exit ticket and reflection questions prompt students to articulate design choices and tradeoffs. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. Describe the path a file read takes from hardware to application code
2. Identify at least three responsibilities of the OS file system driver
3. Implement dictionary-based data structures that represent hierarchical information
4. Raise and handle Python exceptions according to a specification
5. Explain one tradeoff between different storage types (RAM, SSD, cloud)
6. Trace what `_navigate()` does for a given path

---

## Files in This Package

| File | Purpose |
|------|---------|
| `solution.py` | Complete reference implementation (instructor only, do not distribute) |
| `lesson-plan.md` | This document |
| Building-a-File-System student template: | |
| `file_system.py` | MiniFS skeleton with six TODO methods |
| `main.py` | Provided REPL shell |
| `test_filesystem.py` | Test suite |
| `README.md` | Student-facing instructions and background |
| `requirements.txt` | Empty (no external dependencies) |

---

## Lesson Sequence

### Day 1: What Happens When You Save a File? (45 min)

**Objectives:**
- Identify the layers between a Python program and physical storage
- Describe at least two OS responsibilities

**Activities:**

1. **Warm-up (8 min):** Ask students: "When you press Ctrl+S, what actually
   happens?" Take answers without correcting yet. Write them on the board.

2. **Live demo (12 min):** In the terminal, use Python's `os` module to explore
   the real file system students are actually running on:
   ```python
   import os
   os.listdir(".")
   os.path.exists("file_system.py")
   os.path.getsize("file_system.py")
   ```
   Ask: "Where do these answers come from? Who knows about file sizes?"

3. **Lecture/discussion (15 min):** Walk through the abstraction stack from the
   README. Draw each layer on the board. Key points:
   - The OS tracks file locations (inode table), permissions, and structure
   - Hardware just stores bytes at addresses; it does not know about "files" or "names"
   - Python's `open()` is a thin wrapper over an OS system call

4. **OS roles (10 min):** Ask students to categorize what the OS handles.
   Guide them toward: data storage/retrieval, access control, process
   coordination, memory management. Connect to `3B-CS-01`.

5. **Introduce the project (5 min):** Preview `file_system.py`. Point out the
   nested dict representation. "You are going to implement the part of the OS
   that tracks files and directories."

**Discussion prompt:** "A car's GPS saves your recent destinations. What
layers of software might be involved between pressing 'Save' and the data
hitting flash memory?"

---

### Day 2: Implement `create_file` and `read_file` (45 min)

**Objectives:**
- Understand how `_navigate()` works
- Implement the first two TODO methods

**Activities:**

1. **Code walkthrough (15 min):** Read through `file_system.py` as a class.
   Focus on `_root`, `_split_path`, and `_navigate`. Trace `_navigate` by
   hand for the path `/home/alice/notes.txt` on the board:
   - `parts = ["home", "alice", "notes.txt"]`
   - Loop over `["home", "alice"]`, descending the dict
   - Return `(alice_dict, "notes.txt")`

   Ask: "What does `_navigate` return for `/hello.txt`? What does the loop
   do when `parts[:-1]` is empty?"

2. **Implement `create_file` (15 min):**
   Walk through the expected behavior together using the docstring. Then
   let students code it. Most students can do this in under 10 minutes once
   they understand what `_navigate` returns.

   Common issue: students call `_navigate` and then forget that it raises
   `FileNotFoundError` automatically for a missing parent. They add a manual
   check that either duplicates or conflicts with the automatic one. Clarify
   that `_navigate` handles intermediate directories; they only need to check
   whether `name in parent`.

3. **Implement `read_file` (10 min):**
   Similar pattern. Students check `name not in parent` and whether the
   entry is a string or dict.

4. **Run tests (5 min):**
   `python test_filesystem.py`. Only the `create_file` and `read_file`
   sections should pass at this point. That is expected.

**Common student errors:**

```python
# Wrong: creates a file even when parent doesn't exist
def create_file(self, path, content=""):
    parts = self._split_path(path)
    name = parts[-1]
    self._root[name] = content  # skips _navigate entirely

# Wrong: returns None instead of the content
def read_file(self, path):
    parent, name = self._navigate(path)
    if name in parent:
        return  # forgot "return parent[name]"
```

---

### Day 3: Implement `write_file`, `create_dir`, and `list_dir` (45 min)

**Objectives:**
- Implement three more TODO methods
- Understand the difference between creating and overwriting

**Activities:**

1. **Warm-up (5 min):** Quick review. "What does `_navigate` return? When does
   it raise `FileNotFoundError` on its own?"

2. **Implement `write_file` (10 min):**
   Point out the key difference from `create_file`: the file must already
   exist. Students often re-implement `create_file` logic here. Ask them to
   re-read the docstring. What should happen if the path doesn't exist? What
   if it's a directory?

3. **Implement `create_dir` (10 min):**
   Nearly identical to `create_file`. The only difference is assigning `{}`
   instead of a string. Students who understand `create_file` should finish
   this quickly.

4. **Implement `list_dir` (15 min):**
   This is the most interesting of the three. Two cases to handle:
   - Root (`/`): no call to `_navigate` needed; return `sorted(self._root.keys())`
   - All other paths: call `_navigate`, check the entry, return sorted keys

   Ask students: "Why is the root a special case? What would happen if you
   called `_navigate('/')`?" (`_split_path("/")` returns `[]`, and
   `_navigate` raises an error for an empty path.)

5. **Run tests (5 min):**
   `python test_filesystem.py`. Sections 1-5 should now pass.

**Instructor note:** If students finish early, have them try the shell
(`python main.py`) before `delete` is implemented. The shell will handle
the missing method gracefully since `rm` is the only command that calls it.

---

### Day 4: Implement `delete`, Use the Shell (45 min)

**Objectives:**
- Implement `delete` with the non-empty directory check
- Use the REPL shell to explore the file system interactively

**Activities:**

1. **Implement `delete` (15 min):**
   Walk through the three cases before students code:
   - Path doesn't exist: raise `FileNotFoundError`
   - Path is a non-empty directory: raise `OSError("Directory not empty")`
   - Anything else: `del parent[name]`

   Ask: "Why do most operating systems refuse to delete a non-empty directory
   with a plain `rm`? What does `rm -rf` do differently?"

2. **Run all tests (5 min):**
   `python test_filesystem.py`. All tests should pass. If some fail, debug
   together as a class. The most common issue at this stage is the
   `OSError` message not containing the string "not empty".

3. **Use the shell (20 min):**
   `python main.py`. Students explore the shell. Suggested activity:
   - Create a directory tree that mimics something real (`/home/student/projects/`)
   - Create files, read them back, overwrite them
   - Try to delete a non-empty directory and observe the error
   - Exit, re-run, observe that everything is gone (volatility)

4. **Discussion (5 min):**
   "You just built the part of the OS that manages the file system. What did
   you have to keep track of? What would be much harder on real hardware?"

**Extension prompt for fast finishers:** "Implement `copy(src, dst)` as a
method on MiniFS and wire it up to a `cp` command in main.py."

---

### Day 5 (Optional): Tradeoffs, Extensions, and Discussion (45 min)

**Objectives:**
- Analyze storage tradeoffs (3A-DA-10)
- Connect file systems to databases and cloud storage
- Work on extensions or present solutions

**Activities:**

1. **Tradeoff discussion (15 min):**
   Use the table from the README as a starting point. Ask:
   - "When would you choose RAM over disk?"
   - "Why does a web server cache frequently accessed files in memory?"
   - "What does 'cloud storage' mean in terms of this abstraction stack?"
   - "A database uses a file on disk to store its data. How many abstraction
     layers are between a database query and the physical disk?"

2. **Extensions or peer review (20 min):**
   Students who are done work on the extension challenges from the README.
   Others finish any remaining tests.

   Alternatively, run a brief peer review: swap code with a partner and
   check one method together using the checklist:
   - Does it handle all error cases?
   - Does it return the right type?
   - Is it readable?

3. **Wrap-up (10 min):**
   Return to the warm-up question from Day 1: "When you press Ctrl+S, what
   happens?" Students should now be able to give a more complete answer.

   Exit ticket: "Name one responsibility of the OS that MiniFS implements,
   and one responsibility that MiniFS does not implement."

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** The 27 tests provide immediate, specific feedback on each method
- **Exit tickets:** One-sentence explanation of a concept from that day
- **Observation:** Watch for students who call `_navigate` incorrectly or skip it entirely

### Summative Assessment

**Option A: Code submission**

Rubric:
- All tests pass (50%)
- Code is readable with clear variable names and no dead code (20%)
- Raises the correct exception types with informative messages (30%)

**Option B: Written explanation**

Ask students to trace `_navigate("/home/alice/notes.txt")` step by step and
explain what `create_file` does with the return value. Then explain one
tradeoff between in-memory and on-disk storage in their own words.

**Option C: Extension project**

Implement at least one extension challenge and explain the design decisions
in writing: what errors does it raise, how does it interact with existing
methods, and what tradeoffs did you make?

---

## Differentiation

### For Students Who Need More Support

- Pair on `_navigate` tracing before any coding: work through three paths
  by hand (`/a.txt`, `/home/b.txt`, `/x/y/z.txt`)
- Provide a partially filled-in `create_file` showing the `_navigate` call,
  the `in parent` check, and a blank line for the assignment
- Focus on the first four TODOs; `list_dir` and `delete` can be optional

### For Advanced Students

- Extend the shell with `copy` and `move` commands (medium/hard challenges)
- Implement the permission system (hard challenge)
- Research how real file systems handle the inode table and explain how it
  differs from MiniFS's nested dict approach
- Investigate `os.stat()` in Python and compare its output to what MiniFS tracks

---

## Troubleshooting Guide

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| `_navigate` raises `FileNotFoundError` unexpectedly | Student called `_navigate` on a path like `/` | Check for root as a special case before calling `_navigate` |
| `create_file` creates a file even when parent is missing | Student skipped `_navigate` and wrote directly to `self._root` | Remind them `_navigate` walks down intermediate directories |
| `list_dir("/")` returns `None` | Student returned early before handling the root case | Check `_split_path("/")` returns `[]`; root must be handled separately |
| `OSError` test fails | Error message does not contain "not empty" | The test checks `"not empty" in str(e).lower()`; message must include those words |
| `write_file` creates new files | Student did not check `name not in parent` | `write_file` is not `create_file`; the file must already exist |
| Shell startup says TODOs not complete | Any one of the six methods returns `None` or raises unexpectedly | Run `python test_filesystem.py` to identify which test fails first |

---

## Discussion Prompts

Use these throughout the unit to deepen engagement with the standards:

1. "What is the difference between a file name and the data in a file?
   Which one does the hardware actually know about?"

2. "Why does deleting a large file on a real OS sometimes seem instantaneous,
   even if the file is gigabytes? What is the OS actually doing?"

3. "Two programs open the same file at the same time. One reads, one writes.
   What could go wrong? How would you add locking to MiniFS?"

4. "A database like SQLite stores its data in a single file. What abstraction
   layers does a database query pass through before hitting disk?"

5. "Why does RAM lose its data when the power goes off? Why doesn't a hard
   disk?" (Connect to physics: magnetic domains vs. capacitor charge)

---

*Last updated: March 2026*
