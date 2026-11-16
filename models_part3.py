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
    reviewer = db.relationship("Admin", foreign_keys=[reviewed_by], lazy=True)


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
