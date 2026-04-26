"""
MiniFS Solution
===============

Reference implementation for the Computing Layers project.
Instructor use only — do not distribute to students.
"""


class MiniFS:
    """A simplified in-memory file system backed by a nested dictionary."""

    def __init__(self):
        self._root = {}

    # -------------------------------------------------------------------------
    # PROVIDED HELPERS (same as student file)
    # -------------------------------------------------------------------------

    def _split_path(self, path: str) -> list:
        return [part for part in path.split("/") if part]

    def _navigate(self, path: str):
        parts = self._split_path(path)

        if not parts:
            raise FileNotFoundError("Cannot navigate to root using _navigate")

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
        def _count(node):
            if isinstance(node, str):
                return 1
            return sum(_count(child) for child in node.values())
        return _count(self._root)

    def exists(self, path: str) -> bool:
        try:
            parent, name = self._navigate(path)
            return name in parent
        except FileNotFoundError:
            return False

    def is_file(self, path: str) -> bool:
        try:
            parent, name = self._navigate(path)
            return name in parent and isinstance(parent[name], str)
        except FileNotFoundError:
            return False

    def is_dir(self, path: str) -> bool:
        parts = self._split_path(path)
        if not parts:
            return True
        try:
            parent, name = self._navigate(path)
            return name in parent and isinstance(parent[name], dict)
        except FileNotFoundError:
            return False

    # -------------------------------------------------------------------------
    # SOLUTION: create_file
    # -------------------------------------------------------------------------

    def create_file(self, path: str, content: str = "") -> None:
        parent, name = self._navigate(path)  # raises FileNotFoundError if parent missing
        if name in parent:
            raise FileExistsError(f"File exists: '{path}'")
        parent[name] = content

    # -------------------------------------------------------------------------
    # SOLUTION: read_file
    # -------------------------------------------------------------------------

    def read_file(self, path: str) -> str:
        parent, name = self._navigate(path)
        if name not in parent:
            raise FileNotFoundError(f"No such file or directory: '{path}'")
        if isinstance(parent[name], dict):
            raise IsADirectoryError(f"Is a directory: '{path}'")
        return parent[name]

    # -------------------------------------------------------------------------
    # SOLUTION: write_file
    # -------------------------------------------------------------------------

    def write_file(self, path: str, content: str) -> None:
        parent, name = self._navigate(path)
        if name not in parent or isinstance(parent[name], dict):
            raise FileNotFoundError(f"No such file: '{path}'")
        parent[name] = content

    # -------------------------------------------------------------------------
    # SOLUTION: create_dir
    # -------------------------------------------------------------------------

    def create_dir(self, path: str) -> None:
        parent, name = self._navigate(path)  # raises FileNotFoundError if parent missing
        if name in parent:
            raise FileExistsError(f"File exists: '{path}'")
        parent[name] = {}

    # -------------------------------------------------------------------------
    # SOLUTION: list_dir
    # -------------------------------------------------------------------------

    def list_dir(self, path: str) -> list:
        parts = self._split_path(path)
        if not parts:
            # Root directory
            return sorted(self._root.keys())

        parent, name = self._navigate(path)
        if name not in parent:
            raise FileNotFoundError(f"No such file or directory: '{path}'")
        if isinstance(parent[name], str):
            raise NotADirectoryError(f"Not a directory: '{path}'")
        return sorted(parent[name].keys())

    # -------------------------------------------------------------------------
    # SOLUTION: delete
    # -------------------------------------------------------------------------

    def delete(self, path: str) -> None:
        parent, name = self._navigate(path)
        if name not in parent:
            raise FileNotFoundError(f"No such file or directory: '{path}'")
        entry = parent[name]
        if isinstance(entry, dict) and len(entry) > 0:
            raise OSError(f"Directory not empty: '{path}'")
        del parent[name]
