# My Website

You build this site section by section. Each section adds something real: your name, your bio, a skills chart, a live clock, a visitor counter. When you are done, you have a working site you can share with anyone.

Your site runs on 3Compute's servers. As long as the server is running, the public URL works and anyone with the link can open the site in their browser. If you stop the server, visitors see a "connection refused" error until you start it again.

This README covers background knowledge that may be necessary or helpful for this lesson. Read through it once before you start coding.

## How to Run It

Right-click the `My-Website` folder in the file explorer on the left and select **Open in Terminal**. This executes `cd` (change directory) in your terminal to the project folder so the commands below will work.

Install the dependencies and start the server:

```bash
pip install -r requirements.txt
python app.py
```

Click the link that appears in the terminal. Your site opens in a new tab.

Keep the terminal running while you work. Every time you save a file, Flask reloads automatically (that is what `debug=True` does), so a browser refresh is enough to see changes.

## What This README Covers

- How sharing works on 3Compute
- The project structure
- Eight sections to build in order, from your name through a dark mode toggle
- Running the tests
- Making the site your own, plus resources and extension ideas
- A code review checklist for before you share your site

## How Sharing Works

When you run `python app.py` on 3Compute, the platform keeps your server reachable at a public URL. You can send that URL to anyone. As long as your container is running, the site is live.

## Project Structure

```
my-website/
├── app.py              Flask backend. Add your routes here.
├── templates/
│   ├── base.html       Shared layout (nav bar, footer).
│   └── index.html      Your home page. Add sections here.
├── static/
│   ├── style.css       Styles. Customize as needed.
│   └── app.js          JavaScript for interactivity.
├── test_website.py     Tests for your Flask routes.
└── requirements.txt    Python packages this project needs.
```

## Sections

Build them in order. Each section has instructions inside the relevant file. Search for `TODO SECTION X` comments to find them.

---

### Section 1: Your Name and Welcome (Already Built)

The welcome banner is finished. It demonstrates how Flask serves templates and how CSS variables control the color scheme.

Your turn:

- Open `templates/base.html` and replace "Your Name" with your name (in two places).
- Open `templates/index.html` and change the hero heading and subtitle.
- Open `static/style.css` and change `--primary` to a color you actually like.

To pick a color, search "color picker" in your browser and copy the hex code (for example, `#e94560`).

---

### Section 2: About Me

Your turn:

1. Open `templates/index.html` and find the `TODO SECTION 2` comment.
2. Uncomment the HTML block (select it and press Ctrl+/ or Cmd+/).
3. Replace the placeholder text with your real bio: where you go to school, what you are interested in, what you plan to do next.
4. Change the initials in the avatar circle to yours.
5. Update the tags to match your actual interests.

This section is pure HTML and CSS. No Python changes needed.

---

### Section 3: My Projects

Your turn:

1. Open `templates/index.html` and find `TODO SECTION 3`.
2. Uncomment the HTML block.
3. Replace the placeholder cards with your real projects.
   - Your class assignments count.
   - If a project lives on 3Compute, link to it.
   - If a link is not ready yet, use `href="#"` for now.
4. Add at least three cards. Add more if you have them.

A good card has a clear title, one or two sentences about what the project does and what you learned, and a link.

---

### Section 4: Skills Progress Bars

This section introduces `fetch()`, which lets the browser request data from your server and display it on the page without a full reload.

Your turn:

1. Open `app.py` and uncomment the Section 4 route (`/api/skills`).
2. Replace the placeholder skills and levels with your actual skills. Be honest; no one is grading your confidence levels.
3. Open `templates/index.html`, find `TODO SECTION 4`, and uncomment the HTML.
4. Open `static/app.js`, find `SECTION 4`, and uncomment the JavaScript.

When you reload the page, animated progress bars should appear.

A "skill" can be anything: Python, HTML/CSS, math, writing, Minecraft redstone, soccer, whatever you actually know.

---

### Section 5: Quote of the Day

Your Flask server calls an external API, fetches a random quote, and sends it to the browser. This is a common real-world pattern called a "backend proxy": your server sits in the middle so the browser does not have to call the external service directly.

