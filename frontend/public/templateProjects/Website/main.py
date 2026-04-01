from flask import Flask, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")


@app.route("/")
def root():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    from waitress import serve

    host = "0.0.0.0"
    port = 8000

    print(f"Website is running on port {port}.")
    print(f"To share it: click the Ports button (top right of the terminal), assign a subdomain to port {port},")
    print("then your public URL will be https://yoursubdomain.app.3compute.org")
    serve(app, host=host, port=port)
