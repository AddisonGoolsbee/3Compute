from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def root():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    import os
    from waitress import serve

    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 8000))

    print(f"Website is running on port {port}.")
    print("Open the Ports button (top right of the terminal) to see your available ports.")
    print(f"If {port} is not in your range, run:  PORT=<your_port> python main.py")
    print("Then assign a subdomain to that port to get your public URL.")
    serve(app, host=host, port=port)
