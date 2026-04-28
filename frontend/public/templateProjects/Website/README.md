# Simple Website

A small personal website built with Flask. You edit one HTML file, one CSS file, and run a Python script. Once it is running, anyone with the link can visit it.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## What the Files Do

- **`main.py`** starts a small Python web server using Flask. When a visitor opens your site, Flask hands them the files in this folder.
- **`index.html`** is the page visitors see. Your name, greeting, fun facts, and social links all live in this file.
- **`style.css`** controls the colors, fonts, rounded corners, and hover animations. Edit this file to change how the site looks.

Take a minute to open those three files before running anything. It will save you time later.

## Running the Site

Right-click the `Website` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies and start the server:

```bash
pip install -r requirements.txt
python main.py
```

The terminal prints a link. Paste it into your browser. Leave the server running while you work. When you save a file, refresh the browser to see the changes.

## What This README Covers

- What each file does (`main.py`, `index.html`, `style.css`)
- How to make the site your own, including changing colors
- Adding JavaScript and adding more pages
- Troubleshooting port conflicts and missing modules
- Learning resources and further challenges

## Making the Site Your Own

Open `index.html` and:

1. Replace `[Your Name]` with your actual name.
2. Change the fun facts to things that are actually true about you.
3. Replace the "Fun Stuff" section with hobbies you actually have.
4. Put real social links in the footer, or delete the section if you prefer not to share any.

### Changing the Colors

The default palette is pink. To pick different colors, edit this line in `style.css`:

```css
body {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
}
```

Search "hex color picker" online to find codes for any color you want.

### Adding More Sections

Some ideas for additional sections:

- **Projects**: things you have built
- **Photos**: a small gallery
- **Blog**: short posts
- **Contact**: ways for visitors to reach you

Each one is just another `<section>` in `index.html`. Copy an existing section and change the content.

## Adding JavaScript

To add buttons or animations that react to clicks, create a `script.js` file next to `index.html` and load it at the end of your page:

```html
<body>
  <!-- page content -->
  <script src="script.js"></script>
</body>
```

## Adding More Pages

Each additional page needs two things: an HTML file and a route in `main.py` that tells Flask how to serve it.

1. Create the new HTML file (for example, `projects.html` or `blog.html`).
2. Add routes in `main.py`:

```python
@app.route("/projects")
def projects():
    return send_from_directory(".", "projects.html")

@app.route("/blog")
def blog():
    return send_from_directory(".", "blog.html")
```

Now `/projects` and `/blog` on your site will serve those files.

## Troubleshooting

### Port Already in Use or Permission Denied

If you see a "port already in use" error, edit `main.py` and change the port number. CS Room gives each user a specific range of ports, listed near the terminal. To kill whatever is using the port instead:

```bash
lsof -ti:<port_number> | xargs kill -9
```

### Module Not Found

Run the install command again:

```bash
pip install -r requirements.txt
```

## Learning Resources

### HTML and CSS

- [MDN Web Docs: HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [W3Schools HTML Tutorial](https://www.w3schools.com/html/)
- [CSS-Tricks](https://css-tricks.com/)

### JavaScript

- [MDN Web Docs: JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [JavaScript.info](https://javascript.info/)
- [Eloquent JavaScript](https://eloquentjavascript.net/)

### Flask and Python

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Real Python Flask Tutorials](https://realpython.com/tutorials/flask/)
- [Python Documentation](https://www.python.org/doc/)

## Challenges

Once the basics work, try:

- A photo gallery
- A blog page
- A projects page for things you have built
- CSS animations
- A favicon (the small icon in the browser tab)
- Google Analytics to see who visits the site

## For Instructors

To share this template with a class:

1. Copy this folder into your classroom's `assignments/` directory.
2. Edit the starter files for your course.
3. Students can find it under **Templates > Classroom Assignments**, or by browsing the `assignments/` folder in their classroom.
