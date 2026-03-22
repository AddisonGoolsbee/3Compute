"""
Test Suite for MiniFS
=====================

Run this file to check your implementations:

    python test_filesystem.py

Each test prints a pass/fail result. Work through the TODOs in
file_system.py in order — the tests are grouped to match.

A final summary shows how many tests passed.
"""

import traceback
from file_system import MiniFS


# =============================================================================
# TEST RUNNER HELPERS
# =============================================================================

_results = []


def test(name: str, fn):
    """Run fn(); record and print a pass or fail result."""
    try:
        fn()
        _results.append((name, True, None))
        print(f"  PASS  {name}")
    except AssertionError as e:
        _results.append((name, False, str(e)))
        print(f"  FAIL  {name}")
        if str(e):
            print(f"        {e}")
    except Exception as e:
        _results.append((name, False, f"{type(e).__name__}: {e}"))
        print(f"  FAIL  {name}")
        print(f"        {type(e).__name__}: {e}")


def section(title: str) -> None:
    print(f"\n--- {title} ---")


def fresh() -> MiniFS:
    """Return a new, empty MiniFS instance."""
    return MiniFS()


# =============================================================================
# TESTS: create_file
# =============================================================================

section("TODO #1: create_file")

def _test_create_file_basic():
    fs = fresh()
    fs.create_dir("/docs")
    fs.create_file("/docs/readme.txt", "hello")
    assert fs.is_file("/docs/readme.txt"), "File should exist after create_file"

test("create_file: creates a file", _test_create_file_basic)


def _test_create_file_default_content():
    fs = fresh()
    fs.create_file("/empty.txt")
    assert fs.is_file("/empty.txt"), "File should exist with default empty content"

test("create_file: default content is empty string", _test_create_file_default_content)


def _test_create_file_at_root():
    fs = fresh()
    fs.create_file("/hello.txt", "root file")
    assert fs.is_file("/hello.txt"), "File at root level should exist"

test("create_file: file at root level", _test_create_file_at_root)


def _test_create_file_already_exists():
    fs = fresh()
    fs.create_file("/note.txt", "first")
    try:
        fs.create_file("/note.txt", "second")
        assert False, "Should have raised FileExistsError"
    except FileExistsError:
        pass

test("create_file: raises FileExistsError if file already exists", _test_create_file_already_exists)


def _test_create_file_parent_missing():
    fs = fresh()
    try:
        fs.create_file("/ghost/notes.txt", "text")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("create_file: raises FileNotFoundError if parent directory missing", _test_create_file_parent_missing)


def _test_create_file_over_directory():
    fs = fresh()
    fs.create_dir("/mydir")
    try:
        fs.create_file("/mydir", "content")
        assert False, "Should have raised FileExistsError for existing directory"
    except FileExistsError:
        pass

test("create_file: raises FileExistsError if directory exists at path", _test_create_file_over_directory)


# =============================================================================
# TESTS: read_file
# =============================================================================

section("TODO #2: read_file")

def _test_read_file_basic():
    fs = fresh()
    fs.create_file("/greet.txt", "Hello, world!")
    assert fs.read_file("/greet.txt") == "Hello, world!"

test("read_file: returns correct content", _test_read_file_basic)


def _test_read_file_empty():
    fs = fresh()
    fs.create_file("/empty.txt")
    assert fs.read_file("/empty.txt") == ""

test("read_file: returns empty string for empty file", _test_read_file_empty)


def _test_read_file_not_found():
    fs = fresh()
    try:
        fs.read_file("/missing.txt")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("read_file: raises FileNotFoundError for missing file", _test_read_file_not_found)


def _test_read_file_is_directory():
    fs = fresh()
    fs.create_dir("/mydir")
    try:
        fs.read_file("/mydir")
        assert False, "Should have raised IsADirectoryError"
    except IsADirectoryError:
        pass

test("read_file: raises IsADirectoryError when path is a directory", _test_read_file_is_directory)


def _test_read_file_nested():
    fs = fresh()
    fs.create_dir("/a")
    fs.create_dir("/a/b")
    fs.create_file("/a/b/deep.txt", "found it")
    assert fs.read_file("/a/b/deep.txt") == "found it"

test("read_file: reads deeply nested file", _test_read_file_nested)


# =============================================================================
# TESTS: write_file
# =============================================================================

section("TODO #3: write_file")

