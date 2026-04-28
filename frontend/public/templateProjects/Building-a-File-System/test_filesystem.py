"""
Test Suite for MiniFS
=====================

Run this file to check your implementations:

    python test_filesystem.py

Each test prints a pass/fail result. Work through the TODOs in
file_system.py in order — the tests are grouped to match.
"""

import os
import sys
import unittest

from file_system import MiniFS


# =============================================================================
# TODO #1: create_file
# =============================================================================

class TestCreateFile(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_creates_a_file(self):
        self.fs.create_dir("/docs")
        self.fs.create_file("/docs/readme.txt", "hello")
        self.assertTrue(self.fs.is_file("/docs/readme.txt"))

    def test_default_content_is_empty_string(self):
        self.fs.create_file("/empty.txt")
        self.assertTrue(self.fs.is_file("/empty.txt"))

    def test_file_at_root_level(self):
        self.fs.create_file("/hello.txt", "root file")
        self.assertTrue(self.fs.is_file("/hello.txt"))

    def test_raises_file_exists_error_if_file_exists(self):
        self.fs.create_file("/note.txt", "first")
        with self.assertRaises(FileExistsError):
            self.fs.create_file("/note.txt", "second")

    def test_raises_file_not_found_if_parent_missing(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.create_file("/ghost/notes.txt", "text")

    def test_raises_file_exists_error_if_directory_at_path(self):
        self.fs.create_dir("/mydir")
        with self.assertRaises(FileExistsError):
            self.fs.create_file("/mydir", "content")


# =============================================================================
# TODO #2: read_file
# =============================================================================

class TestReadFile(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_returns_correct_content(self):
        self.fs.create_file("/greet.txt", "Hello, world!")
        self.assertEqual(self.fs.read_file("/greet.txt"), "Hello, world!")

    def test_empty_file_returns_empty_string(self):
        self.fs.create_file("/empty.txt")
        self.assertEqual(self.fs.read_file("/empty.txt"), "")

    def test_raises_file_not_found_for_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.read_file("/missing.txt")

    def test_raises_is_a_directory_error_for_directory(self):
        self.fs.create_dir("/mydir")
        with self.assertRaises(IsADirectoryError):
            self.fs.read_file("/mydir")

    def test_reads_deeply_nested_file(self):
        self.fs.create_dir("/a")
        self.fs.create_dir("/a/b")
        self.fs.create_file("/a/b/deep.txt", "found it")
        self.assertEqual(self.fs.read_file("/a/b/deep.txt"), "found it")


# =============================================================================
# TODO #3: write_file
# =============================================================================

class TestWriteFile(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_overwrites_file_content(self):
        self.fs.create_file("/log.txt", "line 1")
        self.fs.write_file("/log.txt", "line 2")
        self.assertEqual(self.fs.read_file("/log.txt"), "line 2")

    def test_writes_to_previously_empty_file(self):
        self.fs.create_file("/blank.txt")
        self.fs.write_file("/blank.txt", "now has content")
        self.assertEqual(self.fs.read_file("/blank.txt"), "now has content")

    def test_raises_file_not_found_if_file_missing(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.write_file("/nope.txt", "content")

    def test_multiple_writes_keep_latest_value(self):
        self.fs.create_file("/counter.txt", "0")
        for i in range(1, 5):
            self.fs.write_file("/counter.txt", str(i))
        self.assertEqual(self.fs.read_file("/counter.txt"), "4")


# =============================================================================
# TODO #4: create_dir
# =============================================================================

class TestCreateDir(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_creates_a_directory(self):
        self.fs.create_dir("/home")
        self.assertTrue(self.fs.is_dir("/home"))

    def test_creates_nested_directory(self):
        self.fs.create_dir("/home")
        self.fs.create_dir("/home/alice")
        self.assertTrue(self.fs.is_dir("/home/alice"))

    def test_raises_file_exists_error_if_directory_exists(self):
        self.fs.create_dir("/home")
        with self.assertRaises(FileExistsError):
            self.fs.create_dir("/home")

    def test_raises_file_not_found_if_parent_missing(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.create_dir("/ghost/subdir")

    def test_raises_file_exists_error_if_file_at_path(self):
        self.fs.create_file("/exists.txt", "i am a file")
        with self.assertRaises(FileExistsError):
            self.fs.create_dir("/exists.txt")


# =============================================================================
# TODO #5: list_dir
# =============================================================================

class TestListDir(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_returns_sorted_list_of_names(self):
        self.fs.create_dir("/home")
        self.fs.create_file("/home/notes.txt")
        self.fs.create_dir("/home/photos")
        self.assertEqual(self.fs.list_dir("/home"), ["notes.txt", "photos"])

    def test_empty_directory_returns_empty_list(self):
        self.fs.create_dir("/empty")
        self.assertEqual(self.fs.list_dir("/empty"), [])

    def test_lists_root_directory(self):
        self.fs.create_dir("/a")
        self.fs.create_dir("/b")
        self.fs.create_file("/c.txt")
        self.assertEqual(self.fs.list_dir("/"), ["a", "b", "c.txt"])

    def test_raises_file_not_found_for_missing_path(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.list_dir("/missing")

    def test_raises_not_a_directory_error_when_path_is_file(self):
        self.fs.create_file("/note.txt", "text")
        with self.assertRaises(NotADirectoryError):
            self.fs.list_dir("/note.txt")

    def test_result_is_sorted_alphabetically(self):
        self.fs.create_dir("/z")
        self.fs.create_dir("/a")
        self.fs.create_dir("/m")
        self.assertEqual(self.fs.list_dir("/"), ["a", "m", "z"])


# =============================================================================
# TODO #6: delete
# =============================================================================

class TestDelete(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_removes_a_file(self):
        self.fs.create_file("/temp.txt", "data")
        self.fs.delete("/temp.txt")
        self.assertFalse(self.fs.exists("/temp.txt"))

    def test_removes_an_empty_directory(self):
        self.fs.create_dir("/tmp")
        self.fs.delete("/tmp")
        self.assertFalse(self.fs.exists("/tmp"))

    def test_raises_file_not_found_for_missing_path(self):
        with self.assertRaises(FileNotFoundError):
            self.fs.delete("/nowhere.txt")

    def test_raises_oserror_for_nonempty_directory(self):
        self.fs.create_dir("/keep")
        self.fs.create_file("/keep/important.txt", "do not delete")
        with self.assertRaises(OSError) as ctx:
            self.fs.delete("/keep")
        self.assertIn("not empty", str(ctx.exception).lower())

    def test_deletes_nested_file_leaves_parent_intact(self):
        self.fs.create_dir("/home")
        self.fs.create_file("/home/old.txt", "stale")
        self.fs.delete("/home/old.txt")
        self.assertFalse(self.fs.exists("/home/old.txt"))
        self.assertTrue(self.fs.exists("/home"))

    def test_path_can_be_reused_after_deletion(self):
        self.fs.create_file("/reuse.txt", "v1")
        self.fs.delete("/reuse.txt")
        self.fs.create_file("/reuse.txt", "v2")
        self.assertEqual(self.fs.read_file("/reuse.txt"), "v2")


# =============================================================================
# Integration
# =============================================================================

class TestIntegration(unittest.TestCase):
    def setUp(self):
        self.fs = MiniFS()

    def test_get_size_counts_files(self):
        self.assertEqual(self.fs.get_size(), 0)
        self.fs.create_dir("/home")
        self.assertEqual(self.fs.get_size(), 0)
        self.fs.create_file("/home/a.txt")
        self.fs.create_file("/home/b.txt")
        self.assertEqual(self.fs.get_size(), 2)

    def test_exists_works_for_files_and_directories(self):
        self.assertFalse(self.fs.exists("/x"))
        self.fs.create_dir("/x")
        self.assertTrue(self.fs.exists("/x"))
        self.fs.create_file("/x/y.txt")
        self.assertTrue(self.fs.exists("/x/y.txt"))

    def test_full_workflow(self):
        self.fs.create_dir("/projects")
        self.fs.create_dir("/projects/minifs")
        self.fs.create_file("/projects/minifs/README.md", "# MiniFS")
        self.fs.create_file("/projects/minifs/main.py", "print('hello')")

        self.assertEqual(
            self.fs.list_dir("/projects/minifs"),
            ["README.md", "main.py"],
        )

        self.fs.write_file("/projects/minifs/README.md", "# Updated")
        self.assertEqual(self.fs.read_file("/projects/minifs/README.md"), "# Updated")

        self.fs.delete("/projects/minifs/README.md")
        self.fs.delete("/projects/minifs/main.py")
        self.fs.delete("/projects/minifs")
        self.assertEqual(self.fs.list_dir("/projects"), [])

    def test_root_path_is_a_directory(self):
        self.assertTrue(self.fs.is_dir("/"))


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    result = runner.run(
        unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    )
    n_failed = len(result.failures) + len(result.errors)
    n_skipped = len(result.skipped)
    n_passed = result.testsRun - n_failed - n_skipped

    if os.environ.get("TCOMPUTE_SCORE"):
        print(f"{n_passed}/{result.testsRun}")
    else:
        print()
        print("=" * 40)
        print(f"Results: {n_passed}/{result.testsRun} tests passed")
        if result.wasSuccessful():
            print("All tests pass. Try running the shell: python main.py")
        else:
            print(f"{n_failed} test(s) failed.")
            print("Tip: implement the TODOs in file_system.py in order (1 through 6).")
        print("=" * 40)

    sys.exit(0 if result.wasSuccessful() else 1)
