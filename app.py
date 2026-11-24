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
import re

app = Flask(__name__)

# CORS: allow Codespaces frontend + local Vite, with credentials (cookies)
# When supports_credentials=True, browsers reject Access-Control-Allow-Origin: *
_CORS_ORIGIN_RE = re.compile(
    r"^https://[\w-]+\.app\.github\.dev$"
    r"|^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
)
CORS(
    app,
    resources={r"/api/*": {"origins": _CORS_ORIGIN_RE}},
    origins=_CORS_ORIGIN_RE,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Client-Id", "X-SP-Id"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    expose_headers=["Content-Type"],
)

app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")
app.permanent_session_lifetime = timedelta(days=7)

# Cross-site cookies between two Codespace hosts (frontend ↔ backend)
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_NAME"] = "session"

basedir = os.path.abspath(os.path.dirname(__file__))
upload_folder = os.path.join(basedir, "uploads")
os.makedirs(upload_folder, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'claims.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = upload_folder
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# ---- single SQLAlchemy instance (from models.py) ----
import models as models_module
db = models_module.db          # use the db defined in models.py
db.init_app(app)               # bind it to this Flask app

from api_routes import register_api_routes
register_api_routes(app, db, models_module)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",  # Socket.IO handles its own handshake; cookies still need SameSite=None
    manage_session=False,
)

from models import (
    Claim, Client, ServiceProvider, JobRequest, JobHistory,
    JobPhoto, Rating, Payment, Quote, Invoice, JobDecline,
)
