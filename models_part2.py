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
