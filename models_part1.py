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


class Client(db.Model):
    __tablename__ = "client"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(50))
    password_hash = db.Column(db.String(255), nullable=False)

    registration_step = db.Column(db.Integer, nullable=False, default=1)
    profile_complete = db.Column(db.Boolean, nullable=False, default=False)
    profile_strength = db.Column(db.Integer, nullable=False, default=0)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    phone_verified = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    onboarding_completed_at = db.Column(db.DateTime)

    current_latitude = db.Column(db.Float)
    current_longitude = db.Column(db.Float)
    current_location_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = db.relationship(
        "JobRequest",
        backref="client",
        lazy=True,
        foreign_keys="JobRequest.client_id",
    )
    location_history = db.relationship(
        "ClientLocationHistory",
        backref="client",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def primary_home_address(self):
        return (
            Address.query.filter_by(
                owner_type="client", owner_id=self.id, label="home", is_primary=True
            ).first()
            or Address.query.filter_by(
                owner_type="client", owner_id=self.id, label="home"
            ).first()
        )

    def __repr__(self):
        return f"<Client {self.email}>"


class ServiceProvider(db.Model):
    __tablename__ = "service_provider"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    business_name = db.Column(db.String(200))
    bio = db.Column(db.Text)
    years_experience = db.Column(db.Integer)

    is_available = db.Column(db.Boolean, nullable=False, default=True)
    service_radius_km = db.Column(db.Float, default=20.0)
    province = db.Column(db.String(100))

    registration_step = db.Column(db.Integer, nullable=False, default=1)
    profile_complete = db.Column(db.Boolean, nullable=False, default=False)
    profile_strength = db.Column(db.Integer, nullable=False, default=0)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    phone_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_status = db.Column(db.String(30), nullable=False, default="pending")
    is_active = db.Column(db.Boolean, nullable=False, default=False)
    activated_at = db.Column(db.DateTime)
    activated_by = db.Column(db.Integer, db.ForeignKey("admin.id"))
    onboarding_completed_at = db.Column(db.DateTime)

    current_latitude = db.Column(db.Float)
    current_longitude = db.Column(db.Float)
    current_location_at = db.Column(db.DateTime)
    last_assigned_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = db.relationship(
        "JobRequest",
        backref=db.backref("assigned_provider", lazy=True),
        lazy=True,
        foreign_keys="JobRequest.assigned_sp_id",
    )
    ratings = db.relationship("Rating", backref="provider", lazy=True)
    payments = db.relationship("Payment", backref="provider", lazy=True)
    skills = db.relationship(
        "ServiceProviderSkill",
        backref="service_provider",
        lazy=True,
        cascade="all, delete-orphan",
    )
    location_history = db.relationship(
        "SPLocationHistory",
        backref="service_provider",
        lazy=True,
        cascade="all, delete-orphan",
    )
    payout_methods = db.relationship(
        "ServiceProviderPayoutMethod",
        backref="service_provider",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def can_receive_jobs(self) -> bool:
        return (
            self.is_active
            and self.verification_status == "approved"
            and self.is_available
            and self.profile_complete
        )

    def primary_skill_names(self):
        return [sps.skill.name for sps in self.skills if sps.skill]

    def __repr__(self):
        return f"<ServiceProvider {self.email} active={self.is_active}>"
