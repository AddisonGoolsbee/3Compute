# Welcome to 3Compute

This is your first lesson. By the end, you will have opened a terminal, run Linux commands, written and executed Python code, and put a live webpage on the internet with a URL you can text to a friend.

Everything you do in 3compute runs on a real Linux server, not a simulator. The commands you learn here are the same ones professional developers type every day.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What You Will Learn

- How to use the three main panels of 3compute: the file explorer, the editor, and the terminal
- Basic Linux commands to move around, inspect, create, and delete files
- The edit-save-run loop: the workflow every developer uses every day
- Working directories and relative paths
- How to run a small web server and share the URL

## Setup

Right-click the `Welcome-to-3compute` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

That's it. Nothing to install yet. Parts 4 and 5 will have you install one thing each.

## What This README Covers

- **Part 1:** A tour of the 3compute interface (the three panels)
- **Part 2:** Terminal basics, including the commands you will reuse for years
- **Part 3:** Writing, saving, and running your first Python program
- **Part 4:** Reading and writing files, including how paths work
- **Part 5:** Running a web server and putting it on the public internet
- A command cheat sheet at the end, and pointers to what to try next

Work through the parts in order. Each part takes roughly 20 to 45 minutes depending on how much you explore.

---

## Part 1: The Tour

Look at your screen right now. 3compute is split into three main areas.

**The file explorer (left).** This is your files, organized as folders. Each classroom, lesson, and project lives somewhere in here. You can click a folder to expand it, click a file to open it in the editor, right-click anything for a menu, and drag files to move them around.

**The editor (middle).** This is where you read and write code. When you click a file, it opens here. Ctrl+S (or Cmd+S on a Mac) saves. Markdown files like this one can be previewed with the button at the top right of the editor.

**The terminal (bottom).** This is where you type commands that run on the Linux server. Anything you can do with the file explorer, you can also do here with typed commands. Sometimes the terminal is faster. Sometimes it is the only way. Either way, every developer needs to be comfortable with one.

### Try It

If you have not already, right-click the `Welcome-to-3compute` folder and select **Open in Terminal**. Then type this and press Enter:

```
pwd
```

It will print something like `/app/Welcome-to-3compute`. That is your current location inside the Linux server. `pwd` stands for "print working directory" and answers the question *where am I?*

That first piece of output is your first "aha" moment: you are running a real Linux machine from your browser.

---

## Part 2: Terminal Basics

The terminal accepts one command per line. You type a command, press Enter, and the server runs it.

### The Commands You Will Use Every Day

| Command | What It Does | Example |
|---------|--------------|---------|
| `pwd` | Show the current folder | `pwd` |
| `ls` | List what is in the current folder | `ls` |
| `cd <folder>` | Change into a folder | `cd part3` |
| `cd ..` | Go up one folder | `cd ..` |
| `mkdir <name>` | Create a folder | `mkdir notes` |
| `touch <name>` | Create an empty file | `touch idea.txt` |
| `rm <name>` | Delete a file | `rm idea.txt` |
| `rm -r <name>` | Delete a folder and its contents | `rm -r notes` |
| `cat <file>` | Print a file's contents | `cat README.md` |
| `clear` | Clear the screen | `clear` |

### Shortcuts That Make You Much Faster

- **Tab** completes filenames. Type `cd pa` then press Tab and watch it fill in `cd part3/`.
- **Up arrow** recalls your previous command. Press it again for the one before. This saves enormous time.
- **Ctrl+C** stops whatever is running. Useful if a program is stuck or you launched something by accident.
- **Ctrl+L** clears the screen, same as `clear`.

> **Copying from the terminal.** In the 3compute terminal, plain `Ctrl+C` is reserved for stopping programs (just like a real Linux machine), so it does **not** copy selected text. To copy, select with the mouse and then press **Ctrl+Shift+C** (Windows / Linux / ChromeOS) or **Cmd+C** (Mac). To paste, use **Ctrl+Shift+V** or **Cmd+V**.

### A Small Exercise

Create a small folder structure to practice. From inside `Welcome-to-3compute/`, run:

```bash
mkdir practice
cd practice
mkdir favorites
cd favorites
touch song.txt movie.txt book.txt
ls
```

Now go back up and look at what you made:

```bash
cd ..
ls
```

Then look two levels up:

```bash
cd ..
ls
```

When you are done practicing, clean up:

```bash
rm -r practice
```

You do not have to remember every command right now. You will have this cheat sheet for reference, and the commands will become natural as you use them.

---

## Part 3: Your First Program

Open `part3/hello.py` in the editor. You should see this:

```python
print("Hello, world!")
```

That's a complete Python program. Run it from the terminal. You are currently inside `Welcome-to-3compute/`. Move into the `part3` folder first:

```bash
cd part3
python hello.py
```

You should see `Hello, world!` printed. Congratulations, you ran your first program on 3compute.

### Why Run It From the Terminal?

You might notice 3compute has a "Run" button. It works, but you should learn to run from the terminal because:

1. You control exactly what runs and how.
2. You can pass extra information to the program (arguments).

### Modify It

Change `hello.py` so it asks for your name and greets you personally. Replace the contents with:

