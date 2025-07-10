from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def root():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    from waitress import serve

    host = "0.0.0.0"
    port = 8000

    print(f"🚀 Website is up! Listening on http://{host}:{port}")
    serve(app, host=host, port=port)
