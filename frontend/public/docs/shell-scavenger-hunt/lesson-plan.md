# Shell Scavenger Hunt: Instructor Lesson Plan

## Overview

Students follow a chain of clue files through a nested filesystem, reading each with `cat` and navigating with `cd` and `ls`. A dead-end trail of visible decoys and a hidden `.vault/` folder at the end forces them to learn and combine `ls -a` and `ls -l` in order to find the prize among several decoy coin piles. The correct answer is a single number (the coin count in the largest pile), which makes grading trivial and diagnostic.

The `ls` flags are introduced over two beats, not all at once: the freezer clue (`ice-tray.txt`) teaches `ls -a` and points students to the basement; once they enter the hidden vault, an `inscription.txt` waiting on the wall teaches `ls -l` and combining flags. This keeps any single `cat` from dumping the entire flag reference into the terminal.

The lesson is designed to run unsupervised. Students work individually through the hunt while you circulate for questions. No live coding or direct instruction is required, though a short warm-up and debrief are recommended.

**Estimated Duration:** 1 class period (45-60 minutes)

**Grade Level:** 9-12, or any age group with basic computer literacy

**Prerequisites:**
- Able to log in to CS Room
- Comfortable typing and using a mouse
- No prior programming or Linux experience required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3A-CS-03** | Develop guidelines that convey systematic troubleshooting strategies that others can use to identify and fix errors. | The final stretch of the hunt requires students to recognize when a strategy is incomplete (e.g., `ls` alone misses hidden files) and combine tools (`ls -al`) to get full information. The "wrong answer tells you which step you missed" feedback loop is an explicit systematic-troubleshooting model. |

This lesson is primarily an onboarding / tool-fluency exercise rather than a computer science content lesson. Useful for curricular lessons that assume terminal comfort.

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Open a terminal** at a specific project folder using the CS Room file explorer
2. **Navigate** the Linux filesystem using `pwd`, `ls`, `cd`, and `cd ..`
3. **Read** a file's contents using `cat`
4. **Use tab completion and up-arrow history** to type commands faster
5. **List hidden files** using `ls -a` and recognize the `.` and `..` entries
6. **List file sizes and details** using `ls -l`, and identify the size column
7. **Combine flags** into `ls -al` and explain why combination is necessary when two pieces of information are both needed

---

## Lesson Sequence

### Single Day (45-60 min)

**Objectives:**
- Complete the scavenger hunt
- Leave with working terminal fluency

**Activities:**

1. **Warm-up / Orientation (5 min):**

   Ask the class: "Has anyone used a command line before? What was it for?"

   Briefly explain that a terminal is a way to type commands to a computer directly, bypassing the menus and buttons. Everything the file explorer can do, the terminal can also do, and a lot more. Tell them today they will use a terminal to play a puzzle.

   Draw or project the CS Room three-panel layout: file explorer (left), editor (middle), terminal (bottom). Point out the right-click "Open in Terminal" option on any folder.

2. **Distribute the template (2 min):**

   Push the `Shell-Scavenger-Hunt` template to your classroom, or instruct students to create it from the New button's template picker. Have them right-click the resulting folder and select Open in Terminal.

3. **Self-guided hunt (30-45 min):**

   Students read the README in the editor, then `cat start.txt` in the terminal, then follow the clues through the mansion. Circulate and answer questions but avoid giving away any part of the puzzle.

4. **Debrief (5-10 min):**

   Ask students to report the coin count they found. The correct answer is **4**. Other numbers map to specific mistakes:

   | Student reports | Mistake they made |
   |-----------------|-------------------|
   | **4** | Correct - used `ls -al` in the vault |
   | 2 | Used `ls -a` in the vault but not `ls -l` (picked a hidden pile without checking sizes) |
   | 8, 11, or 15 | Ignored the `inscription.txt` note inside the vault (or used plain `ls`) and picked a visible pile |
   | 3, 7, or 12 | Never used `ls -a` at basement level; fell for a visible decoy chest |

   Use this as a teaching moment: "Your number tells me exactly which step you skipped. That's how useful `ls -al` is - it gives you both pieces of information that each of the individual commands only gives you half of."

   If time permits, demonstrate the file explorer's eye icon toggle (top right) as an alternative UI for viewing hidden files, and reinforce that `ls -a` is the universal approach that works on any Linux system.

**Materials:**