```python
name = input("What's your name? ")
print(f"Hello, {name}!")
```

Then re-run:

```bash
python hello.py
```

It will pause and wait for you to type. Type your name and press Enter.

### Your Turn: Multiplication Table

Replace `hello.py` with a program that asks for a number and prints its times table from 1 to 10. The output should look like:

```
What number? 7
7 x 1 = 7
7 x 2 = 14
7 x 3 = 21
...
7 x 10 = 70
```

Hints:

- `n = int(input("What number? "))` gets the user's number as an integer.
- A `for i in range(1, 11):` loop runs `i` from 1 to 10.
- f-strings let you build strings with values: `f"{n} x {i} = {n * i}"`.

When you have it working, move on to Part 4.

---

## Part 4: Reading and Writing Files

Programs usually need to remember things between runs. The way they do that is by reading and writing files.

Move into the `part4` folder:

```bash
cd ../part4
```

The `..` means "one folder up." So `cd ../part4` means "go up one folder, then into `part4`." You are now inside `part4/`, next to `journal.py`.

### What the Program Does

Open `journal.py` in the editor. It is a small journal. You run it, type an entry, and it saves that entry (with today's date) to a file called `journal.txt`. You can also run it to read past entries.

Run it now:

```bash
python journal.py
```

Type `write` when asked, then type a short entry and press Enter. The program will save it and exit.

Look at what happened. Run `ls` to see the new file:

```bash
ls
```

You should see `journal.txt` appear. Read it:

```bash
cat journal.txt
```

Your entry is there, with the date.

### Your Turn: Complete the Reader

Now run the program again, but type `read` instead of `write`:

```bash
python journal.py
```

Nothing happens, because the `read_journal()` function is not finished. Open `journal.py` and look for the TODO inside `read_journal()`. Follow the hints in the comments to complete it.

When you are done, test by writing two or three more entries and then reading them all back.

---

## Part 5: Put It On the Internet

The last part: run a tiny web server and share its public URL.

Move into the `part5` folder:

```bash
cd ../part5
```

Install the one library we need:

```bash
pip install -r requirements.txt
```

Now start the server:

```bash
python app.py
```

You will see output ending in something like `Running on http://0.0.0.0:10000`. Above that, 3compute prints a public URL - look for a line like `Subdomain: something.app.3compute.org`. That is your site. Click it, or copy it into a new browser tab.

You should see a page that says "Hello from my 3compute server!"

### Share It

Send that URL to a classmate or a friend. They can open it from their own laptop or phone. There is no special setup on their end - it is a real website running from your 3compute container.

### Change the Page

Leave the server running. Open `app.py` in the editor. Find the line:

```python
return "<h1>Hello from my 3compute server!</h1>"
```

Change the text between the `<h1>` tags to anything you want. Save the file. The server will restart automatically (that's what `debug=True` does in the code). Refresh the browser tab. Your new message is live.

### When You Are Done

When you want to stop the server, go back to the terminal and press **Ctrl+C**. The URL will stop working until you start the server again.

---

## Command Cheat Sheet

Keep this handy for every future lesson.

### Moving Around

| Command | What It Does |
|---------|--------------|
| `pwd` | Where am I? |
| `ls` | What is in this folder? |
| `cd <name>` | Go into a folder |
| `cd ..` | Go up one folder |
| `cd ../<sibling>` | Go up then into a sibling folder |

### Creating and Deleting

| Command | What It Does |
|---------|--------------|
| `mkdir <name>` | New folder |
| `touch <name.txt>` | New empty file |
| `rm <name.txt>` | Delete a file |
| `rm -r <name>` | Delete a folder and everything in it |

### Reading

| Command | What It Does |
|---------|--------------|
| `cat <file>` | Print a file's contents |

### Running Code

| Command | What It Does |
|---------|--------------|
| `python <file.py>` | Run a Python script |
| `pip install <library>` | Install a Python library |
| `Ctrl+C` | Stop a running program |

### Terminal Shortcuts

| Shortcut | What It Does |
|----------|--------------|
| Tab | Auto-complete a filename |
| Up arrow | Recall your previous command |
| Ctrl+L | Clear the screen |
| Ctrl+Shift+C / Cmd+C | Copy selected text (plain Ctrl+C stops programs) |
| Ctrl+Shift+V / Cmd+V | Paste into the terminal |

---

## Where to Go Next

You now know enough to start any other lesson in 3compute. A few suggestions based on what interests you:

- **Build a real personal website.** Open `My-Website` or `Website` to make a site with your name, bio, and projects. Both use the same Flask pattern you saw in Part 5.
- **Learn how data works.** Open `Data-Analysis` to work with a CSV dataset of 150 students, or `Data-Encoding` to see how text and color are stored as numbers.
- **Build a game.** Open `Snake-Game` to build a playable Snake clone with a leaderboard, or `Tic-Tac-Toe` to build an AI that cannot be beaten.
- **Make a Discord bot.** Open `Discord-Bot` to build a bot that responds to commands in your own Discord server.

Every lesson in 3compute follows the same pattern as this one: a README at the top of the folder explains what you are building, then you edit files and run them from the terminal.

Good luck.
