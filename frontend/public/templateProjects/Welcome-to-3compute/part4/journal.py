# A simple text journal.
#
# Run it with `python journal.py` and choose `write` to add an entry,
# or `read` to see past entries.

from datetime import date

JOURNAL_FILE = "journal.txt"


def add_entry():
    """Ask for an entry and append it to the journal file with today's date."""
    entry = input("What's on your mind today? ")
    today = date.today().isoformat()
    with open(JOURNAL_FILE, "a") as f:
        f.write(f"[{today}] {entry}\n")
    print(f"Saved to {JOURNAL_FILE}.")


def read_journal():
    """Print every entry in the journal file."""
    # TODO: open JOURNAL_FILE in read mode and print its contents.
    #
    # Hints:
    #   - `with open(JOURNAL_FILE) as f:` opens the file for reading.
    #   - `print(f.read())` prints everything in the file.
    #   - If the file does not exist yet, opening it raises FileNotFoundError.
    #     Wrap the open() in try/except and print a helpful message in the
    #     except branch, like "No entries yet. Write one first."
    pass


if __name__ == "__main__":
    action = input("Type 'write' to add an entry, or 'read' to see past entries: ").strip().lower()
    if action == "write":
        add_entry()
    elif action == "read":
        read_journal()
    else:
        print(f"I don't know '{action}'. Try 'write' or 'read'.")
