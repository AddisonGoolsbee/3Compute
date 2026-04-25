# A tiny web server.
#
# Run it with `python app.py`. 3compute will print a public URL that anyone
# on the internet can open. Edit the HTML returned from `home()` below,
# save the file, and refresh the browser to see your changes (debug=True
# restarts the server automatically on every save).
#
# Press Ctrl+C in the terminal to stop the server.

from flask import Flask

app = Flask(__name__)


@app.route("/")
def home():
    return "<h1>Hello from my 3compute server!</h1>"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)
