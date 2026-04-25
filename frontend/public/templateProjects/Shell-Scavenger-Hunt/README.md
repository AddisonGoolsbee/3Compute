# Shell Scavenger Hunt

A 45-minute terminal puzzle. Follow clues hidden in files and folders, room by room, until you find the treasure at the bottom of the mansion.

This lesson has one purpose: make you fast and comfortable navigating a Linux filesystem from the command line. By the end, you will have run the same handful of commands dozens of times until they feel automatic.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start.

## Terminal Only

The file explorer on the left cannot solve this puzzle. Most of the clue files are intentionally unreadable by the editor - you will get a "cannot be displayed" message if you try. The clues are written as terminal instructions, the mansion contains many dead-end files that will waste your time if you click around blindly, and the entire point of the exercise is to build terminal muscle memory. Stick to the terminal.

## Warning: Traps Ahead

The final stretch of this hunt contains fake treasure. If you cut corners or skip a step, you will open the wrong file and get the wrong answer. Follow the clues precisely. The last clue teaches you the commands you need to avoid the traps.

## Setup

Right-click the `Shell-Scavenger-Hunt` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Then read your first clue:

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

## Getting Unstuck

If you are lost, two commands will always help:

- `pwd` tells you exactly where you are in the mansion.
- `ls` tells you what is around you.

## When You Finish

The last clue is in a file called `treasure.txt`. When you find it, you have officially completed your first terminal challenge and are ready for any other lesson in 3compute.

Start by running `cat start.txt` in your terminal. Good luck, detective.
