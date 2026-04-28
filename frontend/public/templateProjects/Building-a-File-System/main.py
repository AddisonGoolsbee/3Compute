"""
MiniFS Shell
============

A simple command-line shell that uses your MiniFS implementation.
Complete the TODOs in file_system.py first, then run this file.

Usage:
    python main.py

Available commands:
    ls [path]              - list directory contents (default: /)
    cat <path>             - print file contents
    mkdir <path>           - create a directory
    touch <path> [content] - create a file (optional initial content)
    write <path> <content> - overwrite a file's contents
    rm <path>              - delete a file or empty directory
    help                   - show this help message
    exit                   - quit the shell
"""

import sys
from file_system import MiniFS


# =============================================================================
# SHELL COMMAND HANDLERS (PROVIDED)
# =============================================================================

def cmd_ls(fs: MiniFS, args: list) -> None:
    path = args[0] if args else "/"
    try:
        entries = fs.list_dir(path)
        if entries:
            for name in entries:
                full = path.rstrip("/") + "/" + name
                tag = "/" if fs.is_dir(full) else ""
                print(f"  {name}{tag}")
        else:
            print("  (empty directory)")
    except FileNotFoundError as e:
        print(f"ls: {e}")
    except NotADirectoryError:
        print(f"ls: not a directory: {path}")


def cmd_cat(fs: MiniFS, args: list) -> None:
    if not args:
        print("cat: missing operand")
        return
    path = args[0]
    try:
        print(fs.read_file(path))
    except FileNotFoundError as e:
        print(f"cat: {e}")
    except IsADirectoryError:
        print(f"cat: {path}: Is a directory")


def cmd_mkdir(fs: MiniFS, args: list) -> None:
    if not args:
        print("mkdir: missing operand")
        return
    path = args[0]
    try:
        fs.create_dir(path)
        print(f"Directory created: {path}")
    except FileExistsError as e:
        print(f"mkdir: {e}")
    except FileNotFoundError as e:
        print(f"mkdir: {e}")


def cmd_touch(fs: MiniFS, args: list) -> None:
    if not args:
        print("touch: missing operand")
        return
    path = args[0]
    content = " ".join(args[1:]) if len(args) > 1 else ""
    try:
        fs.create_file(path, content)
        print(f"File created: {path}")
    except FileExistsError as e:
        print(f"touch: {e}")
    except FileNotFoundError as e:
        print(f"touch: {e}")


def cmd_write(fs: MiniFS, args: list) -> None:
    if len(args) < 2:
        print("write: usage: write <path> <content>")
        return
    path = args[0]
    content = " ".join(args[1:])
    try:
        fs.write_file(path, content)
        print(f"Written to {path}")
    except FileNotFoundError as e:
        print(f"write: {e}")


def cmd_rm(fs: MiniFS, args: list) -> None:
    if not args:
        print("rm: missing operand")
        return
    path = args[0]
    try:
        fs.delete(path)
        print(f"Deleted: {path}")
    except FileNotFoundError as e:
        print(f"rm: {e}")
    except OSError as e:
        print(f"rm: {e}")


def cmd_help() -> None:
    print(
        "\nCommands:\n"
        "  ls [path]              list directory contents (default: /)\n"
        "  cat <path>             print file contents\n"
        "  mkdir <path>           create a directory\n"
        "  touch <path> [text]    create a file with optional content\n"
        "  write <path> <text>    overwrite a file's contents\n"
        "  rm <path>              delete a file or empty directory\n"
        "  help                   show this message\n"
        "  exit                   quit the shell\n"
    )


# =============================================================================
# STARTUP CHECK (PROVIDED)
# =============================================================================

def _check_implementation(fs: MiniFS) -> bool:
    """
    Run a quick smoke test to detect unimplemented TODOs.
    Returns True if the implementation appears to be working.
    """
    try:
        fs.create_dir("/smoke")
        fs.create_file("/smoke/test.txt", "ok")
        result = fs.read_file("/smoke/test.txt")
        fs.delete("/smoke/test.txt")
        fs.delete("/smoke")
        return result == "ok"
    except Exception:
        return False


# =============================================================================
# REPL LOOP (PROVIDED)
# =============================================================================

def run_shell() -> None:
    fs = MiniFS()

    print("=" * 52)
    print("  MiniFS Shell  |  Building a File System Project")
    print("=" * 52)

    if not _check_implementation(fs):
        print(
            "\nIt looks like the TODOs in file_system.py are not yet complete.\n"
            "Implement the six methods in order, then come back here.\n"
            "\nFunctions to implement:\n"
            "  1. create_file(path, content)\n"
            "  2. read_file(path)\n"
            "  3. write_file(path, content)\n"
            "  4. create_dir(path)\n"
            "  5. list_dir(path)\n"
            "  6. delete(path)\n"
            "\nRun tests at any time: python test_filesystem.py\n"
        )
        return

    print("\nFile system ready. Type 'help' for commands.\n")

    # Seed the file system with a starting structure so the shell feels alive.
    fs.create_dir("/home")
    fs.create_dir("/home/student")
    fs.create_file("/home/student/welcome.txt",
                   "Welcome to MiniFS! Try: ls /home/student")
    fs.create_dir("/tmp")

    while True:
        try:
            raw = input("minifs> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not raw:
            continue

        tokens = raw.split()
        command = tokens[0].lower()
        args = tokens[1:]

        if command == "exit":
            break
        elif command == "ls":
            cmd_ls(fs, args)
        elif command == "cat":
            cmd_cat(fs, args)
        elif command == "mkdir":
            cmd_mkdir(fs, args)
        elif command == "touch":
            cmd_touch(fs, args)
        elif command == "write":
            cmd_write(fs, args)
        elif command == "rm":
            cmd_rm(fs, args)
        elif command == "help":
            cmd_help()
        else:
            print(f"Unknown command: '{command}'. Type 'help' for usage.")

    print("Goodbye. (All files lost — this is an in-memory file system!)")


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    run_shell()