Your turn:

1. Open `app.py` and uncomment the Section 5 route (`/quote`).
2. Open `templates/index.html`, find `TODO SECTION 5`, and uncomment the HTML.
3. Open `static/app.js`, find `SECTION 5`, and uncomment the JavaScript.

The "New Quote" button should fetch a fresh quote each time it is clicked.

---

### Section 6: Live Clock

A digital clock that updates every second. This section is pure JavaScript; no Flask routes are needed. It uses `setInterval` to call a function every 1000 milliseconds.

Your turn:

1. Open `templates/index.html`, find `TODO SECTION 6`, and uncomment the HTML.
2. Open `static/app.js`, find `SECTION 6`, and uncomment the JavaScript.

Optional extension: add a countdown timer to a date you care about (graduation, a birthday, summer break). Commented code in `app.js` shows how.

---

### Section 7: Visitor Counter

Your site tracks how many times it has been visited and shows the count. The count is saved to a file (`counter.txt`) so it persists across server restarts.

Your turn:

1. Open `app.py` and uncomment the Section 7 routes (`/api/visitors`).
2. Open `templates/index.html`, find `TODO SECTION 7`, and uncomment the HTML.
3. Open `static/app.js`, find `SECTION 7`, and uncomment the JavaScript.

Every time someone loads the page, the counter increments. You should see "You are visitor #N".

Discussion question: why would a real site use a database instead of a file for this?

---

### Section 8: Dark Mode Toggle

A button in the nav bar that switches between light and dark mode. The preference is saved to `localStorage` so it persists between visits.

Your turn:

1. Open `templates/index.html`, find `TODO SECTION 8`, and uncomment the HTML. The button itself is already in `base.html`.
2. Open `static/app.js`, find `SECTION 8`, and uncomment the JavaScript.

The CSS variables for dark mode are already in `style.css`. Look for `body.dark-mode`.

---

## Running the Tests

```bash
python test_website.py
```

The tests check that your routes exist and return the right data. Run them after you implement each section's Python route (Sections 4, 5, and 7).

---

## Making It Your Own

The starter code gives you a structure and a color scheme. It is meant to be changed. Some ideas:

- **Colors and fonts.** Change `--primary` in `style.css` to any color that means something to you. Fonts work the same way.
- **Layout.** The hero section can be centered, left-aligned, or have a background image. The projects grid can have two columns instead of three. Nothing is fixed.
- **Content.** Add sections that are not in the default list: a contact section, a favorites list, a timeline of your life, or anything else that makes the site more yours.
- **CSS animations.** Try adding `animation: fadeIn 0.5s ease;` to sections so they fade in when the page loads. MDN has good examples.

---

## Resources

- HTML: [MDN HTML Reference](https://developer.mozilla.org/en-US/docs/Web/HTML)
- CSS: [CSS-Tricks](https://css-tricks.com)
- JavaScript: [javascript.info](https://javascript.info)
- Flask: [flask.palletsprojects.com](https://flask.palletsprojects.com)
- Color palettes: [coolors.co](https://coolors.co)
- Contrast checker: [contrast-ratio.com](https://contrast-ratio.com)

---

## Extension Ideas

Once you have finished all eight sections, try one of these:

- **Blog.** Add a `/blog` route that renders a list of posts. Store posts as JSON or in a database.
- **Photo gallery.** A grid of images from your `static/` folder.
- **Contact form.** A form that saves messages to a file, or emails them using Python's `smtplib`.
- **Authentication.** A login page that gates a private admin area.
- **Database.** Replace `counter.txt` with a SQLite database using Python's built-in `sqlite3` module.
- **Deployment.** Learn how to deploy a Flask app to a cloud provider so the site stays online without 3Compute.

---

## Code Review Checklist

Before you share your site, check:

- [ ] Your real name appears in the nav bar and footer
- [ ] The bio is about you, with no placeholder text left over
- [ ] At least three real project cards
- [ ] Skills reflect your actual skill levels
- [ ] All tests pass (`python test_website.py`)
- [ ] The site looks correct in both light and dark mode
- [ ] No JavaScript errors in the browser console (press F12 to open it)
