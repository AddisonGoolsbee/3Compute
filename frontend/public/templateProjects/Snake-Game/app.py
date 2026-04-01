"""
Snake Game - Flask Backend
==========================

This file does two things:
  1. Serves the game on a port you choose (see the Ports button for available ports)
  2. Provides a leaderboard API so players can save and view high scores.

YOUR TASKS:
  TODO #8: Implement save_score() - POST /api/score
  TODO #9: Implement get_leaderboard() - GET /api/leaderboard

Run the game: python app.py
Then assign a subdomain to the port via the Ports button (top right of the terminal).
"""

import json
import os
from datetime import date
from flask import Flask, render_template, request, jsonify
from waitress import serve

app = Flask(__name__)

SCORES_FILE = "scores.json"


# =============================================================================
# PROVIDED ROUTE - Serves the game page
# =============================================================================

@app.route("/")
def index():
    return render_template("game.html")


# =============================================================================
# TODO #8: SAVE A SCORE
# =============================================================================

@app.route("/api/score", methods=["POST"])
def save_score():
    """
    Accept a score submission and save it to scores.json.

    The request body is JSON with two fields:
        { "name": "Alice", "score": 42 }

    Steps:
        1. Parse the JSON body using request.get_json()
        2. Load the existing scores from SCORES_FILE
           - If the file does not exist yet, start with an empty list
        3. Append a new entry: { "name": ..., "score": ..., "date": today's date as a string }
           - Use str(date.today()) for the date
        4. Save the updated list back to SCORES_FILE
        5. Return {"ok": True} as JSON

    HINT: Use json.load() / json.dump() to read and write the file.
    HINT: Wrap file reading in a try/except FileNotFoundError to handle the
          case where scores.json doesn't exist yet.
    """
    # TODO: Implement this route
    return jsonify({"ok": False, "error": "Not implemented yet"}), 501


# =============================================================================
# TODO #9: GET THE LEADERBOARD
# =============================================================================

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    """
    Return the top 10 scores as JSON.

    Steps:
        1. Load scores from SCORES_FILE
           - If the file does not exist, return an empty list
        2. Sort the scores by "score" descending (highest first)
        3. Return only the top 10 entries
        4. Return the list as JSON

    Each entry looks like: { "name": "Alice", "score": 42, "date": "2025-01-15" }

    HINT: list.sort(key=lambda x: x["score"], reverse=True)
    """
    # TODO: Implement this route
    return jsonify([])


# =============================================================================
# START THE SERVER
# =============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Snake is running on port {port}.")
    print("Open the Ports button (top right of the terminal) to see your available ports.")
    print(f"If {port} is not in your range, set PORT=<your_port> before running, e.g.:")
    print(f"  PORT=10000 python app.py")
    print(f"Then assign a subdomain to that port to get your public URL.")
    serve(app, host="0.0.0.0", port=port)
