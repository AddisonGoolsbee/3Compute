# Welcome to 3Compute!

## Introduction

3Compute is a free educational platform that provides cloud-based development environments for learning and building projects. With pre-configured templates for Discord bots, websites, and other projects, you can start coding immediately without any local setup required.

## Getting Started

To get started with 3Compute, you can:

1. Click on the `Templates` button to create a new project from a starter (e.g., Website, Discord Bot). This uploads the template into your workspace and opens its README—a file describing important information and instructions related to the project.
2. Upload your own code using the `Upload` button (single files or entire folders).
3. Create new files/folders with the `New` button, then open and edit them in the editor.

You can also interact through the terminal below by typing commands:
- `nano <file_name>` creates a file and allows you to modify the contents. After writing the contents, you can save it by typing the sequence `ctrl+x` to exit, `y` to save, and `enter` to confirm the name.
- `mkdir <folder_name>` creates a folder
- `rm <file_name>` deletes a file. Be careful, this action is irreversible!
- `rm -r <file_name>` deletes a folder and all of the files inside it. This action is irreversible!

&emsp;*Note: the terminal is also called the command-line interface (CLI).*

## What you can do here

- Build and run an application in your browser.
- Access the application from anywhere!
- Edit code with syntax highlighting for many languages.
- Use starter templates that set up common projects in one click.
- Open multiple terminal tabs and run multiple processes; your tabs are saved.

## Workspace Tour

### File Explorer (left)

- `Upload`:
  - Files: choose one or more files to upload into your workspace.
  - Folder: upload a whole folder (including subfolders). Some browsers mark this as an experimental feature.
  - Large uploads may fail with a "File too large" message.
- `New`:
  - File: creates a file. Press Enter to confirm or Esc to cancel.
  - Folder: creates a folder ("directory"). Press Enter to confirm or Esc to cancel.
  - Names must be unique among siblings (files and folders in the same directory). If there’s a conflict, you’ll be asked to pick a different name.
- `Templates`:
  - Click `Templates` and choose a template. The files are copied into your workspace under a folder named after the template.
  - After creation, the template's `README.md` will open for step-by-step instructions to configuring and running your application.
- Open: click a file to open it in the editor. Click a folder to expand/collapse it.
- Delete: use the trash icon on any file or folder.

### Editor (center)

- Language selector: change the syntax highlighting mode at the top.
- Save: click "Save" to write changes to your workspace.
- Markdown: when viewing a `.md` file, toggle the Markdown preview using the MD button.
- Images: image files are displayed directly.

### Terminal (bottom)

- Full shell access in your container. Use it like you would locally in a Linux environment (e.g., `python`, `npm`, `pip`, `git`).
  - *Note: depending on your 3Compute configuration, you may not have access to all commands.*
- Tabs: open multiple terminals. Closing a tab will stop all running processes within the tab.

## Learn more

- Open any template’s `README.md` after creating it for project-specific docs.
- Explore files and run commands in the terminal to see how everything works together.