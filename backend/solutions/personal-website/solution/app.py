"""
My Website: SOLUTION (Instructor Reference)
=============================================

This is the complete, working version of app.py with all eight sections
implemented. Use this to check student work or debug common issues.

Do not distribute to students before they've had a chance to build each section.
"""

from flask import Flask, render_template, jsonify, request
import requests as http_requests
import os

app = Flask(__name__)


# =============================================================================
# SECTION 1: HOME PAGE
# =============================================================================

@app.route("/")
def index():
    return render_template("index.html")


# =============================================================================
# SECTION 4: SKILLS API
# =============================================================================

@app.route("/api/skills")
def get_skills():
    skills = [
        {"skill": "Python",        "level": 82},
        {"skill": "HTML / CSS",    "level": 70},
        {"skill": "JavaScript",    "level": 55},
        {"skill": "Problem Solving","level": 80},
        {"skill": "Git",           "level": 60},
    ]
    return jsonify(skills)


# =============================================================================
# SECTION 5: QUOTE OF THE DAY
# =============================================================================

@app.route("/quote")
def get_quote():
    try:
        response = http_requests.get(
            "https://dummyjson.com/quotes/random", timeout=5
        )
        response.raise_for_status()
        data = response.json()
        return jsonify({
            "content": data["quote"],
            "author":  data["author"],
        })
    except Exception:
        # Fallback so the page always shows something
        return jsonify({
            "content": "The only way to do great work is to love what you do.",
            "author":  "Steve Jobs",
        })


# =============================================================================
# SECTION 7: VISITOR COUNTER
# =============================================================================

COUNTER_FILE = "counter.txt"


def _read_count():
    if os.path.exists(COUNTER_FILE):
        with open(COUNTER_FILE, "r") as f:
            return int(f.read().strip() or "0")
    return 0


def _write_count(count):
    with open(COUNTER_FILE, "w") as f:
        f.write(str(count))


@app.route("/api/visitors", methods=["GET", "POST"])
def visitors():
    count = _read_count()
    if request.method == "POST":
        count += 1
        _write_count(count)
    return jsonify({"count": count})


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
