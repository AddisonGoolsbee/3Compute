# My Website (Personal Portfolio): Instructor Lesson Plan

## Overview

Students build a personal portfolio website from scratch over 7-8 class periods. The site is publicly accessible once running on 3Compute, so students can genuinely share it with friends and family. Each class session adds a visible feature, and students fill in their own real content throughout. The bio is their bio. The projects are their projects.

This is a project-based learning unit. There is no single right answer. The goal is that every student finishes with something they're proud of and would actually share.

> **Online Safety Note:** All websites built on 3Compute are publicly accessible. Before students begin, let them know they can avoid putting personal information on their site or use a nickname instead of their real name if they prefer. Respect each student's comfort level and remind them to follow your school's guidelines for online safety. This is a good opportunity to discuss responsible web presence as part of the project.

**Estimated Duration:** 7-8 class periods (45-50 minutes each)

**Prerequisites:**
- Basic Python (variables, functions, conditionals, loops)
- Some exposure to HTML is helpful but not required; students pick it up quickly in context
- No prior JavaScript experience needed

**Grade Level:** 9-10 primary, 11-12 extending

---

## CSTA Standards Addressed

> **Note:** This content has not been submitted for official CSTA alignment review. The crosswalk below shows which standards this project is designed to address.

### Primary Standards

| Standard | Description | How This Project Addresses It |
|----------|-------------|-------------------------------|
| **3A-AP-13** | Create prototypes that use algorithms to solve computational problems by leveraging prior student knowledge and personal interests. | The skills API and visitor counter involve algorithmic thinking applied to student-chosen personal content. |
| **3A-AP-16** | Design and iteratively develop computational artifacts for practical intent, personal expression, or to address a societal issue by using events to initiate instructions. | Button click events (new quote, dark mode), timer events (live clock), and page load events (visitor counter, skills fetch) are all event-driven. The artifact is genuinely personal. |
| **3A-AP-17** | Decompose problems into smaller components through systematic analysis, using constructs such as procedures, modules, and/or objects. | The project decomposes a complex website into eight discrete, testable sections. Each section is a standalone feature. |
| **3A-AP-18** | Create artifacts by using procedures within a program, combinations of data and procedures, or independent but interrelated programs. | Flask routes (procedures) operate on data (counter.txt, skills list, external API responses) and the frontend JavaScript is a separate but interrelated program. |
| **3A-AP-19** | Systematically design and develop programs for broad audiences by incorporating feedback from users. | Day 7 is a structured peer feedback session; Day 8 has students implement one piece of feedback before final presentation. |
| **3B-AP-16** | Demonstrate code reuse by creating programming solutions using libraries and APIs. | Students use Flask, the Requests library (external API calls), and the browser's built-in fetch() API. |
| **3B-AP-19** | Develop programs for multiple computing platforms. | The project explicitly targets the web platform, contrasting with the terminal-based Python programs students have built previously. |

### Supporting Standards

| Standard | Description | How This Project Supports It |
|----------|-------------|------------------------------|
| **3A-AP-21** | Develop and use a series of test cases to verify that a program performs according to its design specifications. | A test suite (`test_website.py`) covers all Flask routes. Students run it to verify each section before moving on. |
| **3A-IC-24** | Evaluate the ways computing impacts personal, ethical, social, economic, and cultural practices. | Discussion prompts on privacy (visitor counter), persistent data, and what it means to have a public web presence. |

---

## Learning Objectives

By the end of this project, students should be able to:

1. **Explain** how a Flask application serves HTML templates and JSON responses
2. **Build** a multi-route web application with both page routes and API routes
3. **Use** the JavaScript `fetch()` API to request data from a server and update the DOM
4. **Apply** event listeners to wire up interactive UI elements
5. **Persist** data across server restarts using file I/O
6. **Describe** the difference between frontend and backend responsibilities
7. **Receive and apply** peer feedback on a technical project

---

## Lesson Sequence

### Day 1: Setup and Section 1 (45 min)

**Objectives:**
- Understand how Flask serves a web page
- Customize the site's identity and color scheme

**Setup (10 min):**
- Students open the My Website template in 3Compute
- Run `python app.py` and open the link
- Confirm everyone can see the default welcome page

**Guided Exploration (15 min):**
Walk through the file structure as a class:
- `app.py`: What does `render_template("index.html")` do?
- `templates/base.html`: Where does the nav bar come from? What is `{% block content %}`?
- `templates/index.html`: How does `{% extends "base.html" %}` work?
- `static/style.css`: Find the `:root` block. What are CSS custom properties?

