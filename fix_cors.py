#!/usr/bin/env python3
"""Run once in the backend Codespace to fix CORS for the frontend Codespace."""
from pathlib import Path

path = Path("app.py")
text = path.read_text()

if "_CORS_ORIGINS" in text or "SESSION_COOKIE_SAMESITE" in text:
    print("CORS already patched")
    raise SystemExit(0)

if "import re\n" not in text.split("app = Flask")[0]:
    text = text.replace("import uuid\n", "import uuid\nimport re\n", 1)

old = """app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'supersecretkey'
app.permanent_session_lifetime = timedelta(minutes=30)"""

new = """app = Flask(__name__)

# Cross-origin API from Codespaces Vite (credentials require explicit origins, not *)
_CORS_ORIGINS = re.compile(
    r'^https://[\\w-]+\\.app\\.github\\.dev$|^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$'
)
CORS(
    app,
    origins=_CORS_ORIGINS,
    supports_credentials=True,
    allow_headers=['Content-Type', 'Authorization', 'X-Client-Id', 'X-SP-Id'],
    methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
)
app.secret_key = os.environ.get('SECRET_KEY', 'supersecretkey')
app.permanent_session_lifetime = timedelta(days=7)
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True"""

if old not in text:
    print("ERROR: expected CORS block not found — restore app.py from git first:")
    print("  git checkout 58f2097fe42c46f1a1e11d14d94fe9c36637c0be -- app.py")
    raise SystemExit(1)

path.write_text(text.replace(old, new, 1))
print("Patched app.py — restart the Flask server")
