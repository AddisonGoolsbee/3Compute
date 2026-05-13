# Welcome to CS Room!

CS Room is a free educational platform that gives you a cloud-based development environment. No local setup required.

## Getting Started

1. **Templates**: click Templates in the file explorer to create a new project from a starter (e.g. Website, Discord Bot). The template files are copied into your workspace.
2. **Upload**: upload your own files or folders using the Upload button.
3. **New**: create new files or folders with the New button.

You also have a full Linux terminal below the editor. Some useful commands:
- `python file.py` to run a Python script
- `mkdir folder_name` to create a folder
- `rm file_name` to delete a file (irreversible!)
- `cd folder_name` to change to a folder

## Classrooms

If your teacher gave you a **join code**, go to the Classrooms page and enter it.
Once you join, assignment folders appear in your workspace automatically.
You can edit files inside assignment folders, but you cannot create new top-level folders in the classroom. Just work inside the assignments your teacher provides.
You can view or copy the assignment templates in the classroom's `.templates/` folder for reference of the original files. It is hidden by default — enable **Show hidden files** in the explorer to see it.

Files named `test_*.py` are **test files** written by your teacher for automated evaluation. You can see them but cannot modify them.

## Workspace Tour

- **File Explorer** (left): browse, upload, create, and delete files.
- **Editor** (center): edit code with syntax highlighting. Use the Save button or the language selector to change highlighting mode. Toggle Markdown preview for `.md` files.
- **Terminal** (bottom): full shell access. This is where you will type commands. Open multiple tabs; closing a tab stops its processes.

## Publishing a Web App (custom subdomain)

If your project runs a web server (Flask, FastAPI, etc.), you can expose it publicly:

1. Start your app on any port in your assigned range (shown in the Ports panel).
2. Click the **Globe** icon in the terminal tab bar to open the **Ports** panel.
3. Enter a subdomain name (e.g. `myapp`) and the port your app is listening on.
4. Your app will be live at `https://myapp.app.csroom.org`.

Subdomains must be 3-32 lowercase letters, numbers, or hyphens.

## Learn more

Open any template's `README.md` after creating it for project-specific instructions.