**Independent Work (15 min):**
Students make Section 1 their own:
- Change the name in `base.html` (nav brand + footer)
- Change the hero heading and subtitle in `index.html`
- Change `--primary` in `style.css` to a color they choose

**Debrief (5 min):**
A few students share their screens and show their color choices. Briefly discuss: "Why might a developer use CSS variables instead of writing a color code everywhere?"

**Instructor Notes:**
- Some students will spend most of their time on colors. That's fine; it builds ownership.
- Confirm everyone understands the template/extends relationship before Day 2.

---

### Day 2: Sections 2 and 3 (45-50 min)

**Objectives:**
- Write content in HTML
- Build a multi-card grid layout

**Brief Demo (10 min):**
Uncomment Section 2 in `index.html` live. Show what happens in the browser. Point out the avatar circle, the tags, the grid layout in `style.css`. Ask: "What would you put in your bio?"

**Independent Work (30-35 min):**
Students uncomment and complete Sections 2 and 3:
- Section 2: Write a real bio. Replace placeholder text. Change the initials. Update the tags.
- Section 3: Replace placeholder project cards with real projects they've done in class.

**Circulate and push for real content.** The most common failure mode is students leaving placeholder text in. Prompt: "What's a project you actually worked on this year?"

**Debrief (5 min):**
A few students share their project cards. Discuss: "What makes a good project description? What would a stranger want to know?"

**Instructor Notes:**
- Students who haven't done many projects can include personal work, apps they use, or things they want to build.
- Watch for students who are anxious about writing about themselves. Offer sentence starters ("I got interested in CS when...").
- No Python changes in this session. Keep the focus on content and HTML.

---

### Day 3: Section 4 (Skills API) (45-50 min)

**Objectives:**
- Add a JSON-returning Flask route
- Use `fetch()` to request data and build DOM elements dynamically

**Concept Introduction (10 min):**
Draw on the board:

```
Browser                Flask Server
  |                         |
  | GET /api/skills ------> |
  |                         | builds a Python list
  | <--- JSON list -------- |
  |                         |
  | (JavaScript builds      |
  |  the HTML from the      |
  |  list)                  |
```

Ask: "Why return JSON instead of HTML from this route? What's the difference?"

Key ideas to cover:
- Routes can return data (JSON) instead of pages
- `jsonify()` converts a Python dict/list to a JSON response
- `fetch()` in JavaScript is like calling `requests.get()` in Python
- The browser receives JSON and builds HTML from it. This is dynamic content.

**Guided Implementation (20 min):**
Walk through uncommenting the route together:
1. Open `app.py` and uncomment the `/api/skills` route
2. Run `python test_website.py`. Section 4 tests should pass.
3. Visit `/api/skills` directly in the browser. Students see raw JSON.

Then walk through the JavaScript:
1. Open `app.js` and uncomment the Section 4 block
2. Uncomment the HTML in `index.html`
3. Reload the page. Bars should animate in.

**Independent Work (15 min):**
Students customize their skills list. Prompt: "Be honest. Nobody's grading your confidence levels."

**Instructor Notes:**
- Some students will be confused by `.then()` chaining. It's okay to defer a deep explanation of Promises.
- The key takeaway is the request/response flow, not the syntax.
- Students who finish early can add more skills or customize the bar animation.

---

### Day 4: Section 5 (Quote of the Day) (45 min)

**Objectives:**
- Call an external API from Python on the backend
- Understand why the backend acts as a middleman

**Concept Introduction (10 min):**
Extend yesterday's diagram:

```
Browser         Flask Server        External API
  |                  |                    |
  | GET /quote --->  |                    |
  |                  | GET dummyjson ---- |
  |                  | <-- quote JSON --- |
  |                  | (normalize it)     |
  | <-- our JSON --- |                    |
```

Discussion prompt: "Why not have the browser call dummyjson.com directly? What problems could that cause?"

Key ideas: CORS restrictions, API key security (if there were one), centralizing error handling.

**Guided Implementation (20 min):**
Walk through uncommenting the `/quote` route in `app.py`. Key points:
- `http_requests` is just the `requests` library renamed at the top of the file. Why was it renamed?
- What does `timeout=5` do? What happens if the external API is slow?
- Why does the route have a `try/except`? Show what happens if you comment it out and use a bad URL.

Then uncomment the JavaScript and HTML together.

**Independent Work (15 min):**
Test the button, run `python test_website.py`, troubleshoot any issues.

