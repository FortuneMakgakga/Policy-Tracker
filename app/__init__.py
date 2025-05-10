import json
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

# Load configuration from config.json
with open("config.json") as config_file:
    config = json.load(config_file)

app = Flask(__name__)
app.config.update(config)
CORS(app, resources={r"/*": {"origins": app.config["CORS_ALLOWED_ORIGINS"]}})
socketio = SocketIO(app, cors_allowed_origins=app.config["CORS_ALLOWED_ORIGINS"])
