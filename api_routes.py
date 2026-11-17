"""
Policy-Tracker API Routes
=========================
Sectioned registration, location pings, SP activation, payout methods.

"""

from datetime import datetime
from functools import wraps
from flask import request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash


def _json():
    return request.get_json(silent=True) or {}


def _client_id():
    return session.get("client_id") or request.headers.get("X-Client-Id") or _json().get("client_id")


def _sp_id():
    return session.get("sp_id") or request.headers.get("X-SP-Id") or _json().get("sp_id")


def _admin_id():
    return session.get("admin_id")


def login_required_client(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not _client_id():
            return jsonify({"error": "Client authentication required"}), 401
        return f(*args, **kwargs)
    return wrapped


def login_required_sp(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not _sp_id():
            return jsonify({"error": "Service provider authentication required"}), 401
        return f(*args, **kwargs)
    return wrapped


def login_required_admin(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id") and session.get("user") != "admin":
            return jsonify({"error": "Admin authentication required"}), 401
        return f(*args, **kwargs)
    return wrapped


def superadmin_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        # Supports both new Admin model session and legacy hard-coded admin
        if session.get("admin_role") == "superadmin":
            return f(*args, **kwargs)
        if session.get("user") == "admin":  # legacy fallback
            return f(*args, **kwargs)
        return jsonify({"error": "Super admin privileges required"}), 403
    return wrapped


def audit(db, AuditLog, actor_type, actor_id, action, entity_type, entity_id,
          old_values=None, new_values=None, description=None):
    """Write an audit log entry."""
    try:
        entry = AuditLog(
            actor_type=actor_type,
            actor_id=actor_id or 0,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id or 0,
            old_values=old_values,
            new_values=new_values,
            description=description,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent", "")[:255],
        )
        db.session.add(entry)
        db.session.commit()
    except Exception:
        db.session.rollback()


def calc_client_strength(client, Address):
    """Simple 0-100 profile strength for a client."""
    score = 0
    if client.name:
        score += 15
    if client.email:
        score += 15
    if client.phone:
        score += 15
    if client.email_verified:
        score += 10
    if client.phone_verified:
        score += 10
    home = Address.query.filter_by(
        owner_type="client", owner_id=client.id, label="home"
    ).first()
    if home and home.latitude and home.longitude:
        score += 25
    elif home:
        score += 15
    if client.profile_complete:
        score += 10
    return min(score, 100)


def calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod):
    """Simple 0-100 profile strength for an SP."""
    score = 0
    if sp.name:
        score += 10
    if sp.email:
        score += 10
    if sp.phone:
        score += 10
    if sp.province:
        score += 5
    if sp.business_name:
        score += 5
    if sp.years_experience is not None:
        score += 5
    skills = ServiceProviderSkill.query.filter_by(service_provider_id=sp.id).count()
    score += min(skills * 5, 15)
    addr = Address.query.filter_by(owner_type="service_provider", owner_id=sp.id).count()
    if addr:
        score += 15
    payout = ServiceProviderPayoutMethod.query.filter_by(service_provider_id=sp.id).count()
    if payout:
        score += 15
    if sp.profile_complete:
        score += 10
    return min(score, 100)


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------

def register_api_routes(app, db, models):
    """
    Call this from app.py after models are defined.

    Example:
        from api_routes import register_api_routes
        register_api_routes(app, db, models_module)
    """
    Client = models.Client
    ServiceProvider = models.ServiceProvider
    Admin = models.AdminUser
    Address = models.Address
    Skill = models.Skill
    ServiceProviderSkill = models.ServiceProviderSkill
    ClientLocationHistory = models.ClientLocationHistory
    SPLocationHistory = models.SPLocationHistory
    Bank = models.Bank
    ServiceProviderPayoutMethod = models.ServiceProviderPayoutMethod
    AuditLog = models.AuditLog
    JobRequest = models.JobRequest

    # =====================================================================
    # CLIENT – Sectioned Registration
    # =====================================================================

    @app.route("/api/client/register/start", methods=["POST"])
    def client_register_start():
        """
        Step 1 – Account
        Body: { name, email, password, phone? }
        """
        data = _json()
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        phone = (data.get("phone") or "").strip() or None

        if not name or not email or not password:
            return jsonify({"error": "name, email and password are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400

        if Client.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        client = Client(
            name=name,
            email=email,
            phone=phone,
            registration_step=1,
            profile_strength=30,
        )
        client.set_password(password)
        db.session.add(client)
        db.session.commit()

        session.clear()
        session["client_id"] = client.id
        session.permanent = True

        audit(db, AuditLog, "client", client.id, "create", "client", client.id,
              description="Client registration started")

        return jsonify({
            "message": "Account created",
            "client_id": client.id,
            "registration_step": client.registration_step,
            "profile_strength": client.profile_strength,
            "next_step": 2,
        }), 201

    @app.route("/api/client/register/step/2", methods=["PUT"])
    @login_required_client
    def client_register_step2():
        """
        Step 2 – Home address (map + pin)
        Body: {
          line1, line2?, suburb?, city?, province?, postal_code?,
          latitude, longitude, formatted_address?, place_id?
        }
        """
        data = _json()
        client = db.session.get(Client, int(_client_id()))
        if not client:
            return jsonify({"error": "Client not found"}), 404

        line1 = (data.get("line1") or "").strip()
        lat = data.get("latitude")
        lng = data.get("longitude")

        if not line1:
            return jsonify({"error": "line1 (street address) is required"}), 400
        if lat is None or lng is None:
            return jsonify({"error": "latitude and longitude are required (use the map)"}), 400

        try:
            lat, lng = float(lat), float(lng)
        except (TypeError, ValueError):
            return jsonify({"error": "latitude and longitude must be numbers"}), 400

        # Upsert primary home address
        addr = Address.query.filter_by(
            owner_type="client", owner_id=client.id, label="home"
        ).first()
        if not addr:
            addr = Address(owner_type="client", owner_id=client.id, label="home", is_primary=True)
            db.session.add(addr)

        addr.line1 = line1
        addr.line2 = (data.get("line2") or "").strip() or None
        addr.suburb = (data.get("suburb") or "").strip() or None
        addr.city = (data.get("city") or "").strip() or None
        addr.province = (data.get("province") or "").strip() or None
        addr.postal_code = (data.get("postal_code") or "").strip() or None
        addr.country = data.get("country") or "South Africa"
        addr.latitude = lat
        addr.longitude = lng
        addr.formatted_address = data.get("formatted_address")
        addr.place_id = data.get("place_id")
        addr.is_primary = True

        client.registration_step = max(client.registration_step, 2)
        client.profile_strength = calc_client_strength(client, Address)
        db.session.commit()

        audit(db, AuditLog, "client", client.id, "update", "address", addr.id,
              description="Client home address saved")

        return jsonify({
            "message": "Home address saved",
            "address": addr.to_dict(),
            "registration_step": client.registration_step,
            "profile_strength": client.profile_strength,
            "next_step": 3,
        }), 200

    @app.route("/api/client/register/complete", methods=["POST"])
    @login_required_client
    def client_register_complete():
        """Mark client onboarding complete."""
        client = db.session.get(Client, int(_client_id()))
        if not client:
            return jsonify({"error": "Client not found"}), 404

        home = Address.query.filter_by(
            owner_type="client", owner_id=client.id, label="home"
        ).first()
        if not home:
            return jsonify({"error": "Home address is required before completing registration"}), 400

        client.registration_step = 3
        client.profile_complete = True
        client.onboarding_completed_at = datetime.utcnow()
        client.profile_strength = calc_client_strength(client, Address)
        db.session.commit()

        audit(db, AuditLog, "client", client.id, "update", "client", client.id,
              description="Client registration completed")

        return jsonify({
            "message": "Registration complete",
            "client_id": client.id,
            "profile_complete": True,
            "profile_strength": client.profile_strength,
        }), 200

    # Keep backward-compatible single-shot register
    @app.route("/api/client/register", methods=["POST"])
    def client_register_legacy():
        data = _json()
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        if not name or not email or not password:
            return jsonify({"error": "name, email, and password are required"}), 400
        if Client.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        client = Client(name=name, email=email, phone=data.get("phone"),
                        registration_step=1, profile_strength=30)
        client.set_password(password)
        db.session.add(client)
        db.session.commit()
        return jsonify({"message": "Client registered successfully", "client_id": client.id}), 201

    @app.route("/api/client/login", methods=["POST"])
    def client_login():
        data = _json()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        client = Client.query.filter_by(email=email).first()
        if not client or not client.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401
        if not client.is_active:
            return jsonify({"error": "Account is deactivated"}), 403

        session.clear()
        session["client_id"] = client.id
        session.permanent = True

        audit(db, AuditLog, "client", client.id, "login", "client", client.id)
        return jsonify({
            "message": "Client logged in successfully",
            "client_id": client.id,
            "name": client.name,
            "email": client.email,
            "registration_step": client.registration_step,
            "profile_complete": client.profile_complete,
            "profile_strength": client.profile_strength,
        }), 200

    @app.route("/api/client/profile", methods=["GET"])
    @login_required_client
    def client_profile():
        client = db.session.get(Client, int(_client_id()))
        if not client:
            return jsonify({"error": "Client not found"}), 404
        addresses = Address.query.filter_by(owner_type="client", owner_id=client.id).all()
        return jsonify({
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "phone": client.phone,
            "registration_step": client.registration_step,
            "profile_complete": client.profile_complete,
            "profile_strength": client.profile_strength,
            "current_latitude": client.current_latitude,
            "current_longitude": client.current_longitude,
            "addresses": [a.to_dict() for a in addresses],
        }), 200

    # =====================================================================
    # SERVICE PROVIDER – Sectioned Registration
    # =====================================================================

    @app.route("/api/sp/register/start", methods=["POST"])
    def sp_register_start():
        """
        Step 1 – Account
        Body: { name, email, password, phone }
        """
        data = _json()
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        phone = (data.get("phone") or "").strip()

        if not all([name, email, password, phone]):
            return jsonify({"error": "name, email, password and phone are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400
        if ServiceProvider.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400

        sp = ServiceProvider(
            name=name,
            email=email,
            phone=phone,
            registration_step=1,
            profile_strength=25,
            is_active=False,
            verification_status="pending",
        )
        sp.set_password(password)
        db.session.add(sp)
        db.session.commit()

        session.clear()
        session["sp_id"] = sp.id
        session.permanent = True

        audit(db, AuditLog, "service_provider", sp.id, "create", "service_provider", sp.id,
              description="SP registration started")

        return jsonify({
            "message": "Account created",
            "sp_id": sp.id,
            "registration_step": 1,
            "profile_strength": sp.profile_strength,
            "next_step": 2,
            "verification_status": sp.verification_status,
            "is_active": sp.is_active,
        }), 201

    @app.route("/api/sp/register/step/2", methods=["PUT"])
    @login_required_sp
    def sp_register_step2():
        """
        Step 2 – Business info + Home/Business address(es)
        Body: {
          business_name?, bio?, years_experience?,
          addresses: [ { label: 'home'|'business', line1, latitude, longitude, ... } ]
        }
        """
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        if "business_name" in data:
            sp.business_name = (data.get("business_name") or "").strip() or None
        if "bio" in data:
            sp.bio = data.get("bio")
        if "years_experience" in data and data["years_experience"] is not None:
            try:
                sp.years_experience = int(data["years_experience"])
            except (TypeError, ValueError):
                return jsonify({"error": "years_experience must be an integer"}), 400

        addresses_in = data.get("addresses") or []
        if not addresses_in and data.get("line1"):
            # single address convenience
            addresses_in = [data]

        saved = []
        for item in addresses_in:
            label = (item.get("label") or "home").lower()
            if label not in ("home", "business", "other"):
                label = "home"
            line1 = (item.get("line1") or "").strip()
            lat, lng = item.get("latitude"), item.get("longitude")
            if not line1 or lat is None or lng is None:
                continue
            try:
                lat, lng = float(lat), float(lng)
            except (TypeError, ValueError):
                continue

            addr = Address.query.filter_by(
                owner_type="service_provider", owner_id=sp.id, label=label
            ).first()
            if not addr:
                addr = Address(owner_type="service_provider", owner_id=sp.id, label=label)
                db.session.add(addr)

            addr.line1 = line1
            addr.line2 = (item.get("line2") or "").strip() or None
            addr.suburb = (item.get("suburb") or "").strip() or None
            addr.city = (item.get("city") or "").strip() or None
            addr.province = (item.get("province") or "").strip() or None
            addr.postal_code = (item.get("postal_code") or "").strip() or None
            addr.country = item.get("country") or "South Africa"
            addr.latitude = lat
            addr.longitude = lng
            addr.formatted_address = item.get("formatted_address")
            addr.place_id = item.get("place_id")
            addr.is_primary = label == "home" or item.get("is_primary", False)
            saved.append(addr)

            if label == "home" and addr.province:
                sp.province = addr.province

        sp.registration_step = max(sp.registration_step, 2)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()

        return jsonify({
            "message": "Business info and addresses saved",
            "addresses": [a.to_dict() for a in saved],
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": 3,
        }), 200

    @app.route("/api/sp/register/step/3", methods=["PUT"])
    @login_required_sp
    def sp_register_step3():
        """
        Step 3 – Skills + service radius + province
        Body: { skill_ids: [1,2,3], skill_names?: [...], service_radius_km?, province? }
        """
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        skill_ids = data.get("skill_ids") or []
        skill_names = data.get("skill_names") or []

        # Resolve names → ids if needed
        for name in skill_names:
            skill = Skill.query.filter_by(name=name.strip()).first()
            if skill and skill.id not in skill_ids:
                skill_ids.append(skill.id)

        if not skill_ids:
            return jsonify({"error": "At least one skill is required"}), 400

        # Clear existing and re-add
        ServiceProviderSkill.query.filter_by(service_provider_id=sp.id).delete()
        for i, sid in enumerate(skill_ids):
            skill = db.session.get(Skill, int(sid))
            if not skill:
                continue
            db.session.add(ServiceProviderSkill(
                service_provider_id=sp.id,
                skill_id=skill.id,
                is_primary=(i == 0),
            ))

        if data.get("service_radius_km") is not None:
            try:
                sp.service_radius_km = float(data["service_radius_km"])
            except (TypeError, ValueError):
                return jsonify({"error": "service_radius_km must be a number"}), 400

        if data.get("province"):
            sp.province = data["province"].strip()

        sp.registration_step = max(sp.registration_step, 3)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()

        return jsonify({
            "message": "Skills and service area saved",
            "skills": [{"id": s.skill_id, "name": s.skill.name, "is_primary": s.is_primary}
                       for s in sp.skills],
            "service_radius_km": sp.service_radius_km,
            "province": sp.province,
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": 4,
        }), 200

    @app.route("/api/sp/register/step/4", methods=["PUT"])
    @login_required_sp
    def sp_register_step4():
        """
        Step 4 – Payout method (cash or bank)
        Body: {
          method_type: 'cash' | 'bank',
          bank_id?, bank_name?, account_holder?, account_number?,
          branch_code?, account_type?
        }
        """
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        method_type = (data.get("method_type") or "").lower()
        if method_type not in ("cash", "bank"):
            return jsonify({"error": "method_type must be 'cash' or 'bank'"}), 400

        # Mark previous as non-primary
        for pm in ServiceProviderPayoutMethod.query.filter_by(service_provider_id=sp.id).all():
            pm.is_primary = False

        pm = ServiceProviderPayoutMethod(
            service_provider_id=sp.id,
            method_type=method_type,
            is_primary=True,
        )

        if method_type == "bank":
            pm.bank_id = data.get("bank_id")
            pm.bank_name = data.get("bank_name")
            pm.account_holder = data.get("account_holder")
            pm.account_number = data.get("account_number")
            pm.branch_code = data.get("branch_code")
            pm.account_type = data.get("account_type") or "cheque"
            if not pm.account_number or not (pm.bank_id or pm.bank_name):
                return jsonify({"error": "bank details (account_number + bank) are required"}), 400

        db.session.add(pm)
        sp.registration_step = max(sp.registration_step, 4)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()

        return jsonify({
            "message": "Payout method saved",
            "payout_method": {
                "id": pm.id,
                "method_type": pm.method_type,
                "bank_name": pm.bank_name,
                "is_primary": pm.is_primary,
            },
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": 5,
        }), 200

    @app.route("/api/sp/register/complete", methods=["POST"])
    @login_required_sp
    def sp_register_complete():
        """
        Final step – submit for review.
        SP stays is_active=False, verification_status='pending'
        until super admin activates.
        """
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        # Minimum requirements
        has_skill = ServiceProviderSkill.query.filter_by(service_provider_id=sp.id).count() > 0
        has_address = Address.query.filter_by(owner_type="service_provider", owner_id=sp.id).count() > 0
        has_payout = ServiceProviderPayoutMethod.query.filter_by(service_provider_id=sp.id).count() > 0

        missing = []
        if not has_skill:
            missing.append("skills")
        if not has_address:
            missing.append("address")
        if not has_payout:
            missing.append("payout method")
        if missing:
            return jsonify({"error": f"Missing required data: {', '.join(missing)}"}), 400

        sp.registration_step = 5
        sp.profile_complete = True
        sp.onboarding_completed_at = datetime.utcnow()
        sp.verification_status = "pending"
        sp.is_active = False
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()

        audit(db, AuditLog, "service_provider", sp.id, "update", "service_provider", sp.id,
              description="SP registration completed – awaiting activation")

        return jsonify({
            "message": "Registration submitted for review. A super admin will activate your account.",
            "sp_id": sp.id,
            "profile_complete": True,
            "profile_strength": sp.profile_strength,
            "verification_status": "pending",
            "is_active": False,
        }), 200

    # Legacy single-shot SP register (still works, creates pending SP)
    @app.route("/api/sp/register", methods=["POST"])
    def sp_register_legacy():
        data = _json()
        required = ["name", "email", "phone", "password"]
        if not all(data.get(k) for k in required):
            return jsonify({"error": "Missing required fields"}), 400
        if ServiceProvider.query.filter_by(email=data["email"].lower()).first():
            return jsonify({"error": "Email already registered"}), 400

        sp = ServiceProvider(
            name=data["name"],
            email=data["email"].lower(),
            phone=data["phone"],
            province=data.get("province"),
            skill=data.get("skill"),  # legacy single skill string if still on model
            latitude=float(data["latitude"]) if data.get("latitude") is not None else None,
            longitude=float(data["longitude"]) if data.get("longitude") is not None else None,
            is_active=False,
            verification_status="pending",
            registration_step=1,
        )
        # Note: older model may still have `skill` column; new model uses ServiceProviderSkill
        sp.set_password(data["password"])
        db.session.add(sp)
        db.session.commit()
        return jsonify({
            "message": "Service provider registered successfully (pending activation)",
            "sp_id": sp.id,
            "verification_status": "pending",
            "is_active": False,
        }), 201

    @app.route("/api/sp/login", methods=["POST"])
    def sp_login_api():
        data = _json()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")
        sp = ServiceProvider.query.filter_by(email=email).first()
        if not sp or not sp.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        session.clear()
        session["sp_id"] = sp.id
        session.permanent = True

        audit(db, AuditLog, "service_provider", sp.id, "login", "service_provider", sp.id)
        return jsonify({
            "message": "Service provider logged in successfully",
            "sp_id": sp.id,
            "name": sp.name,
            "email": sp.email,
            "is_active": sp.is_active,
            "verification_status": sp.verification_status,
            "registration_step": sp.registration_step,
            "profile_complete": sp.profile_complete,
            "profile_strength": sp.profile_strength,
        }), 200

    # =====================================================================
    # LOCATION PINGS
    # =====================================================================

    @app.route("/api/client/location", methods=["POST"])
    @login_required_client
    def client_location_ping():
        """
        Body: { latitude, longitude, accuracy_m?, event?, job_request_id? }
        """
        data = _json()
        try:
            lat = float(data["latitude"])
            lng = float(data["longitude"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "latitude and longitude are required numbers"}), 400

        client_id = int(_client_id())
        client = db.session.get(Client, client_id)
        if not client:
            return jsonify({"error": "Client not found"}), 404

        entry = ClientLocationHistory(
            client_id=client_id,
            latitude=lat,
            longitude=lng,
            accuracy_m=data.get("accuracy_m"),
            source=data.get("source", "app"),
            recorded_at=datetime.utcnow(),
            job_request_id=data.get("job_request_id"),
            event=data.get("event", "heartbeat"),
        )
        db.session.add(entry)

        client.current_latitude = lat
        client.current_longitude = lng
        client.current_location_at = entry.recorded_at
        db.session.commit()

        return jsonify({"message": "Location recorded", "recorded_at": entry.recorded_at.isoformat()}), 201

    @app.route("/api/sp/location", methods=["POST"])
    @login_required_sp
    def sp_location_ping():
        """
        Body: { latitude, longitude, accuracy_m?, event?, job_request_id? }
        Events: heartbeat | assigned | accepted | arrived | completed
        """
        data = _json()
        try:
            lat = float(data["latitude"])
            lng = float(data["longitude"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "latitude and longitude are required numbers"}), 400

        sp_id = int(_sp_id())
        sp = db.session.get(ServiceProvider, sp_id)
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        entry = SPLocationHistory(
            service_provider_id=sp_id,
            latitude=lat,
            longitude=lng,
            accuracy_m=data.get("accuracy_m"),
            source=data.get("source", "app"),
            recorded_at=datetime.utcnow(),
            job_request_id=data.get("job_request_id"),
            event=data.get("event", "heartbeat"),
        )
        db.session.add(entry)

        sp.current_latitude = lat
        sp.current_longitude = lng
        sp.current_location_at = entry.recorded_at
        db.session.commit()

        return jsonify({"message": "Location recorded", "recorded_at": entry.recorded_at.isoformat()}), 201

    # =====================================================================
    # SUPER ADMIN – SP Activation
    # =====================================================================

    @app.route("/api/admin/sp/pending", methods=["GET"])
    @login_required_admin
    def admin_list_pending_sps():
        pending = ServiceProvider.query.filter_by(
            verification_status="pending", profile_complete=True
        ).order_by(ServiceProvider.created_at.desc()).all()

        result = []
        for sp in pending:
            skills = [s.skill.name for s in sp.skills if s.skill]
            result.append({
                "id": sp.id,
                "name": sp.name,
                "email": sp.email,
                "phone": sp.phone,
                "business_name": sp.business_name,
                "province": sp.province,
                "skills": skills,
                "profile_strength": sp.profile_strength,
                "created_at": sp.created_at.isoformat() if sp.created_at else None,
                "onboarding_completed_at": sp.onboarding_completed_at.isoformat() if sp.onboarding_completed_at else None,
            })
        return jsonify(result), 200

    @app.route("/api/admin/sp/<int:sp_id>/activate", methods=["POST"])
    @superadmin_required
    def admin_activate_sp(sp_id):
        """Super admin activates an SP – they can now receive jobs."""
        sp = db.session.get(ServiceProvider, sp_id)
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        old = {"verification_status": sp.verification_status, "is_active": sp.is_active}
        sp.verification_status = "approved"
        sp.is_active = True
        sp.activated_at = datetime.utcnow()
        sp.activated_by = session.get("admin_id")
        db.session.commit()

        audit(db, AuditLog, "admin", session.get("admin_id") or 0, "activate",
              "service_provider", sp.id, old_values=old,
              new_values={"verification_status": "approved", "is_active": True},
              description=f"SP {sp.email} activated")

        return jsonify({
            "message": "Service provider activated",
            "sp_id": sp.id,
            "verification_status": "approved",
            "is_active": True,
            "activated_at": sp.activated_at.isoformat(),
        }), 200

    @app.route("/api/admin/sp/<int:sp_id>/reject", methods=["POST"])
    @superadmin_required
    def admin_reject_sp(sp_id):
        data = _json()
        reason = data.get("reason", "")
        sp = db.session.get(ServiceProvider, sp_id)
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404

        old = {"verification_status": sp.verification_status, "is_active": sp.is_active}
        sp.verification_status = "rejected"
        sp.is_active = False
        db.session.commit()

        audit(db, AuditLog, "admin", session.get("admin_id") or 0, "reject",
              "service_provider", sp.id, old_values=old,
              new_values={"verification_status": "rejected", "is_active": False},
              description=f"SP {sp.email} rejected. Reason: {reason}")

        return jsonify({
            "message": "Service provider rejected",
            "sp_id": sp.id,
            "verification_status": "rejected",
            "is_active": False,
        }), 200

    # =====================================================================
    # LOOKUPS (skills, banks)
    # =====================================================================

    @app.route("/api/skills", methods=["GET"])
    def list_skills():
        skills = Skill.query.filter_by(is_active=True).order_by(Skill.name).all()
        return jsonify([{"id": s.id, "name": s.name, "category": s.category} for s in skills]), 200

    @app.route("/api/banks", methods=["GET"])
    def list_banks():
        banks = Bank.query.filter_by(is_active=True).order_by(Bank.name).all()
        return jsonify([{"id": b.id, "name": b.name, "universal_branch_code": b.universal_branch_code}
                        for b in banks]), 200

    # =====================================================================
    # SP Payout methods (manage after registration)
    # =====================================================================

    @app.route("/api/sp/payout-methods", methods=["GET"])
    @login_required_sp
    def sp_list_payout_methods():
        methods = ServiceProviderPayoutMethod.query.filter_by(
            service_provider_id=int(_sp_id())
        ).all()
        return jsonify([{
            "id": m.id,
            "method_type": m.method_type,
            "bank_name": m.bank_name,
            "account_holder": m.account_holder,
            "account_number": m.account_number[-4:].rjust(len(m.account_number or ""), "*") if m.account_number else None,
            "branch_code": m.branch_code,
            "account_type": m.account_type,
            "is_primary": m.is_primary,
            "is_verified": m.is_verified,
        } for m in methods]), 200

    @app.route("/api/sp/payout-methods", methods=["POST"])
    @login_required_sp
    def sp_add_payout_method():
        data = _json()
        method_type = (data.get("method_type") or "").lower()
        if method_type not in ("cash", "bank"):
            return jsonify({"error": "method_type must be 'cash' or 'bank'"}), 400

        sp_id = int(_sp_id())
        if data.get("is_primary"):
            for m in ServiceProviderPayoutMethod.query.filter_by(service_provider_id=sp_id).all():
                m.is_primary = False

        pm = ServiceProviderPayoutMethod(
            service_provider_id=sp_id,
            method_type=method_type,
            bank_id=data.get("bank_id"),
            bank_name=data.get("bank_name"),
            account_holder=data.get("account_holder"),
            account_number=data.get("account_number"),
            branch_code=data.get("branch_code"),
            account_type=data.get("account_type"),
            is_primary=bool(data.get("is_primary", True)),
        )
        db.session.add(pm)
        db.session.commit()
        return jsonify({"message": "Payout method added", "id": pm.id}), 201

    # =====================================================================
    # ADMIN LOGIN (new model + legacy compatibility)
    # =====================================================================

    @app.route("/api/admin/login", methods=["POST"])
    def admin_login_api():
        data = _json()
        email = (data.get("email") or data.get("username") or "").strip().lower()
        password = data.get("password")

        # Try new Admin table first
        admin = Admin.query.filter_by(email=email).first()
        if admin and admin.check_password(password) and admin.is_active:
            session.clear()
            session["admin_id"] = admin.id
            session["admin_role"] = admin.role
            session["user"] = "admin"  # legacy compatibility
            session.permanent = True
            admin.last_login_at = datetime.utcnow()
            db.session.commit()
            audit(db, AuditLog, "admin", admin.id, "login", "admin", admin.id)
            return jsonify({
                "message": "Admin logged in",
                "admin_id": admin.id,
                "name": admin.name,
                "role": admin.role,
            }), 200

        # Legacy hard-coded fallback (remove once real admins exist)
        if email in ("admin", "admin@local") and password == "admin123":
            session.clear()
            session["user"] = "admin"
            session["admin_role"] = "superadmin"
            session.permanent = True
            return jsonify({
                "message": "Admin logged in (legacy)",
                "role": "superadmin",
            }), 200

        return jsonify({"error": "Invalid credentials"}), 401

    print("✓ API routes registered (registration, location, activation, payouts)")