**Discussion (5 min):**
"The quote you see might be from someone you've never heard of. How do you decide whether to trust a quote you find on the internet?"

**Instructor Notes:**
- If `dummyjson.com` is unavailable, the fallback quote will display. That's working correctly; explain why the fallback exists.
- Students might ask why we import `requests as http_requests`. Explain that Flask has its own `request` object (singular, no 's') that represents the incoming browser request, and using the same name for both would be a bug.

---

### Day 5: Sections 6 and 7 (Clock + Visitor Counter) (45 min)

**Objectives:**
- Use `setInterval` for recurring JavaScript events
- Persist data across server restarts using file I/O

**Section 6: Live Clock (20 min):**
This section is pure JavaScript. Walk through the `setInterval` concept:
- "setInterval(fn, 1000) means: call fn every 1000 milliseconds"
- "It's like a loop, but non-blocking. The rest of the page keeps working."

Uncomment and run it together. Then give students 10 minutes to:
- Style the clock how they want (size, color, font)
- Optionally add the countdown timer extension

**Section 7: Visitor Counter (20 min):**
Discuss first:
- "If we store the count in a Python variable, what happens when the server restarts?"
- "Why a file? What would be even better? (database)"
- "Does incrementing on every page load tell us what we actually want to know? What's a 'real' visit?"

Walk through uncommenting the route. Students run the tests.

**Debrief (5 min):**
"Your counter.txt file now has a number in it. Open it. What would happen if you edited that number manually? Is that a problem or a feature?"

**Instructor Notes:**
- The visitor counter is a good place to discuss privacy: should websites track visits? What data should be logged?
- Students with more experience can be challenged to use Python's `json` module to store additional metadata (timestamp, IP prefix) alongside the count.

---

### Day 6: Section 8 (Dark Mode + Polish) (45 min)

**Objectives:**
- Use `localStorage` to persist a UI preference
- Polish the site: fix placeholder text, refine styles, test on mobile

**Section 8: Dark Mode (20 min):**
Walk through the `localStorage` concept briefly:
- "localStorage stores small amounts of text in the browser, per site."
- "It persists across page refreshes, even if you close and reopen the tab."

Uncomment and run it. Students can then customize the dark mode colors in `style.css`.

**Polish Time (20 min):**
Students do a self-review using the checklist in `README.md`:
- Is their real name everywhere?
- Is there any placeholder text left?
- Does it look good in dark mode?
- Any JavaScript console errors?

Encourage students to visit their own site on a phone (or use browser dev tools mobile view) and fix anything that looks off.

**Debrief (5 min):**
"What's one thing you're proud of that you added to this site?"

---

### Day 7: Peer Feedback Session (45 min)

**Objectives:**
- Give and receive constructive technical and design feedback
- Identify one concrete improvement to make

**Setup (5 min):**
Assign pairs (or have students pair up). Each student will review one other student's site.

**How to Share the Site:**
Students share the URL of their running 3Compute site with their partner. If URLs aren't available, share screens.

**Structured Feedback (30 min):**
Each student has 15 minutes to write feedback for their partner. Give them the following prompts:

*Technical feedback:*
- Which sections are implemented? Is anything missing or broken?
- Did you notice any errors in the browser console?
- Is the visitor counter working? The skills section?

*Content feedback:*
- Is the bio specific? Or does it sound like a template?
- Do the project cards explain what the project actually does?
- Are the skill levels believable and interesting?

*Design feedback:*
- What's the color scheme? Does it feel intentional?
- Is the site readable on a small screen?
- What's the single most impactful visual improvement you'd suggest?

*What to notice when giving feedback:*
- Specific is better than general. "The project cards need more detail" is better than "The projects section could be improved."
- Ask about intent. "Was the large clock intentional? It draws a lot of attention."
- Celebrate real content. When someone has written a genuine bio, that's worth noting.

**Share Back (10 min):**
Partners share their written feedback. Instructor circulates. Listen for disagreements and surface them to the class.

---

### Day 8 (Optional): Implement Feedback + Final Presentation (45-50 min)

**Objectives:**
- Apply one piece of feedback to the project
- Present the site

**Individual Work (25 min):**
Each student picks ONE piece of feedback from yesterday and implements it. Before they start, they write down:
1. What feedback they chose
2. Why they chose it
3. What they plan to change

**Presentations (20 min):**
Rapid-fire format: each student has 90 seconds to share their screen and answer:
1. What is one section you built that you're proud of?
2. What feedback did you receive and what did you change?

---

## Assessment Ideas

### Formative Assessment