def _test_write_file_basic():
    fs = fresh()
    fs.create_file("/log.txt", "line 1")
    fs.write_file("/log.txt", "line 2")
    assert fs.read_file("/log.txt") == "line 2"

test("write_file: overwrites file content", _test_write_file_basic)


def _test_write_file_to_empty():
    fs = fresh()
    fs.create_file("/blank.txt")
    fs.write_file("/blank.txt", "now has content")
    assert fs.read_file("/blank.txt") == "now has content"

test("write_file: writes content to previously empty file", _test_write_file_to_empty)


def _test_write_file_not_found():
    fs = fresh()
    try:
        fs.write_file("/nope.txt", "content")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("write_file: raises FileNotFoundError if file does not exist", _test_write_file_not_found)


def _test_write_file_multiple_times():
    fs = fresh()
    fs.create_file("/counter.txt", "0")
    for i in range(1, 5):
        fs.write_file("/counter.txt", str(i))
    assert fs.read_file("/counter.txt") == "4"

test("write_file: multiple writes keep latest value", _test_write_file_multiple_times)


# =============================================================================
# TESTS: create_dir
# =============================================================================

section("TODO #4: create_dir")

def _test_create_dir_basic():
    fs = fresh()
    fs.create_dir("/home")
    assert fs.is_dir("/home"), "Directory should exist after create_dir"

test("create_dir: creates a directory", _test_create_dir_basic)


def _test_create_dir_nested():
    fs = fresh()
    fs.create_dir("/home")
    fs.create_dir("/home/alice")
    assert fs.is_dir("/home/alice")

test("create_dir: creates nested directory", _test_create_dir_nested)


def _test_create_dir_already_exists():
    fs = fresh()
    fs.create_dir("/home")
    try:
        fs.create_dir("/home")
        assert False, "Should have raised FileExistsError"
    except FileExistsError:
        pass

test("create_dir: raises FileExistsError if directory already exists", _test_create_dir_already_exists)


def _test_create_dir_parent_missing():
    fs = fresh()
    try:
        fs.create_dir("/ghost/subdir")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("create_dir: raises FileNotFoundError if parent directory missing", _test_create_dir_parent_missing)


def _test_create_dir_file_at_path():
    fs = fresh()
    fs.create_file("/exists.txt", "i am a file")
    try:
        fs.create_dir("/exists.txt")
        assert False, "Should have raised FileExistsError"
    except FileExistsError:
        pass

test("create_dir: raises FileExistsError if file already at path", _test_create_dir_file_at_path)


# =============================================================================
# TESTS: list_dir
# =============================================================================

section("TODO #5: list_dir")

def _test_list_dir_basic():
    fs = fresh()
    fs.create_dir("/home")
    fs.create_file("/home/notes.txt")
    fs.create_dir("/home/photos")
    result = fs.list_dir("/home")
    assert result == ["notes.txt", "photos"], f"Got {result}"

test("list_dir: returns sorted list of names", _test_list_dir_basic)


def _test_list_dir_empty():
    fs = fresh()
    fs.create_dir("/empty")
    assert fs.list_dir("/empty") == []

test("list_dir: returns empty list for empty directory", _test_list_dir_empty)


def _test_list_dir_root():
    fs = fresh()
    fs.create_dir("/a")
    fs.create_dir("/b")
    fs.create_file("/c.txt")
    result = fs.list_dir("/")
    assert result == ["a", "b", "c.txt"], f"Got {result}"

test("list_dir: lists root directory", _test_list_dir_root)


def _test_list_dir_not_found():
    fs = fresh()
    try:
        fs.list_dir("/missing")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("list_dir: raises FileNotFoundError for missing path", _test_list_dir_not_found)


def _test_list_dir_on_file():
    fs = fresh()
    fs.create_file("/note.txt", "text")
    try:
        fs.list_dir("/note.txt")
        assert False, "Should have raised NotADirectoryError"
    except NotADirectoryError:
        pass

test("list_dir: raises NotADirectoryError when path is a file", _test_list_dir_on_file)


def _test_list_dir_sorted():
    fs = fresh()
    fs.create_dir("/z")
    fs.create_dir("/a")
    fs.create_dir("/m")
    result = fs.list_dir("/")
    assert result == ["a", "m", "z"], f"Got {result}"

test("list_dir: result is sorted alphabetically", _test_list_dir_sorted)


# =============================================================================
# TESTS: delete
# =============================================================================

