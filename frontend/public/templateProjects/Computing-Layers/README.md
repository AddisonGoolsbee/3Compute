# Computing Layers: Build a File System

When you save a file, something has to decide where on the physical disk
those bytes land, what permissions protect them, how to find them again later,
and how to give your program access to them through a name like
`"notes.txt"`. That work belongs to the operating system.

In this project you will build **MiniFS**: a simplified in-memory file system
stored in a Python dictionary. Every detail the OS normally hides will be
visible because *you* will write it.

## What You Will Learn

- What the OS actually does when you call `open()`, `read()`, or `write()`
- How layers of abstraction hide hardware details from application code
- How data is organized and the tradeoffs between different storage types
- How to navigate and manipulate a recursive data structure

## Quick Start

1. Open `file_system.py` and read through the code and comments
2. Complete the six TODOs in order
3. Test your work: `python test_filesystem.py`
4. Try the shell: `python main.py`

---

## The Abstraction Stack

When your Python program calls `open("notes.txt", "r")`, at least four layers
of software are involved before any data reaches your variable:

```
Your program
    |  open("notes.txt", "r")
    v
Python's file API
    |  Translates to a system call: read(fd, buffer, size)
    v
Operating system (file system driver)
    |  Looks up "notes.txt" in the inode table
    |  Checks your read permission
    |  Finds the disk blocks that hold the data
    |  Copies bytes from disk into memory
    v
Storage hardware (SSD or hard disk)
    |  Moves the read head / activates the flash cells
    v
Raw bytes on disk
```

Each layer hides the details of the one below it. Your program does not
need to know what a disk block is. The OS does not need to know which
transistors store a particular bit.

This project makes one slice of that stack visible: the part where the OS
keeps track of what files exist, where their data lives, and how they are
organized into directories.

---

## What the OS Actually Does

A real file system driver is responsible for:

**Tracking file locations.** Every file has an inode: a small record that
stores the file's size, permissions, timestamps, and the disk block addresses
where its data is stored. When you open a file by name, the OS looks up its
inode to find the actual data.

**Managing access control.** The OS records an owner and permission flags
(read, write, execute) for every file. Before handing data to a program, it
checks whether that program's user is allowed to access it.

**Handling concurrent access.** Multiple programs can have the same file open
at once. The OS coordinates reads and writes so one program does not corrupt
another's view of the file.

**Organizing names into directories.** A directory is itself a special file:
a list of (name, inode number) pairs. When you call `os.listdir()`, the OS
reads that file to get the names.

In MiniFS, a Python dict plays the role of the inode table and the directory
structure combined. It is much simpler than a real file system, but the same
core ideas apply.

---

## Connection to Embedded Systems

The abstraction stack exists in more places than desktop computers. A car's
infotainment system runs a real-time OS with its own file system driver. The
microcontroller in a washing machine stores configuration in flash memory
using a lightweight file system. A smart thermostat might log temperature
readings using the FAT file system originally designed for floppy disks.

In every case, the application code calls the same kind of `open()`/`read()`/
`write()` interface and has no idea what hardware lies underneath.

---

## Your Tasks

Open `file_system.py` and implement these six methods in order:

### TODO #1: `create_file(path, content)`

Create a new file at the given path with the given content string.

- Raise `FileExistsError` if a file or directory already exists there
- Raise `FileNotFoundError` if the parent directory does not exist

### TODO #2: `read_file(path)`

Return the contents of the file at the given path.

- Raise `FileNotFoundError` if the path does not exist
- Raise `IsADirectoryError` if the path is a directory

### TODO #3: `write_file(path, content)`

Overwrite the contents of an existing file.

- Raise `FileNotFoundError` if the file does not exist

### TODO #4: `create_dir(path)`

Create a new empty directory at the given path.

- Raise `FileExistsError` if anything already exists there
- Raise `FileNotFoundError` if the parent directory does not exist

### TODO #5: `list_dir(path)`

