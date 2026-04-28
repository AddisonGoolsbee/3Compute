# Welcome to CS Room: Instructor Lesson Plan

## Overview

The onboarding lesson for CS Room. Students learn the three-panel interface (file explorer, editor, terminal), run basic Linux commands, write and execute small Python programs, read and write files from Python, and finish by publishing a live webpage at a public URL they can share with anyone.

The lesson is self-guided: every step is described in the student README with expected outputs and diagnostic notes. The instructor's role is to orient the class, troubleshoot snags, and lead a short closing discussion. Most of the time students work at their own pace.

**Estimated Duration:** 2-3 class periods (45-50 minutes each)

**Grade Level:** 9-12

**Prerequisites:**
- Logged-in CS Room account
- No prior Linux, terminal, or Python experience required

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards (Direct Instruction)

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-CS-02** | Compare levels of abstraction, analogy, and paradigm for the interactions between application software, system software, and hardware. | Students see three concrete layers interact: their Python program (application), the Linux shell and filesystem (system software), and the remote CS Room container (hardware). Parts 1 and 2 make the interface between application and system explicit (running `python hello.py` in a terminal is the application invoking the OS). Part 5 exposes the third layer when the Flask server produces a URL served by the container's network stack. |
| **3A-AP-16** | Design and iteratively develop computational artifacts for practical intent, personal expression, or to address a societal need while evaluating intended and unintended consequences. | Part 5 has students publish a real webpage at their own public URL, modify the content, refresh, and share the URL with classmates. The iterative edit-save-refresh loop is the core developer workflow, applied to a personal creative artifact. |

### Supporting Standards (Context and Discussion)

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3A-AP-13** | Create prototypes that use algorithms to solve computational problems by leveraging prior student knowledge and personal interests. | The Part 3 multiplication table and the Part 4 journal are small prototypes driven by the student's choices (which number to test, what to write in the journal). |
| **3A-CS-03** | Develop guidelines that convey systematic troubleshooting strategies that others can use to identify and fix errors. | The README includes a troubleshooting rhythm (print what you see, change one thing at a time) and each part's "expected output" lets students self-check. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Navigate** the CS Room UI: open folders, open files in the editor, and open a terminal at a specific folder
2. **Use** basic Linux commands to move around and inspect files (`pwd`, `ls`, `cd`, `cd ..`, `cat`, `mkdir`, `touch`, `rm`)
3. **Use** terminal shortcuts (tab completion, up-arrow history, Ctrl+C, Ctrl+L)
4. **Write, save, and run** a Python program using the editor and the terminal together
5. **Read and write** files from Python, including understanding that file paths are relative to the current working directory
6. **Run** a Flask web server, open it at a public URL, and modify the returned content with the server still running
7. **Explain** in their own words what each of the three CS Room panels is for and when to use each

---

## Lesson Sequence

### Day 1: Orientation, Terminal Basics, First Program (45-50 min)

Covers student README Parts 1-3.

**Objectives:**
- Get every student through Part 1 (tour) and Part 2 (commands)
- Start Part 3 (Hello World) by end of period

**Activities:**

1. **Orientation (10 min):**

   Open a projected CS Room window. Walk the class through the three panels. Make these points concrete:
   - File explorer is a view of folders on the server, not on the local laptop
   - The editor is where code is written but not where it runs
   - The terminal is where code runs

   Demonstrate right-clicking a folder and selecting Open in Terminal. Run `pwd` once so they see real output.

2. **Distribute the template (2 min):**

   Push the Welcome-to-CS-Room template to your classroom, or have students create it from the Template button.

3. **Self-guided Part 1 + Part 2 (20 min):**

   Students follow the README. Circulate. Common issues:

   | Student is stuck on... | Helpful nudge |
   |------------------------|---------------|
   | "pwd" not recognized | Confirm they're in the terminal panel, not the editor |
   | Can't find Open in Terminal | Right-click, not left-click, on a folder |
   | Commands not running | They forgot to press Enter |

4. **Start Part 3 (10 min):**

   Have each student open `part3/hello.py`, run it, and modify it to ask for their name. End of period.

5. **Close (3 min):**

   Verbal exit ticket: one thing they learned that they didn't know at the start of class.

---

### Day 2: Python Programs, Files (45-50 min)

Covers student README Parts 3 (finish) and 4.

**Objectives:**
- Complete the Part 3 multiplication table
- Complete the Part 4 journal (including the read_journal TODO)

**Activities:**

1. **Warm-up (5 min):**

   Ask: "What did your hello.py look like yesterday? Did anything surprise you about running it?"

   Briefly explain the difference between saving a file and running it. Many students will conflate the two.

2. **Part 3 completion: multiplication table (15 min):**

   Students complete the multiplication table exercise. Pair-programming is fine. Circulate for Python syntax help. Common mistakes:

   ```python
   # Forgot int():
   n = input("Number? ")
   print(n * 2)   # prints "22" for input "2"

   # Fixed:
   n = int(input("Number? "))
   print(n * 2)   # prints 4
   ```

