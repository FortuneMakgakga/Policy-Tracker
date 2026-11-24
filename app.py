from flask import Flask, render_template, request, jsonify, send_from_directory, flash, redirect, session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_admin.actions import action
from flask_socketio import SocketIO, join_room
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
from datetime import datetime, timedelta
import pandas as pd
import os
import math
import uuid

app = Flask(__name__)


def _cors_origin(origin):
    """Allow Codespace frontends and local Vite (required when credentials=True)."""
    if not origin:
        return False
    if origin.startswith("https://") and origin.endswith(".app.github.dev"):
        return origin
    if origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1"):
        return origin
    return False


CORS(
    app,
    origins=_cors_origin,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Client-Id", "X-SP-Id"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")
app.permanent_session_lifetime = timedelta(days=7)
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True

basedir = os.path.abspath(os.path.dirname(__file__))
upload_folder = os.path.join(basedir, "uploads")
os.makedirs(upload_folder, exist_ok=True)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(basedir, "claims.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = upload_folder
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB

# ---- single SQLAlchemy instance (from models.py) ----
import models as models_module

db = models_module.db
db.init_app(app)

from api_routes import register_api_routes

register_api_routes(app, db, models_module)

socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False)

from models import (
    Claim,
    Client,
    ServiceProvider,
    JobRequest,
    JobHistory,
    JobPhoto,
    Rating,
    Payment,
    Quote,
    Invoice,
    JobDecline,
)


@app.route("/")
def home():
    return jsonify({
        "service": "Home Assist API",
        "status": "ok",
        "hint": "API routes are under /api/*",
    })


@app.route("/api/health")
def health():
    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    # host 0.0.0.0 so Codespaces port forwarding works
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False)
