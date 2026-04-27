# Shell Scavenger Hunt

A 45-minute terminal puzzle. Follow clues hidden in files and folders, room by room, until you find the treasure at the bottom of the mansion.

This lesson has one purpose: make you fast and comfortable navigating a Linux filesystem from the command line. By the end, you will have run the same handful of commands dozens of times until they feel automatic.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start.

## Terminal Only

The file explorer on the left cannot solve this puzzle. Most of the clue files are intentionally unreadable by the editor. The clues are written as terminal instructions, and the mansion contains many dead-end files that will waste your time if you click around blindly. Stick to the terminal.

## Warning: Traps Ahead

The final stretch of this hunt contains decoy treasure. If you cut corners or skip a step, you will open the wrong file and get the wrong answer. Follow the clues precisely. The last clues teach you the commands you need to avoid the traps.

## Setup

Right-click the `Shell-Scavenger-Hunt` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Then read your first clue using `cat` to print the text in `start.txt`:

```bash
cat start.txt
```

From there, follow the trail wherever it takes you.

## What This README Covers

- The rules of the hunt (terminal only, follow clues, watch for dead ends)
- The five commands you will use
- The two keyboard shortcuts that will save your fingers
- What to do when you find the treasure

## What You Will Use

| Command | What It Does |
|---------|--------------|
| `pwd` | Show your current folder |
| `ls` | List what is in the current folder |
| `cd <folder>` | Enter a folder |
| `cd ..` | Go up one level |
| `cat <file>` | Read a file |

Two shortcuts will save you a lot of typing:

- **Tab** completes filenames. Type `cat st` and press Tab. The terminal fills in the rest.
- **Up arrow** recalls your previous command. Useful when you want to run almost the same thing again.

> **Copying from the terminal.** Plain `Ctrl+C` in the terminal is reserved for stopping programs, so it does not copy text. To copy clue text out of the terminal, select it with the mouse and press **Ctrl+Shift+C** (Windows / Linux / ChromeOS) or **Cmd+C** (Mac).

## Getting Unstuck

If you are lost, two commands will always help:

- `pwd` tells you exactly where you are in the mansion.
- `ls` tells you what is around you.

## Start

Start by running `cat start.txt` in your terminal. Good luck, detective.
