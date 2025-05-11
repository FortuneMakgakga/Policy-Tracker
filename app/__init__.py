import json
import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

def create_app():
    # Load configuration from config.json
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.json')
    with open(config_path) as config_file:
        config = json.load(config_file)

    app = Flask(__name__)
    app.config.update(config)
    CORS(app, resources={r"/*": {"origins": app.config.get("CORS_ALLOWED_ORIGINS", "*")}})
    socketio = SocketIO(app, cors_allowed_origins=app.config.get("CORS_ALLOWED_ORIGINS", "*"))

    return app, socketio
