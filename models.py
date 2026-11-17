# Full models.py lives in project artifacts and can be rebuilt with:
#   cat models_part1.py models_part2.py models_part3.py > models.py
#
# See MODELS_ASSEMBLY.md
#
# After rebuild, point models.db at your app's SQLAlchemy instance.
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

class AdminUser(db.Model):
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
        return f"<AdminUser {self.email} ({self.role})>"


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

class Address(db.Model):
    __tablename__ = "address"

    id = db.Column(db.Integer, primary_key=True)
    owner_type = db.Column(db.String(20), nullable=False)  # 'client' | 'service_provider'
    owner_id = db.Column(db.Integer, nullable=False)

    label = db.Column(db.String(50), nullable=False)  # 'home' | 'business' | 'other'
    line1 = db.Column(db.String(255), nullable=False)
    line2 = db.Column(db.String(255))
    suburb = db.Column(db.String(100))
    city = db.Column(db.String(100))
    province = db.Column(db.String(100))
    postal_code = db.Column(db.String(20))
    country = db.Column(db.String(50), default="South Africa")

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    formatted_address = db.Column(db.String(500))
    place_id = db.Column(db.String(255))

    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.Index("ix_address_owner", "owner_type", "owner_id"),
        db.Index("ix_address_province", "province"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "line1": self.line1,
            "line2": self.line2,
            "suburb": self.suburb,
            "city": self.city,
            "province": self.province,
            "postal_code": self.postal_code,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "formatted_address": self.formatted_address,
            "is_primary": self.is_primary,
        }

    def __repr__(self):
        return f"<Address {self.label} {self.line1}>"


class Skill(db.Model):
    __tablename__ = "skill"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    providers = db.relationship("ServiceProviderSkill", backref="skill", lazy=True)

    def __repr__(self):
        return f"<Skill {self.name}>"


class ServiceProviderSkill(db.Model):
    __tablename__ = "service_provider_skill"

    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(
        db.Integer, db.ForeignKey("service_provider.id"), nullable=False
    )
    skill_id = db.Column(db.Integer, db.ForeignKey("skill.id"), nullable=False)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("service_provider_id", "skill_id", name="uq_sp_skill"),
    )

    def __repr__(self):
        return f"<SPSkill sp={self.service_provider_id} skill={self.skill_id}>"


class ClientLocationHistory(db.Model):
    __tablename__ = "client_location_history"

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("client.id"), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy_m = db.Column(db.Float)
    source = db.Column(db.String(30), default="app")
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"))
    event = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index("ix_client_loc_client_time", "client_id", "recorded_at"),
        db.Index("ix_client_loc_job", "job_request_id"),
    )

    def __repr__(self):
        return f"<ClientLoc client={self.client_id} @ {self.recorded_at}>"


class SPLocationHistory(db.Model):
    __tablename__ = "sp_location_history"

    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(
        db.Integer, db.ForeignKey("service_provider.id"), nullable=False
    )
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy_m = db.Column(db.Float)
    source = db.Column(db.String(30), default="app")
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"))
    event = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index("ix_sp_loc_sp_time", "service_provider_id", "recorded_at"),
        db.Index("ix_sp_loc_job", "job_request_id"),
    )

    def __repr__(self):
        return f"<SPLoc sp={self.service_provider_id} @ {self.recorded_at}>"


class Bank(db.Model):
    __tablename__ = "bank"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    universal_branch_code = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Bank {self.name}>"


class ServiceProviderPayoutMethod(db.Model):
    __tablename__ = "service_provider_payout_method"

    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(
        db.Integer, db.ForeignKey("service_provider.id"), nullable=False
    )
    method_type = db.Column(db.String(20), nullable=False)  # 'bank' | 'cash'
    bank_id = db.Column(db.Integer, db.ForeignKey("bank.id"))
    bank_name = db.Column(db.String(100))
    account_holder = db.Column(db.String(150))
    account_number = db.Column(db.String(50))
    branch_code = db.Column(db.String(20))
    account_type = db.Column(db.String(30))
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bank = db.relationship("Bank", lazy=True)

    def __repr__(self):
        return f"<PayoutMethod sp={self.service_provider_id} type={self.method_type}>"


