# Simple Website

A fun, personal website template built with Flask. Perfect for creating your own little corner of the internet with a casual, friendly vibe. Once it's live, anyone can access it!

## Quick setup

1. **Install dependencies:** `pip install -r requirements.txt`
2. **Run the website:** `python main.py`
3. **Access your website:** The terminal will display a link to your website, paste that in your browser and you're done!

## How does this work?

When you run `main.py`, you're starting a tiny web server using Flask (a Python library). This server's job is simple: whenever someone visits your site, it hands them the files in this folder—like your HTML, CSS, and images. The main page (`index.html`) is what people see first, and it's set up with sections for your name, a greeting, some fun facts, and links to your socials.

The look and feel comes from `style.css`. This file gives your site its pink gradient background, rounded corners, playful fonts, and makes sure it looks good on both phones and computers. If you hover over buttons or links, you'll notice little animations—those are thanks to the CSS too.

## Customizing your site

**Edit `index.html` to personalize your website:**

1. **Replace `[Your Name]`** with your actual name
2. **Update the fun facts** with things that are true about you
3. **Change the "Fun Stuff"** to hobbies and interests you actually have
4. **Add your real social media links** in the footer

### Changing the Colors

**The `style.css` file uses a pink theme. To change colors:**

```css
body {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
}
```

### Adding More Sections

Want to add more about yourself? Create new sections like:

- **Projects**: Show off things you've built
- **Photos**: Add a gallery of your life
- **Blog**: Share your thoughts and experiences
- **Contact**: Let people get in touch with you

## Advanced Customization

### Adding JavaScript

**Include JavaScript for cool effects:**

```html
<body>
  <!-- Your content -->
  <script src="script.js"></script>
</body>
```

### Adding More Pages

1. **Create new HTML files** (e.g., `projects.html`, `blog.html`)
2. **Add routes to `main.py`:**

```python
@app.route("/projects")
def projects():
    return send_from_directory(".", "projects.html")

@app.route("/blog")
def blog():
    return send_from_directory(".", "blog.html")
```

## Troubleshooting

### Port Already in Use / Permission Denied

If you get a "port already in use" error:

1. Change the port number in `main.py`. You only have a narrow range of ports available to you, find them listed near the terminal
2. Or kill the process using the port: `lsof -ti:<port_number> | xargs kill -9`

### Module Not Found

1. Make sure you've installed requirements: `pip install -r requirements.txt`

## Learning Resources

Want to learn more about web development? Check out these resources:

### HTML & CSS

Learn how to include content and style your website.

- **[MDN Web Docs - HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)** - Complete HTML reference and tutorials
- **[MDN Web Docs - CSS](https://developer.mozilla.org/en-US/docs/Web/CSS)** - CSS documentation and guides
- **[W3Schools HTML Tutorial](https://www.w3schools.com/html/)** - Interactive HTML learning
- **[CSS-Tricks](https://css-tricks.com/)** - CSS tips, tricks, and techniques

### JavaScript

Inject dynamic behavior into your website by writing JavaScript code.

- **[MDN Web Docs - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)** - JavaScript reference and tutorials
- **[JavaScript.info](https://javascript.info/)** - Modern JavaScript tutorial
- **[Eloquent JavaScript](https://eloquentjavascript.net/)** - Free online book

### Flask & Python

Learn how the web server works, add additional pages, a database, or even an API.

- **[Flask Documentation](https://flask.palletsprojects.com/)** - Official Flask docs
- **[Real Python - Flask Tutorial](https://realpython.com/tutorials/flask/)** - Flask tutorials
- **[Python.org](https://www.python.org/doc/)** - Official Python documentation

## Challenges

Once you're comfortable with this template, see if you can:

- Add a photo gallery
- Create a blog page
- Add a projects page to showcase your work
- Add animations with CSS
- Add Google Analytics to see who visits your site
- Add a browser icon to your website
