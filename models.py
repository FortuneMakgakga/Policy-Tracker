"""
Policy-Tracker / Home Repair Platform
Complete SQLAlchemy models – final schema

Drop-in replacement / extension for the models section in app.py
(the-_great_Unifier branch)

Requires:
    from flask_sqlalchemy import SQLAlchemy
    from werkzeug.security import generate_password_hash, check_password_hash
    from datetime import datetime
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()  # replace with your app db instance if needed


# ============================================================
# 1. IDENTITY & AUTH
# ============================================================

class Admin(db.Model):
    __tablename__ = "admin"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="admin")  # superadmin | admin
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activated_providers = db.relationship(
        "ServiceProvider",
        backref="activated_by_admin",
        foreign_keys="ServiceProvider.activated_by",
        lazy=True,
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def is_superadmin(self) -> bool:
        return self.role == "superadmin"

    def __repr__(self):
        return f"<Admin {self.email} ({self.role})>"