Return a sorted list of names inside the directory at the given path.

- Raise `FileNotFoundError` if the path does not exist
- Raise `NotADirectoryError` if the path is a file

### TODO #6: `delete(path)`

Delete the file or empty directory at the given path.

- Raise `FileNotFoundError` if the path does not exist
- Raise `OSError("Directory not empty")` if the directory has contents

---

## Internal Representation

Everything in MiniFS is stored in `self._root`, a nested Python dict:

```python
# A file system where /home/alice/notes.txt contains "Hello":
{
    "home": {
        "alice": {
            "notes.txt": "Hello"   # string value = file
        }                          # dict value  = directory
    }
}
```

A file's contents are stored directly as a string. A directory is an empty
or populated dict. When you navigate to `/home/alice/notes.txt`, you follow
the chain `_root["home"]["alice"]["notes.txt"]`.

The provided `_navigate(path)` helper does most of this traversal for you.
Read its docstring before starting.

---

## Storage Tradeoffs

MiniFS stores everything in RAM. A real computer has several storage tiers,
each with different tradeoffs:

| Storage | Speed | Persistence | Cost |
|---------|-------|-------------|------|
| RAM | Fastest | Volatile (lost on shutdown) | Expensive per GB |
| SSD | Fast | Persistent | Moderate |
| Hard disk | Slower | Persistent | Cheapest per GB |
| Cloud / network | Slowest | Persistent, accessible anywhere | Depends on provider |

Operating systems exploit these differences. Frequently used files may be
cached in RAM so reads are instant. Rarely used data might be archived to
slower, cheaper storage. Databases make similar choices: hot data in memory,
cold data on disk.

When you close MiniFS, everything is lost. That is the price of keeping
the implementation simple.

---

## Testing Your Work

Run the test suite after completing each TODO:

```
python test_filesystem.py
```

You will see a PASS or FAIL line for each test. Implement the TODOs in order:
later tests sometimes depend on earlier functions working correctly.

---

## Using the Shell

Once all tests pass, try the interactive shell:

```
python main.py
```

Available commands:

```
ls [path]              list directory contents (default: /)
cat <path>             print file contents
mkdir <path>           create a directory
touch <path> [text]    create a file with optional content
write <path> <text>    overwrite a file's contents
rm <path>              delete a file or empty directory
help                   show all commands
exit                   quit
```

---

## Extension Challenges

### 🟢 Easy: `copy(src, dst)`

Add a `copy` method to MiniFS and a `cp` command to the shell. Copying a
file means creating a new file at `dst` with the same contents as `src`.
Think about what errors should be raised if `src` does not exist or `dst`
already exists.

### 🟡 Medium: `move(src, dst)`

Add a `move` method and `mv` command. Moving is like copying and then
deleting the original. The tricky part: `dst` might be a different directory,
so you need to handle both the source and destination paths correctly.

### 🔴 Hard: Simple Permission System

Add read and write permission flags to each file. Store them alongside the
content, perhaps as a tuple `(content, permissions)` where permissions is a
string like `"rw"` or `"r"`. Modify `read_file` and `write_file` to check
permissions before proceeding and raise `PermissionError` if access is denied.

---

## Reflection Questions

1. Why does Python's `open()` raise a `FileNotFoundError` with the same name
   as the error you raised in MiniFS? What does that suggest about how Python
   talks to the OS?

2. What would happen in a real file system if two programs tried to write to
   the same file at the same time? How does MiniFS handle (or not handle) this?

3. When you delete a file in MiniFS, the data is gone immediately. In some real
   file systems, deleted files go to a trash folder or can be recovered. What
   would you need to change in MiniFS to support an "undo delete" feature?

4. MiniFS uses a string to store file contents. A real file system stores
   bytes. What problems might come up if you tried to store an image or video
   in MiniFS?

5. The OS uses an inode table to map file names to data. MiniFS uses nested
   dicts. What is one advantage of the inode approach that MiniFS does not have?