section("TODO #6: delete")

def _test_delete_file():
    fs = fresh()
    fs.create_file("/temp.txt", "data")
    fs.delete("/temp.txt")
    assert not fs.exists("/temp.txt"), "File should be gone after delete"

test("delete: removes a file", _test_delete_file)


def _test_delete_empty_dir():
    fs = fresh()
    fs.create_dir("/tmp")
    fs.delete("/tmp")
    assert not fs.exists("/tmp"), "Empty directory should be gone after delete"

test("delete: removes an empty directory", _test_delete_empty_dir)


def _test_delete_not_found():
    fs = fresh()
    try:
        fs.delete("/nowhere.txt")
        assert False, "Should have raised FileNotFoundError"
    except FileNotFoundError:
        pass

test("delete: raises FileNotFoundError for missing path", _test_delete_not_found)


def _test_delete_nonempty_dir():
    fs = fresh()
    fs.create_dir("/keep")
    fs.create_file("/keep/important.txt", "do not delete")
    try:
        fs.delete("/keep")
        assert False, "Should have raised OSError for non-empty directory"
    except OSError as e:
        assert "not empty" in str(e).lower(), f"Expected 'not empty' in error, got: {e}"

test("delete: raises OSError for non-empty directory", _test_delete_nonempty_dir)


def _test_delete_nested_file():
    fs = fresh()
    fs.create_dir("/home")
    fs.create_file("/home/old.txt", "stale")
    fs.delete("/home/old.txt")
    assert not fs.exists("/home/old.txt")
    assert fs.exists("/home"), "Parent directory should still exist"

test("delete: deletes nested file, leaves parent intact", _test_delete_nested_file)


def _test_delete_then_recreate():
    fs = fresh()
    fs.create_file("/reuse.txt", "v1")
    fs.delete("/reuse.txt")
    fs.create_file("/reuse.txt", "v2")
    assert fs.read_file("/reuse.txt") == "v2"

test("delete: path can be reused after deletion", _test_delete_then_recreate)


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

section("Integration")

def _test_get_size():
    fs = fresh()
    assert fs.get_size() == 0
    fs.create_dir("/home")
    assert fs.get_size() == 0, "Directories don't count toward size"
    fs.create_file("/home/a.txt")
    fs.create_file("/home/b.txt")
    assert fs.get_size() == 2

test("get_size: counts files correctly", _test_get_size)


def _test_exists_helper():
    fs = fresh()
    assert not fs.exists("/x")
    fs.create_dir("/x")
    assert fs.exists("/x")
    fs.create_file("/x/y.txt")
    assert fs.exists("/x/y.txt")

test("exists: works for files and directories", _test_exists_helper)


def _test_full_workflow():
    fs = fresh()
    # Build a directory tree
    fs.create_dir("/projects")
    fs.create_dir("/projects/minifs")
    fs.create_file("/projects/minifs/README.md", "# MiniFS")
    fs.create_file("/projects/minifs/main.py", "print('hello')")

    # Verify structure
    entries = fs.list_dir("/projects/minifs")
    assert entries == ["README.md", "main.py"], f"Got {entries}"

    # Edit a file
    fs.write_file("/projects/minifs/README.md", "# Updated")
    assert fs.read_file("/projects/minifs/README.md") == "# Updated"

    # Delete one file, then the empty directory
    fs.delete("/projects/minifs/README.md")
    fs.delete("/projects/minifs/main.py")
    fs.delete("/projects/minifs")
    assert fs.list_dir("/projects") == []

test("full workflow: create, read, write, delete", _test_full_workflow)


def _test_is_dir_root():
    fs = fresh()
    assert fs.is_dir("/"), "Root should always be a directory"

test("is_dir: root path is a directory", _test_is_dir_root)


# =============================================================================
# SUMMARY
# =============================================================================

total = len(_results)
passed = sum(1 for _, ok, _ in _results if ok)
failed = total - passed

print(f"\n{'=' * 40}")
print(f"Results: {passed}/{total} tests passed")

if failed > 0:
    print(f"\nFailing tests:")
    for name, ok, msg in _results:
        if not ok:
            print(f"  FAIL  {name}")
            if msg:
                print(f"        {msg}")
    print()
    print("Tip: implement the TODOs in file_system.py in order (1 through 6).")
else:
    print("All tests pass. Try running the shell: python main.py")

print("=" * 40)
