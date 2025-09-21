# TODO

- Migrate file system from using host folder (/tmp/uploads) to use docker-managed volumes. Will require a high-effort refactoring of files.py into some sort of abstraction layer. Pros: way faster, isolation, we don't directly see everyone's stuff (it's how you're supposed to do things)
- user-resizable windows for editor view

## Bugs

- Scroll doesn't work
- folder view in file explorer doesn't work 
- cat readme flops the second time super weird formating until reload