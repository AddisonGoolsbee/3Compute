"""
Snake Game - Flask Backend
==========================

This file does two things:
  1. Serves the game at http://localhost:5000/
  2. Provides a leaderboard API so players can save and view high scores.

YOUR TASKS:
  TODO #8: Implement save_score() - POST /api/score
  TODO #9: Implement get_leaderboard() - GET /api/leaderboard

Run the game: python app.py
Then open the URL printed in the terminal.
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
    pass


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
    pass


# =============================================================================
# START THE SERVER
# =============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Snake is running at http://localhost:{port}")
    print("Share your public URL so others can play!")
    serve(app, host="0.0.0.0", port=port)
