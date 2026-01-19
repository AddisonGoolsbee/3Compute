# Classroom: {{CLASSROOM_NAME}}

Access Code: `{{ACCESS_CODE}}`

## What is a 3Compute Classroom?

A classroom groups a set of participants (students) with one or more instructors and provides a shared logical space inside the coding environment. For each classroom you own:

- A host directory is mounted inside your container at `/classrooms/{{CLASSROOM_ID}}`
- A `templates/` folder lets you place starter files or reference material for participants. All files in this directory are viewable read-only by participants. Participants can also clone any folders (e.g., projects) you place in here to their classroom directory through the Templates button.
- A `participants/` folder contains per-student workspaces

## Sharing Templates

As an instructor, you can easily share project templates with your classroom:

1. Create folders inside `templates/`. Each folder becomes a template that students can copy.
2. Add starter files (code, README, requirements.txt, etc.) to each template folder.
3. Students can access these templates in two ways:
   - **Templates dropdown**: Students select Templates → Classroom Templates → Your Classroom → Template Name
   - **Direct access**: Students browse `classroom-templates/` folder in their classroom view

### As a Student

When you join this classroom, you can access instructor-provided templates:

1. **Using the Templates dropdown** (recommended):
   - Click **Templates** in the file explorer toolbar
   - Select **Classroom Templates**
   - Choose this classroom, then select a template
   - Files are copied to your workspace and your terminal changes to that directory via the `cd` command.

2. **Manual copy**:
   - Browse the `classroom-templates/` folder in your classroom directory
   - Copy files you need to your personal workspace through the terminal

## Archiving This Classroom

If you no longer need this classroom visible in your file explorer:

1. Right-click the classroom folder
2. Select **Archive**
3. The classroom moves to your `archive/` folder (gray folder at the bottom of the explorer)
4. To restore: right-click the classroom in `archive/` and select **Restore**

Archiving is personal; it only affects your view. Other users still see the classroom normally. Users cannot join an archived classroom.

## Access Code

Share the access code above with participants so they can join. Keep it private! Anyone with the code can join.

---

*This README is auto-generated and will be regenerated on container restart. You can safely delete it if not needed.*
