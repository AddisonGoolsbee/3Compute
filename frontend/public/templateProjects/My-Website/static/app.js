/* =============================================================================
   MY WEBSITE: app.js
   =============================================================================

   This file handles all the interactivity on your site.
   You'll add code here section by section as you build each feature.

   Each section is labeled with a comment. Scroll down to find the right spot.
   Uncomment the code block for the section you're working on, then fill in
   the TODO parts.

   TIP: Open the browser's developer console (F12 or right-click > Inspect >
   Console) to see errors and test JavaScript as you go.
============================================================================= */


/* =============================================================================
   SECTION 4: SKILLS PROGRESS BARS
   Fetches skill data from your /api/skills Flask route and builds the bars.

   STEPS:
   1. Make sure your /api/skills route is working in app.py first
   2. Uncomment the code below
   3. The bars should appear and animate when you reload the page

   WHAT fetch() DOES:
   fetch() sends an HTTP request from the browser to a URL.
   It returns a Promise, a value that will be ready "later".
   .then() runs when the response arrives.
   .json() parses the response body as JSON.
============================================================================= */
/*
function loadSkills() {
    fetch("/api/skills")
        .then(response => response.json())
        .then(skills => {
            const container = document.getElementById("skills-container");
            container.innerHTML = "";  // Clear the "Loading..." text

            skills.forEach(item => {
                // Build a row for each skill
                const row = document.createElement("div");
                row.className = "skill-row";

                row.innerHTML = `
                    <div class="skill-label">
                        <span>${item.skill}</span>
                        <span>${item.level}%</span>
                    </div>
                    <div class="skill-track">
                        <div class="skill-bar" data-level="${item.level}"></div>
                    </div>
                `;
                container.appendChild(row);
            });

            // Animate bars after a short delay (so the transition is visible)
            setTimeout(() => {
                document.querySelectorAll(".skill-bar").forEach(bar => {
                    bar.style.width = bar.dataset.level + "%";
                });
            }, 100);
        })
        .catch(error => {
            console.error("Could not load skills:", error);
            document.getElementById("skills-container").innerHTML =
                "<p class='loading-text'>Could not load skills. Is the /api/skills route working?</p>";
        });
}

// Run when the page loads
loadSkills();
*/


/* =============================================================================
   SECTION 5: QUOTE OF THE DAY
   Fetches a quote from your /quote Flask route and displays it.
   The "New Quote" button fetches a fresh one.

   STEPS:
   1. Make sure your /quote route is working in app.py first
   2. Uncomment the code below
   3. The quote should appear on page load; the button gets a new one
============================================================================= */
/*
function loadQuote() {
    const quoteText = document.getElementById("quote-text");
    const quoteAuthor = document.getElementById("quote-author");

    quoteText.textContent = "Loading...";
    quoteAuthor.textContent = "";

    fetch("/quote")
        .then(response => response.json())
        .then(data => {
            quoteText.textContent = data.content;
            quoteAuthor.textContent = data.author;
        })
        .catch(error => {
            console.error("Could not load quote:", error);
            quoteText.textContent = "Could not load quote.";
        });
}

// Load a quote when the page opens
loadQuote();

// Wire up the button
const newQuoteBtn = document.getElementById("new-quote-btn");
if (newQuoteBtn) {
    newQuoteBtn.addEventListener("click", loadQuote);
}
*/


/* =============================================================================
   SECTION 6: LIVE CLOCK
   Updates the clock display every second using setInterval.

   STEPS:
   1. Uncomment the code below
   2. The clock should start ticking immediately

   OPTIONAL EXTENSION: COUNTDOWN TIMER:
   Pick a date you're looking forward to (graduation, a birthday, summer break).
   Calculate how much time is left and display it below the clock.

   Example (uncomment and modify the countdown section):
       const target = new Date("2026-06-15");  // change this date
       const now = new Date();
       const diff = target - now;
       const days = Math.floor(diff / (1000 * 60 * 60 * 24));
       document.getElementById("countdown-container").textContent =
           `${days} days until graduation`;
============================================================================= */
/*
function updateClock() {
    const now = new Date();

    // Format time as HH:MM:SS
    const hours   = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const clockEl = document.getElementById("clock-time");
    if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // Format date
    const dateEl = document.getElementById("clock-date");
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
}

// Run immediately, then repeat every second
updateClock();
setInterval(updateClock, 1000);

// ------- OPTIONAL: Countdown Timer --------
// Uncomment and customize this block:
//
// const targetDate = new Date("2026-06-15");  // YOUR date here
// function updateCountdown() {
//     const now = new Date();
//     const diff = targetDate - now;
//     if (diff > 0) {
//         const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
//         const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//         const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//         const seconds = Math.floor((diff % (1000 * 60)) / 1000);
//         document.getElementById("countdown-container").textContent =
//             `${days}d ${hours}h ${minutes}m ${seconds}s until [your event]`;
//     } else {
//         document.getElementById("countdown-container").textContent = "It's here!";
//     }
// }
// updateCountdown();
// setInterval(updateCountdown, 1000);
*/


/* =============================================================================
   SECTION 7: VISITOR COUNTER
   Increments the visitor count on the server, then displays it.

   STEPS:
   1. Make sure your /api/visitors routes are working in app.py first
   2. Uncomment the code below

   NOTE ON fetch() WITH POST:
   A POST request sends data to the server (here, it signals "add one").
   We pass { method: "POST" } as options to fetch().
   The server increments the count, saves it, and returns the new number.
============================================================================= */
/*
function trackVisit() {
    fetch("/api/visitors", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            const el = document.getElementById("visitor-count");
            if (el) {
                el.innerHTML = `You are visitor <strong>#${data.count}</strong>`;
            }
        })
        .catch(error => {
            console.error("Could not update visitor count:", error);
        });
}

trackVisit();
*/


/* =============================================================================
   SECTION 8: DARK MODE TOGGLE
   Toggles a "dark-mode" class on <body> and saves the preference.

   STEPS:
   1. Uncomment the code below
   2. The toggle button is already in base.html (id="dark-mode-toggle")
   3. Make sure the dark mode CSS variables are set in style.css (they are)

   HOW localStorage WORKS:
   localStorage stores small amounts of data in the browser that persist
   between page refreshes. Here we save "dark" or "light" so the user's
   preference is remembered.
============================================================================= */
/*
const toggle = document.getElementById("dark-mode-toggle");
const body = document.body;

// Restore saved preference on load
if (localStorage.getItem("color-scheme") === "dark") {
    body.classList.add("dark-mode");
    toggle.textContent = "☀";
}

// Handle button click
if (toggle) {
    toggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        toggle.textContent = isDark ? "☀" : "☾";
        localStorage.setItem("color-scheme", isDark ? "dark" : "light");
    });
}
*/