class JobRequest(db.Model):
    __tablename__ = "job_request"

    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey("client.id"), nullable=True)
    client_name = db.Column(db.Text, nullable=False)
    client_phone = db.Column(db.String(50))
    client_address = db.Column(db.String(255))

    location_type = db.Column(db.String(20), nullable=False, default="home")  # home | other
    client_address_id = db.Column(db.Integer, db.ForeignKey("address.id"))
    job_latitude = db.Column(db.Float)
    job_longitude = db.Column(db.Float)
    job_address_text = db.Column(db.String(500))

    job_description = db.Column(db.Text, nullable=False)
    skill_required = db.Column(db.String(100), nullable=False)
    appointment_time = db.Column(db.DateTime, nullable=False)
    province = db.Column(db.String(100), nullable=False)

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    assigned_sp_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"))

    status = db.Column(db.String(50), default="Open")
    stage = db.Column(db.String(50), default="new")

    pause_reason = db.Column(db.Text)
    completion_notes = db.Column(db.Text)
    declined_sps = db.Column(db.Text, default="")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_at = db.Column(db.DateTime)
    accepted_at = db.Column(db.DateTime)
    arrived_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    paused_at = db.Column(db.DateTime)
    resumed_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    client_address_rel = db.relationship("Address", foreign_keys=[client_address_id], lazy=True)
    photos = db.relationship("JobPhoto", backref="job_request", lazy=True)
    history = db.relationship("JobHistory", backref="job_request", lazy=True)

    def __repr__(self):
        return f"<JobRequest {self.id} {self.status}/{self.stage}>"


class JobDecline(db.Model):
    __tablename__ = "job_decline"
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("job_request.id"))
    sp_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class JobHistory(db.Model):
    __tablename__ = "job_history"
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("job_request.id"), nullable=False)
    sp_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class JobPhoto(db.Model):
    __tablename__ = "job_photo"
    id = db.Column(db.Integer, primary_key=True)
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)


class Rating(db.Model):
    __tablename__ = "rating"
    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"))
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"))
    score = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    __tablename__ = "payment"
    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"))
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"))
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Quote(db.Model):
    __tablename__ = "quote"
    id = db.Column(db.Integer, primary_key=True)
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("client.id"), nullable=False)
    service_provider_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"), nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    details = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Invoice(db.Model):
    __tablename__ = "invoice"
    id = db.Column(db.Integer, primary_key=True)
    job_request_id = db.Column(db.Integer, db.ForeignKey("job_request.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("client.id"), nullable=False)
    service_provider_id = db.Column(db.Integer, db.ForeignKey("service_provider.id"), nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    details = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="Unpaid")
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)


class Claim(db.Model):
    __tablename__ = "claim"
    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.String(100))
    claim_type = db.Column(db.String(50))
    incident_date = db.Column(db.String(50))
    incident_location = db.Column(db.String(100))
    description = db.Column(db.Text)
    claim_amount = db.Column(db.Float)
    status = db.Column(db.String(50), default="Pending")
    claimant_name = db.Column(db.String(100))
    contact_number = db.Column(db.String(50))
    email = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AuditLog(db.Model):
    __tablename__ = "audit_log"
    id = db.Column(db.Integer, primary_key=True)
    actor_type = db.Column(db.String(20), nullable=False)
    actor_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    description = db.Column(db.String(500))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.Index("ix_audit_actor", "actor_type", "actor_id"),
        db.Index("ix_audit_entity", "entity_type", "entity_id"),
        db.Index("ix_audit_created", "created_at"),
    )

    def __repr__(self):
        return f"<AuditLog {self.action} {self.entity_type}:{self.entity_id}>"


class VerificationDocument(db.Model):
    __tablename__ = "verification_document"
    id = db.Column(db.Integer, primary_key=True)
    owner_type = db.Column(db.String(20), nullable=False)
    owner_id = db.Column(db.Integer, nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(30), default="pending")
    reviewed_by = db.Column(db.Integer, db.ForeignKey("admin.id"))
    reviewed_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewer = db.relationship("AdminUser", foreign_keys=[reviewed_by], lazy=True)


SA_BANKS = [
    ("Absa", "632005"),
    ("Capitec", "470010"),
    ("FNB", "250655"),
    ("Nedbank", "198765"),
    ("Standard Bank", "051001"),
    ("African Bank", "430000"),
    ("Discovery Bank", "679000"),
    ("TymeBank", "678910"),
    ("Investec", "580105"),
    ("Bidvest Bank", "462005"),
]


def seed_banks(db_session):
    for name, code in SA_BANKS:
        if not Bank.query.filter_by(name=name).first():
            db_session.add(Bank(name=name, universal_branch_code=code))
    db_session.commit()


def seed_skills(db_session, skills=None):
    default_skills = skills or [
        ("Plumbing", "Home"),
        ("Electrical", "Home"),
        ("Carpentry", "Home"),
        ("Painting", "Home"),
        ("Tiling", "Home"),
        ("Roofing", "Home"),
        ("HVAC", "Home"),
        ("Appliance Repair", "Home"),
        ("Locksmith", "Home"),
        ("General Handyman", "Home"),
        ("Gardening", "Outdoor"),
        ("Cleaning", "Home"),
    ]
    for name, category in default_skills:
        if not Skill.query.filter_by(name=name).first():
            db_session.add(Skill(name=name, category=category))
    db_session.commit()
