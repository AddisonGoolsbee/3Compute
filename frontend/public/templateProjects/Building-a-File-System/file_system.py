"""
Building a File System
======================

Real operating systems hide enormous complexity behind simple commands.
When you call open("notes.txt", "r") in Python, the OS locates the file
on disk, checks your permissions, loads blocks of data into memory, and
hands you a stream of bytes. You never see any of that.

In this project you will implement MiniFS: a simplified in-memory file
system stored entirely in a Python dictionary. Building it yourself makes
visible exactly what the OS abstracts away.

INTERNAL REPRESENTATION
-----------------------
Everything lives in self._root, a nested dict.
  - A string value  -> file  (the string is the file's contents)
  - A dict value    -> directory

Example: if /home/alice/notes.txt contains "Hello":

    self._root = {
        "home": {
            "alice": {
                "notes.txt": "Hello"
            }
        }
    }

YOUR TASKS (in order):
1. create_file(path, content)
2. read_file(path)
3. write_file(path, content)
4. create_dir(path)
5. list_dir(path)
6. delete(path)

Run the tests to check your work: python test_filesystem.py
"""


# =============================================================================
# MiniFS CLASS
# =============================================================================

class MiniFS:
    """A simplified in-memory file system backed by a nested dictionary."""

    def __init__(self):
        # The root of the file system. All paths start here.
        self._root = {}

    # -------------------------------------------------------------------------
    # PROVIDED HELPERS
    # -------------------------------------------------------------------------

    def _split_path(self, path: str) -> list:
        """
        Split an absolute path into a list of components, ignoring empty parts.

        Examples:
            "/home/alice/notes.txt" -> ["home", "alice", "notes.txt"]
            "/"                     -> []
            "/home/"                -> ["home"]
        """
        return [part for part in path.split("/") if part]

    def _navigate(self, path: str):
        """
        Locate the parent directory and the final name for the given path.

        Returns a tuple: (parent_dict, name)
            parent_dict  - the dict that should contain the target entry
            name         - the string key for the target within parent_dict

        Raises FileNotFoundError if any intermediate directory does not exist
        or is actually a file.

        Examples:
            _navigate("/home/alice/notes.txt")
                -> (self._root["home"]["alice"], "notes.txt")

            _navigate("/home")
                -> (self._root, "home")
        """
        parts = self._split_path(path)

        if not parts:
            # Caller asked about the root itself; return a sentinel.
            # Individual methods should handle the empty-parts case before
            # calling _navigate when it matters.
            raise FileNotFoundError("Cannot navigate to root using _navigate")

        # Walk down all components except the last one.
        current = self._root
        for part in parts[:-1]:
            if part not in current:
                raise FileNotFoundError(
                    f"No such file or directory: '{path}'"
                )
            if not isinstance(current[part], dict):
                raise FileNotFoundError(
                    f"Not a directory: '{part}' in path '{path}'"
                )
            current = current[part]

        return current, parts[-1]

    def get_size(self) -> int:
        """Return the total number of files (not directories) in the file system."""
        def _count(node):
            if isinstance(node, str):
                return 1
            return sum(_count(child) for child in node.values())

        return _count(self._root)

    def exists(self, path: str) -> bool:
        """Return True if the path exists (file or directory), False otherwise."""
        try:
            parent, name = self._navigate(path)
            return name in parent
        except FileNotFoundError:
            return False

    def is_file(self, path: str) -> bool:
        """Return True if path exists and is a file."""
        try:
            parent, name = self._navigate(path)
            return name in parent and isinstance(parent[name], str)
        except FileNotFoundError:
            return False

    def is_dir(self, path: str) -> bool:
        """Return True if path exists and is a directory."""
        parts = self._split_path(path)
        if not parts:
            return True  # root is always a directory
        try:
            parent, name = self._navigate(path)
            return name in parent and isinstance(parent[name], dict)
        except FileNotFoundError:
            return False

    # -------------------------------------------------------------------------
    # TODO #1: CREATE A FILE
    # -------------------------------------------------------------------------

    def create_file(self, path: str, content: str = "") -> None:
        """
        Create a new file at the given path with the given content.

        Parameters:
            path    - absolute path, e.g. "/home/alice/notes.txt"
            content - initial contents of the file (default: empty string)

        Raises:
            FileExistsError   if a file or directory already exists at path
            FileNotFoundError if the parent directory does not exist

        Example:
            fs.create_dir("/home")
            fs.create_file("/home/notes.txt", "Hello")
            # Now /home/notes.txt exists with content "Hello"

        HINTS:
        - Use self._navigate(path) to get (parent, name).
        - _navigate raises FileNotFoundError automatically if an intermediate
          directory is missing, so you only need to check whether the parent
          itself was reached but the name already exists there.
        - A file's value in the dict is a string; assign content to parent[name].
        """
        # TODO: implement this method
        pass

    # -------------------------------------------------------------------------
    # TODO #2: READ A FILE
    # -------------------------------------------------------------------------

    def read_file(self, path: str) -> str:
        """
        Return the contents of the file at path.

        Raises:
            FileNotFoundError if path does not exist
            IsADirectoryError if path is a directory, not a file

        Example:
            fs.create_file("/readme.txt", "Welcome")
            print(fs.read_file("/readme.txt"))  # "Welcome"

        HINTS:
        - Use self._navigate(path) to get (parent, name).
        - Check whether name is in parent before accessing it.
        - Use isinstance(parent[name], dict) to distinguish directories from files.
        """
        # TODO: implement this method
        pass

    # -------------------------------------------------------------------------
    # TODO #3: WRITE (OVERWRITE) A FILE
    # -------------------------------------------------------------------------

    def write_file(self, path: str, content: str) -> None:
        """
        Overwrite the contents of an existing file.

        Raises:
            FileNotFoundError if the file does not exist

        Example:
            fs.create_file("/log.txt", "first entry")
            fs.write_file("/log.txt", "second entry")
            print(fs.read_file("/log.txt"))  # "second entry"

        HINTS:
        - Use self._navigate(path) to get (parent, name).
        - The file must already exist; this method does NOT create new files.
        - Assign the new content string to parent[name].
        """
        # TODO: implement this method
        pass

    # -------------------------------------------------------------------------
    # TODO #4: CREATE A DIRECTORY
    # -------------------------------------------------------------------------

    def create_dir(self, path: str) -> None:
        """
        Create a new, empty directory at the given path.

        Raises:
            FileExistsError   if a file or directory already exists at path
            FileNotFoundError if the parent directory does not exist

        Example:
            fs.create_dir("/home")
            fs.create_dir("/home/alice")
            # Now /home/alice exists as an empty directory

        HINTS:
        - Use self._navigate(path) to get (parent, name).
        - A directory's value in the dict is an empty dict {}.
        - Assign {} to parent[name].
        """
        # TODO: implement this method
        pass

    # -------------------------------------------------------------------------
    # TODO #5: LIST A DIRECTORY
    # -------------------------------------------------------------------------

    def list_dir(self, path: str) -> list:
        """
        Return a sorted list of names (files and subdirectories) inside path.

        Raises:
            FileNotFoundError  if path does not exist
            NotADirectoryError if path is a file, not a directory

        Example:
            fs.create_dir("/home")
            fs.create_file("/home/notes.txt")
            fs.create_dir("/home/photos")
            print(fs.list_dir("/home"))  # ["notes.txt", "photos"]

        HINTS:
        - The root path "/" is a special case: return sorted(self._root.keys()).
        - For other paths, use self._navigate(path) to get (parent, name),
          then look up parent[name] to get the directory dict.
        - Use sorted() on .keys() to return names in alphabetical order.
        """
        # TODO: implement this method
        pass

    # -------------------------------------------------------------------------
    # TODO #6: DELETE A FILE OR DIRECTORY
    # -------------------------------------------------------------------------

    def delete(self, path: str) -> None:
        """
        Delete the file or directory at path.

        Rules:
        - Files can always be deleted.
        - Empty directories can be deleted.
        - Non-empty directories cannot be deleted (raises OSError).

        Raises:
            FileNotFoundError       if path does not exist
            OSError("Directory not empty") if trying to delete a non-empty directory

        Example:
            fs.create_file("/temp.txt")
            fs.delete("/temp.txt")
            print(fs.exists("/temp.txt"))  # False

        HINTS:
        - Use self._navigate(path) to get (parent, name).
        - Check whether the entry is a dict (directory) or string (file).
        - For a directory, check len(parent[name]) == 0 before deleting.
        - Use del parent[name] to remove the entry.
        """
        # TODO: implement this method
        pass
