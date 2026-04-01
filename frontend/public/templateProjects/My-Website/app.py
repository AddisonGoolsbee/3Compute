"""
My Website - Personal Portfolio
================================

You're building a real website. By the time you finish all eight sections,
you'll have something you can share with anyone: friends, family, future
employers. It lives on a real server and has a real URL.

This file is the Flask backend. Flask receives requests from the browser
and sends back responses. Some routes serve HTML pages. Others return
data as JSON. Those are your APIs.

HOW TO RUN:
    pip install -r requirements.txt
    python app.py

Then click the Ports button (top right of the terminal), assign a subdomain to port 8000, and open your public URL.

YOUR TASKS (in order):
    Section 2  - About Me (HTML/CSS only, no Python changes needed)
    Section 3  - My Projects (HTML/CSS only)
    Section 4  - TODO: Add /api/skills route (returns JSON)
    Section 5  - TODO: Add /quote route (fetches external API)
    Section 6  - Live Clock (JavaScript only, no Python changes needed)
    Section 7  - TODO: Add /api/visitors GET and POST routes
    Section 8  - Dark Mode (JavaScript/CSS only, no Python changes needed)

Run the tests to check your routes: python test_website.py
"""

from flask import Flask, render_template, jsonify, request
import requests as http_requests
import json
import os

app = Flask(__name__)


# =============================================================================
# SECTION 1: HOME PAGE (PROVIDED)
# =============================================================================

@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


# =============================================================================
# TODO SECTION 4: SKILLS API
# =============================================================================
# Add a route that returns your skills as JSON.
#
# The URL should be: /api/skills
# The method should be: GET
# It should return a JSON list of objects, each with "skill" and "level" keys.
# "level" is a number from 0 to 100 representing how confident you feel.
#
# Example response:
#   [
#     {"skill": "Python", "level": 80},
#     {"skill": "HTML/CSS", "level": 65},
#     {"skill": "JavaScript", "level": 50}
#   ]
#
# YOUR TURN: Change the skills and levels to reflect YOUR actual skills.
# Add anything you want: school subjects, hobbies, tools, whatever.
#
# @app.route("/api/skills")
# def get_skills():
#     skills = [
#         {"skill": "Python", "level": 80},
#         {"skill": "HTML/CSS", "level": 65},
#         {"skill": "JavaScript", "level": 50},
#         {"skill": "Problem Solving", "level": 75},
#     ]
#     return jsonify(skills)


# =============================================================================
# TODO SECTION 5: QUOTE OF THE DAY
# =============================================================================
# Add a route that fetches a random quote from an external API and returns it.
#
# The URL should be: /quote
# The method should be: GET
# It should return a JSON object with "content" and "author" keys.
#
# We use the backend as a middleman so the browser doesn't have to deal with
# CORS (cross-origin request) restrictions. The flow is:
#   Browser --> your Flask server --> quote API --> your Flask server --> Browser
#
# Primary API (try this first):
#   https://dummyjson.com/quotes/random
#   Returns: {"id": ..., "quote": "...", "author": "..."}
#
# Your route should normalize the response to always return:
#   {"content": "...", "author": "..."}
#
# HINT: Use the `http_requests` variable (already imported at the top).
#       It's the `requests` library renamed to avoid conflicting with Flask's
#       `request` object.
#
# @app.route("/quote")
# def get_quote():
#     try:
#         response = http_requests.get("https://dummyjson.com/quotes/random", timeout=5)
#         data = response.json()
#         return jsonify({
#             "content": data["quote"],
#             "author": data["author"]
#         })
#     except Exception as e:
#         return jsonify({
#             "content": "The only way to do great work is to love what you do.",
#             "author": "Steve Jobs"
#         })


# =============================================================================
# TODO SECTION 7: VISITOR COUNTER
# =============================================================================
# Add two routes that track how many people have visited the site.
#
# GET  /api/visitors  --> return the current count as JSON: {"count": 42}
# POST /api/visitors  --> increment the count, return new count: {"count": 43}
#
# Store the count in a file called "counter.txt" so it survives server restarts.
# If the file doesn't exist yet, start at 0.
#
# HINT: Use open(), int(), and str() to read and write the file.
#       Use request.method to check if the request is GET or POST.
#
# @app.route("/api/visitors", methods=["GET", "POST"])
# def visitors():
#     counter_file = "counter.txt"
#
#     # Read current count
#     if os.path.exists(counter_file):
#         with open(counter_file, "r") as f:
#             count = int(f.read().strip())
#     else:
#         count = 0
#
#     if request.method == "POST":
#         count += 1
#         with open(counter_file, "w") as f:
#             f.write(str(count))
#
#     return jsonify({"count": count})


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    port = 8000
    print("=" * 50)
    print(f"  Your website is running on port {port}.")
    print("  To share it: click the Ports button (top right of the terminal),")
    print(f"  assign a subdomain to port {port},")
    print("  then share https://yoursubdomain.app.3compute.org")
    print("=" * 50)
    app.run(host="0.0.0.0", port=port, debug=True)