3. **Part 4 overview (5 min):**

   Walk through `journal.py` as a class. Point out what is already done (`add_entry`) and what is left (`read_journal`'s TODO). Emphasize the hint about `try/except FileNotFoundError`.

4. **Part 4 implementation (15 min):**

   Students complete `read_journal`. Circulate for debugging help.

5. **Close (5 min):**

   Quick discussion: "Your journal.py writes to a file. If you delete the journal.txt file from the explorer, what happens if you run `python journal.py` and choose 'read' again? Why?"

---

### Day 3: Publish to the Web (45-50 min)

Covers student README Part 5.

**Objectives:**
- Install Flask, run the server, open the public URL, modify and refresh
- Share the URL with at least one classmate

**Activities:**

1. **Framing (5 min):**

   "Today you will put your code on the internet. Not a simulation - a real webpage that any phone, computer, or tablet anywhere in the world can open."

   Draw or project the flow: `app.py` runs inside the CS Room container. CS Room gives each user a set of ports. One of those ports maps to a public subdomain. When someone visits the URL, their browser asks the server, which asks Flask, which runs your function.

2. **Self-guided Part 5 (25 min):**

   Students run `pip install -r requirements.txt` and then `python app.py`. When they see a public URL in the terminal output, they open it. Then they modify the HTML and refresh.

   Common issues:

   | Student is stuck on... | Helpful nudge |
   |------------------------|---------------|
   | Port already in use | Stop any Part 4 Python process first (Ctrl+C), or change the port in `app.py` |
   | Can't find the public URL | Look at the terminal output above the Flask "running on" line - CS Room prints a subdomain line separately |
   | Changes don't appear on refresh | Make sure `debug=True` is in `app.run(...)`; otherwise restart the server manually |

3. **Share the URL (10 min):**

   Have students paste their URL into a shared document, and visit at least three classmates' pages. Optional: best-looking page vote.

4. **Debrief (5 min):**

   Ask: "What changes, and what stays the same, when someone else visits your URL? Does your Flask app know who is visiting?" This starts the conversation about how servers and clients interact.

---

## Assessment

### Formative

- **Part 1 / Part 2:** watch for `pwd` output on each student's screen; everyone should get this working within 10 minutes of starting
- **Part 3 modification:** ask each student to run their hello.py for the whole class; the personalized greeting is a visible milestone
- **Part 4 journal:** after the read function is done, students should be able to `cat journal.txt` from the terminal and see multiple entries

### Summative

**Option A: Submit the URL.** Students paste the URL of their Part 5 webpage. Grade on:
- URL is live (20%)
- Page shows customized content, not the default "Hello from my CS Room server!" (40%)
- Student can explain what each file in the `part5/` folder does (40%)

**Option B: Command Recall.** Ask students in writing:
- Which command shows you where you are in the filesystem?
- What happens when you run `cd ..`?
- Why do we run Python programs from the terminal instead of a "Run" button?
- What is the difference between saving a file and running a file?

**Option C: Walkthrough Demo.** One-on-one or small group: student demonstrates creating a folder, adding a file, editing it in the editor, and running it from the terminal. Grade on fluency.

---

## Differentiation

### For Struggling Students

- Pair with a partner throughout Day 1. Terminal anxiety is real and shared.
- Provide a printed command cheat sheet (the table in the README).
- For Part 3, allow them to copy the multiplication table code from a reference and focus on running and modifying it rather than writing it from scratch.
- Part 4's `read_journal` TODO can be skipped if time is tight; they can still complete Part 5.

### For Advanced Students

- Day 1: Ask them to also explore the Shell-Scavenger-Hunt template as a warm-up, then come back to the Welcome lesson.
- Day 2: After finishing Part 4, have them add an "delete entry by number" feature to the journal.
- Day 3: Instead of the default Flask hello-world page, have them add a second route (`/about`) that shows a short bio, or accept query parameters (`?name=...`).
- Ask them to read the generated Flask log output line by line and explain what each line means.

---

## Discussion Prompts

Use these during debriefs or as written exit tickets:

1. "What is one thing the terminal can do that the file explorer cannot?"
2. "When you run `python hello.py`, whose computer is actually running the program?"
3. "In Part 4 you saved a journal entry to a file. If you could only save one piece of information between runs of a program, what would it be and why?"
4. "A public URL means anyone can reach your site. What are some reasons that might be a bad thing? What could you do about it?"
5. "The commands `pwd`, `ls`, and `cd` are all short for longer words. What do you think they stand for? Do these names help or hurt someone trying to learn?"

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "My code runs on my laptop." | The code runs inside a container on a CS Room server. Your laptop only runs the browser. |
| "Saving a file runs it." | Saving writes the file to disk. Running executes it. These are separate steps. |
| "The terminal and the editor are showing different files." | They are showing the same filesystem. Changes in one are visible to the other after a refresh or re-read. |
| "Pressing the Run button is different from running `python hello.py`." | They do the same thing under the hood. The button is a convenience that shells out to the terminal command. |
| "`cd ..` goes back to the previous command." | `cd ..` goes up one folder in the filesystem. The up-arrow key recalls the previous command. |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `lesson-plan.md` | This document |
| Welcome-to-CS-Room student template: | |
| `README.md` | Student-facing walkthrough of all 5 parts |
| `part3/hello.py` | Starter "Hello, world!" Python file |
| `part4/journal.py` | Partially implemented journal with a TODO for `read_journal()` |
| `part5/app.py` | Three-route Flask server |
| `part5/requirements.txt` | Just `flask` |

---

## Additional Resources

### For Instructors

- [Python for Everybody (Chuck Severance, free)](https://www.py4e.com/) - Chapters 1-3 are a solid match for students who want more Python background after Day 2
- [Flask Quickstart](https://flask.palletsprojects.com/en/latest/quickstart/) - One page, good for teachers who have not used Flask before

### For Students (linked from README.md)

- MDN Web Docs for HTML and CSS (referenced in Part 5 if students want to dress up their page)
- python.org documentation for the `input`, `print`, and `open` functions used in Parts 3 and 4
