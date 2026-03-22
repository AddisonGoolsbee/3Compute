/* =============================================================================
   MY WEBSITE:app.js (SOLUTION)
   =============================================================================
   Complete, working JavaScript for all eight sections.
   Use this as a reference when reviewing student work.
============================================================================= */


/* =============================================================================
   SECTION 4: SKILLS PROGRESS BARS
============================================================================= */
function loadSkills() {
    fetch("/api/skills")
        .then(response => response.json())
        .then(skills => {
            const container = document.getElementById("skills-container");
            if (!container) return;
            container.innerHTML = "";

            skills.forEach(item => {
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

            // Trigger CSS transition after a short delay
            setTimeout(() => {
                document.querySelectorAll(".skill-bar").forEach(bar => {
                    bar.style.width = bar.dataset.level + "%";
                });
            }, 100);
        })
        .catch(error => {
            console.error("Could not load skills:", error);
            const container = document.getElementById("skills-container");
            if (container) {
                container.innerHTML = "<p class='loading-text'>Could not load skills.</p>";
            }
        });
}

if (document.getElementById("skills-container")) {
    loadSkills();
}


/* =============================================================================
   SECTION 5: QUOTE OF THE DAY
============================================================================= */
function loadQuote() {
    const quoteText   = document.getElementById("quote-text");
    const quoteAuthor = document.getElementById("quote-author");
    if (!quoteText) return;

    quoteText.textContent  = "Loading...";
    quoteAuthor.textContent = "";

    fetch("/quote")
        .then(response => response.json())
        .then(data => {
            quoteText.textContent   = data.content;
            quoteAuthor.textContent = data.author;
        })
        .catch(error => {
            console.error("Could not load quote:", error);
            quoteText.textContent = "Could not load quote.";
        });
}

if (document.getElementById("quote-text")) {
    loadQuote();
}

const newQuoteBtn = document.getElementById("new-quote-btn");
if (newQuoteBtn) {
    newQuoteBtn.addEventListener("click", loadQuote);
}


/* =============================================================================
   SECTION 6: LIVE CLOCK
============================================================================= */
function updateClock() {
    const now = new Date();

    const hours   = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const clockEl = document.getElementById("clock-time");
    if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    const dateEl = document.getElementById("clock-date");
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString("en-US", {
            weekday: "long",
            year:    "numeric",
            month:   "long",
            day:     "numeric",
        });
    }
}

if (document.getElementById("clock-time")) {
    updateClock();
    setInterval(updateClock, 1000);
}

// Countdown to a sample future date
const targetDate = new Date("2026-06-12");  // Example: end of school year
function updateCountdown() {
    const now  = new Date();
    const diff = targetDate - now;
    const countdownEl = document.getElementById("countdown-container");
    if (!countdownEl) return;

    if (diff > 0) {
        const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        countdownEl.textContent =
            `${days}d ${hours}h ${minutes}m ${seconds}s until end of school year`;
    } else {
        countdownEl.textContent = "School's out!";
    }
}

if (document.getElementById("countdown-container")) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}


/* =============================================================================
   SECTION 7: VISITOR COUNTER
============================================================================= */
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

if (document.getElementById("visitor-count")) {
    trackVisit();
}


/* =============================================================================
   SECTION 8: DARK MODE TOGGLE
============================================================================= */
const toggle = document.getElementById("dark-mode-toggle");
const body   = document.body;

// Restore saved preference
if (localStorage.getItem("color-scheme") === "dark") {
    body.classList.add("dark-mode");
    if (toggle) toggle.textContent = "☀";
}

if (toggle) {
    toggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("dark-mode");
        toggle.textContent = isDark ? "☀" : "☾";
        localStorage.setItem("color-scheme", isDark ? "dark" : "light");
    });
}