- Shell-Scavenger-Hunt template imported into each student's workspace
- (Optional) Printed command cheat sheet: `pwd`, `ls`, `ls -a`, `ls -l`, `ls -al`, `cd`, `cd ..`, `cat`

**Instructor Notes:**

- Most students finish in 25-45 minutes. Fast finishers can try the Welcome-to-CS-Room template next.
- The clue files contain a null byte so the editor will refuse to open them. If a student complains that clicking a file shows "This file cannot be displayed in the editor," that is by design; push them back to the terminal.

---

## Assessment

### Formative

- Walk the room during the self-guided portion. Students who are stuck on navigation usually vocalize it - offer command hints without revealing content.
- Ask for the coin count at the end. Every wrong answer points to a specific missed step.

### Summative

Three lightweight options:

**Option A: Verbal / Written Report.** Ask each student for the correct coin count (4) and one sentence on what `ls -al` does that plain `ls` does not. Grade pass/fail.

**Option B: Command Explanation.** Ask: "In your own words, what does the `-a` in `ls -a` stand for and why is it useful?" A correct answer mentions hidden files and dotfile prefixes.

**Option C: Live Demonstration.** Have the student navigate to a specified folder and report what is inside (including hidden items) using only the terminal.

---

## Differentiation

### For Struggling Students

- Pair them with a partner who has used a terminal before.
- Provide a printed command cheat sheet at their desk.
- If they are blocked more than 10 minutes, let them briefly look at the file explorer (without the eye toggle) to see the structure, then require them to `cd` and `cat` through the path they now see.

### For Advanced Students

- After finishing, challenge them to find all files in the hunt that contain a specific word (such as "coins") using `grep -r`. This introduces recursive text search as a related tool.
- Ask them to reproduce the `ls -l` output by hand for a folder they create themselves, labeling each column.
- Point them at `man ls` and ask what other flags are available. What does `ls -t` do? `ls -S`?

---

## Discussion Prompts

Use these at the end of the period or as a written exit ticket:

1. "You ran a `.txt` file through `cat` but could not open it in the editor. Why do you think the editor refused?"
2. "Why do you think hidden files exist in the first place? What are some everyday cases where you would want a file to be invisible by default?"
3. "What happened when you tried to use `ls -l` in the basement? It showed sizes, but they were all similar. What did that tell you?"
4. "You used `cd ..` to go up one folder. In the scavenger hunt you also saw `..` listed by `ls -a`. Why are those the same thing?"
5. "The final clue said 'combining flags is not a gimmick.' Give one everyday example where you would want both hidden files AND file sizes in the same listing outside of this puzzle."

---

## Common Misconceptions

| Misconception | Correction |
|--------------|------------|
| "The file explorer shows me everything that's on the server." | By default, no. Any file or folder whose name starts with `.` is hidden from the default view. |
| "Hidden files are dangerous or for hackers only." | Hidden files are used all the time for configuration (`.env`, `.gitignore`, `.vscode/`) and are a normal, safe part of every Linux system. |
| "`-a` and `-l` are separate commands." | They are flags (options) for the `ls` command. Most commands accept flags, and many commands let you combine flags with a single dash. |
| "`ls -la` and `ls -al` do different things." | They do exactly the same thing. The order of combined flags doesn't matter. |
| "The terminal can only do things the file explorer can do." | The opposite is usually true. The terminal is more powerful. The file explorer is a convenient subset. |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `README.md` | Student-facing intro, terminal-only warning, and commands reference |
| `start.txt` | First clue; teaches basic `cat`/`cd`/`ls` |
| `mansion/hallway/sign-*.txt` | Three signs; one carries the next clue |
| `mansion/bedroom/**` | Room with decoy files and one clue |
| `mansion/kitchen/**` | Deeper nesting (fridge and freezer); the freezer's `ice-tray.txt` introduces `ls -a` |
| `mansion/basement/chest-*.txt` | Three visible decoy chests in the basement |
| `mansion/basement/.vault/` | Hidden folder. Visible `inscription.txt` introduces `ls -l` and combining flags. Five coin-pile candidates (four decoys, one prize); the prize is the largest file and is itself hidden. |

---

## Additional Resources

### For Instructors

- [Linux Foundation: Introduction to Linux](https://training.linuxfoundation.org/training/introduction-to-linux/) - Free self-paced overview if you want deeper terminal background
- [Explainshell](https://explainshell.com/) - Paste any shell command and see each flag explained; useful for showing students what `ls -al` actually means

### For Students

- The student README is self-contained. No external reading is required for this lesson.