- **Test suite:** `python test_website.py` provides immediate feedback on Flask routes
- **Peer review writeups:** The Day 7 feedback documents show whether students can articulate technical and design observations
- **Exit tickets:** "Explain in one sentence what `fetch()` does"

### Summative Assessment

**Option A: Deployed Site + Reflection**
- The site itself (check for real content, no placeholder text, all 8 sections)
- A written reflection (200-300 words): What was the hardest part? What would you build next?
- Rubric suggestion:
  - All 8 sections implemented (40%)
  - Content is genuinely personal, no placeholder text (30%)
  - One piece of peer feedback implemented and described (15%)
  - Tests pass (15%)

**Option B: Technical Walkthrough**
Student walks through their code for 5 minutes, explaining:
- How does the `/api/skills` route work?
- What happens when the "New Quote" button is clicked? Trace it from click to display.
- How does the visitor counter persist across restarts?

**Option C: Extension**
Student implements one of the extension ideas (blog, gallery, database, contact form) and presents it to the class.

---

## Differentiation

### For Students Who Are Moving Fast

- Add a blog section with a `/blog` route that renders a list of posts
- Replace `counter.txt` with a SQLite database using Python's built-in `sqlite3`
- Add a contact form that saves submissions
- Add authentication so the site has a private admin area
- Deploy to a free cloud provider (Render, Railway) so it stays running without 3Compute

### For Students Who Need More Support

- Focus on Sections 1-4 first; Sections 5-8 are additive
- Provide pair programming opportunities on the JavaScript sections
- For students who find writing a bio difficult, offer sentence starters or a structured template
- The most important outcome is personal content. A student with Sections 1-3 fully customized has learned more than one with all 8 sections still showing placeholder text.

---

## Discussion Prompts

Use these at natural transition points:

1. **"What's the difference between the frontend and the backend?"** After Day 1. Students often conflate them.

2. **"Why does a professional website use a backend server instead of just HTML files?"** After Day 3 (once they've seen what JSON routes enable).

3. **"Your counter increments every page load. Is that the same as the number of unique visitors?"** After Day 5. Leads into discussions about analytics and privacy.

4. **"Should you put your real name and photo on a public website?"** Anytime. There's no right answer; it depends on context, goals, and risk tolerance.

5. **"What's one thing on your site that you would want a future employer to see? What would you want to hide?"** Good before Day 7.

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Site not loading at all | `python app.py` not running | Have student restart the server |
| Skills section shows "Loading skills..." forever | `/api/skills` route not implemented, or JavaScript not uncommented | Check both `app.py` and `app.js` |
| Quote always shows the fallback | External API unavailable (network restriction) | The fallback is working correctly. Explain why the fallback exists. |
| Visitor count resets on restart | Student is not writing to `counter.txt` | Check that the `with open(..., "w")` block is inside the POST branch |
| Dark mode toggle doesn't persist | `localStorage.setItem` call missing | Check Section 8 in `app.js` |
| Tests import error | `app.py` has a syntax error | Run `python app.py` to see the error message |

---

## Files in This Package

| File | Purpose |
|------|---------|
| `templateProjects/My-Website/app.py` | Student template with commented-out TODOs |
| `templateProjects/My-Website/templates/base.html` | Shared layout (nav, footer) |
| `templateProjects/My-Website/templates/index.html` | Home page with commented-out section HTML |
| `templateProjects/My-Website/static/style.css` | Stylesheet with CSS variables for theming |
| `templateProjects/My-Website/static/app.js` | JavaScript with commented-out section code |
| `templateProjects/My-Website/test_website.py` | Test suite for Flask routes |
| `templateProjects/My-Website/README.md` | Student-facing instructions |
| `templateProjects/My-Website/requirements.txt` | Python dependencies |
| `docs/my-website/lesson-plan.md` | This document |
| `docs/my-website/solution/app.py` | Complete reference implementation |
| `docs/my-website/solution/index.html` | Complete index.html with all sections |
| `docs/my-website/solution/app.js` | Complete app.js with all sections |

---

## Additional Resources

### For Instructors

- [Flask Quickstart](https://flask.palletsprojects.com/en/3.1.x/quickstart/) - good to skim before Day 1
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) - reference for Day 3
- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) - reference for Day 6
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - useful for the Day 1 color discussion

### For Students (also in README.md)

- [javascript.info](https://javascript.info) - best free JavaScript guide
- [CSS-Tricks](https://css-tricks.com) - layout and effects reference
- [coolors.co](https://coolors.co) - color palette generator

---

*Last updated: March 2026*
