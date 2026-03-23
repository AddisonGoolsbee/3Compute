"""
Snake Game - Flask Backend SOLUTION
====================================
Complete implementation of TODOs #8 and #9.
This file is for instructor reference only.
"""

import json
import os
from datetime import date
from flask import Flask, render_template, request, jsonify
from waitress import serve

app = Flask(__name__)

SCORES_FILE = "scores.json"


# =============================================================================
# PROVIDED ROUTE
# =============================================================================

@app.route("/")
def index():
    return render_template("game.html")


# =============================================================================
# TODO #8 SOLUTION: save_score()
# =============================================================================

@app.route("/api/score", methods=["POST"])
def save_score():
    data = request.get_json()

    try:
        with open(SCORES_FILE, "r") as f:
            scores = json.load(f)
    except FileNotFoundError:
        scores = []

    scores.append({
        "name": data["name"],
        "score": data["score"],
        "date": str(date.today()),
    })

    with open(SCORES_FILE, "w") as f:
        json.dump(scores, f)

    return jsonify({"ok": True})


# =============================================================================
# TODO #9 SOLUTION: get_leaderboard()
# =============================================================================

@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    try:
        with open(SCORES_FILE, "r") as f:
            scores = json.load(f)
    except FileNotFoundError:
        scores = []

    scores.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(scores[:10])


# =============================================================================
# START THE SERVER
# =============================================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Snake is running at http://localhost:{port}")
    print("Share your public URL so others can play!")
    serve(app, host="0.0.0.0", port=port)
