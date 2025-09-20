# TODO

- Migrate file system from using host folder (/tmp/uploads) to use docker-managed volumes. Will require a high-effort refactoring of files.py into some sort of abstraction layer. Pros: way faster, isolation, we don't directly see everyone's stuff (it's how you're supposed to do things)