# My Website

By the end of this project, you'll have a real website you can share with anyone. Each section you complete makes it better. Start with your name. End with something you're proud of.

Your site runs on 3Compute's servers. Once it's running, anyone with the link can visit it, including your friends, your family, and anyone you want to show your work to. It's yours.

## How to Run

```bash
python app.py
```

Click the link that appears in the terminal. Your site opens in a new tab.

Keep the terminal running while you work. Every time you save a file, Flask reloads automatically (that's what `debug=True` does), so just refresh the browser.

## How Sharing Works

When you run `python app.py` on 3Compute, the platform keeps your server accessible at a public URL. You can share that URL directly. As long as your container is running, the site is live. If you stop the server, visitors will get a "connection refused" error until you start it again.

## Project Structure

```
my-website/
├── app.py              Flask backend (add your routes here)
├── templates/
│   ├── base.html       The shared layout (nav bar, footer)
│   └── index.html      Your home page (add sections here)
├── static/
│   ├── style.css       All the styles (customize heavily)
│   └── app.js          JavaScript for interactivity
├── test_website.py     Tests for your Flask routes
└── requirements.txt    Python packages this project needs
```

## Sections

Build them in order. Each section has instructions in the relevant file. Look for the `TODO SECTION X` comments.

---

### Section 1:Your Name and Welcome (Done)

The welcome banner is already built. It shows how Flask serves templates and how CSS variables control the color scheme.

**Your turn:**
- Open `templates/base.html` and replace "Your Name" with your name (in two places)
- Open `templates/index.html` and change the hero heading and subtitle
- Open `static/style.css` and change `--primary` to a color you actually like

To pick a color, search "color picker" in your browser and copy the hex code (like `#e94560`).

---

### Section 2:About Me

**Your turn:**
1. Open `templates/index.html` and find the `TODO SECTION 2` comment
2. Uncomment the HTML block (select it, press Ctrl+/ or Cmd+/)
3. Replace the placeholder text with YOUR real bio: where you go to school, what you're interested in, what you want to do next
4. Change the initials in the avatar circle to yours
5. Update the tags to reflect your actual interests

This section is pure HTML and CSS. No Python changes needed.

---

### Section 3:My Projects

**Your turn:**
1. Open `templates/index.html` and find the `TODO SECTION 3` comment
2. Uncomment the HTML block
3. Replace the placeholder cards with your real projects
   - Look through your class assignments (those count)
   - If a project lives on 3Compute, link to it
   - If a link isn't ready, use `href="#"` for now
4. Add at least 3 cards. Add more if you have them.

A good card has: a clear title, 1-2 sentences about what it does and what you learned, and a link.

---

### Section 4:Skills Progress Bars

This section introduces `fetch()`, which lets your browser ask your server for data and display it dynamically.

**Your turn:**
1. Open `app.py` and uncomment the Section 4 route (`/api/skills`)
2. Change the skills and levels to YOUR actual skills. Be honest; nobody's grading your confidence levels
3. Open `templates/index.html`, find `TODO SECTION 4`, and uncomment the HTML
4. Open `static/app.js`, find `SECTION 4`, and uncomment the JavaScript

When you reload the page, animated progress bars should appear.

What can a "skill" be? Anything: Python, HTML/CSS, math, writing, Minecraft redstone, soccer, whatever you actually know.

---

### Section 5:Quote of the Day

Your Flask server will call an external API, get a random quote, and pass it to the browser. This is a common real-world pattern called a "backend proxy": your server acts as a middleman so the browser doesn't have to deal with restrictions around calling external services directly.

**Your turn:**
1. Open `app.py` and uncomment the Section 5 route (`/quote`)
2. Open `templates/index.html`, find `TODO SECTION 5`, and uncomment the HTML
3. Open `static/app.js`, find `SECTION 5`, and uncomment the JavaScript

The "New Quote" button should fetch a fresh quote every time you click it.

---

### Section 6:Live Clock

A digital clock that updates every second. This one is pure JavaScript with no Flask routes needed. It uses `setInterval` to call a function every 1000 milliseconds.

**Your turn:**
1. Open `templates/index.html`, find `TODO SECTION 6`, and uncomment the HTML
2. Open `static/app.js`, find `SECTION 6`, and uncomment the JavaScript

**Optional extension:** Add a countdown timer to a date you care about: graduation, a birthday, summer break. There's commented code in `app.js` showing how to do it.

---

### Section 7:Visitor Counter

Your site will track how many times it's been visited and show the count. The count is saved to a file (`counter.txt`) so it persists across server restarts.

**Your turn:**
1. Open `app.py` and uncomment the Section 7 routes (`/api/visitors`)
2. Open `templates/index.html`, find `TODO SECTION 7`, and uncomment the HTML
3. Open `static/app.js`, find `SECTION 7`, and uncomment the JavaScript

Every time someone loads the page, the counter increments. You should see "You are visitor #N".

*Discussion question:* Why would a real site use a database instead of a file for this?

---

### Section 8:Dark Mode Toggle

A button in the nav bar that switches between light and dark mode. The preference is saved to `localStorage` so it's remembered between visits.

**Your turn:**
1. Open `templates/index.html`, find `TODO SECTION 8`, and uncomment the HTML (the button is already in `base.html`)
2. Open `static/app.js`, find `SECTION 8`, and uncomment the JavaScript

The CSS variables for dark mode are already in `style.css`. Look for `body.dark-mode`.

---

## Running the Tests

```bash
python test_website.py
```

Tests check that your routes exist and return the right data. Run them after you implement each section's Python route (Sections 4, 5, and 7).

---

## Making It Your Own

The starter code gives you a structure and a color scheme. It's meant to be changed. Some ideas:

**Colors and fonts:** Change `--primary` in `style.css` to anything. Try a color that means something to you.

**Layout:** The hero section can be centered, left-aligned, or have a background image. The projects grid can have 2 columns instead of 3. Nothing is fixed.

**Content:** Add sections that aren't in the default list. A "contact" section, a "favorites" list, a timeline of your life, anything that makes it more yours.

**CSS animations:** Try adding `animation: fadeIn 0.5s ease;` to sections so they fade in when the page loads. MDN has good examples.

---

## Resources

**HTML basics:** [MDN HTML Reference](https://developer.mozilla.org/en-US/docs/Web/HTML)

**CSS tricks:** [CSS-Tricks](https://css-tricks.com) is an excellent reference for layout and effects.

**JavaScript basics:** [javascript.info](https://javascript.info) is the best free JavaScript guide.

**Flask documentation:** [flask.palletsprojects.com](https://flask.palletsprojects.com)

**Color tools:** [coolors.co](https://coolors.co) generates color palettes. [contrast-ratio.com](https://contrast-ratio.com) checks if your text is readable.

---

## Extension Ideas

Once you've finished all eight sections, here are some directions to take it further:

- **Blog:** Add a `/blog` route that renders a list of posts. Store posts as JSON or in a database.
- **Photo gallery:** Add a grid of images from your `static/` folder.
- **Contact form:** Add a form that saves messages to a file (or emails them using Python's `smtplib`).
- **Authentication:** Add a login page so you have a private admin area.
- **Database:** Replace `counter.txt` with a SQLite database using Python's built-in `sqlite3` module.
- **Deployment:** Learn how to deploy a Flask app to a cloud provider so it stays running 24/7 without needing 3Compute.

---

## Code Review Checklist

Before you share your site, check:

- [ ] Your real name is in the nav bar and footer
- [ ] The bio is actually about you (no placeholder text)
- [ ] You have at least 3 real project cards
- [ ] Skills reflect your actual skill levels
- [ ] All tests pass: `python test_website.py`
- [ ] The site looks good in both light and dark mode
- [ ] No JavaScript errors in the browser console (F12)
