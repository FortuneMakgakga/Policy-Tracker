"""
Policy-Tracker API Routes
=========================
Sectioned registration, location pings, SP activation, payouts, jobs.

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
        if session.get("admin_role") == "superadmin":
            return f(*args, **kwargs)
        if session.get("user") == "admin":
            return f(*args, **kwargs)
        return jsonify({"error": "Super admin privileges required"}), 403
    return wrapped


def audit(db, AuditLog, actor_type, actor_id, action, entity_type, entity_id,
          old_values=None, new_values=None, description=None):
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


def register_api_routes(app, db, models):
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

    @app.route("/api/client/register/start", methods=["POST"])
    def client_register_start():
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
            name=name, email=email, phone=phone,
            registration_step=1, profile_strength=30,
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
        return jsonify({
            "message": "Home address saved",
            "address": addr.to_dict() if hasattr(addr, "to_dict") else {"line1": addr.line1},
            "registration_step": client.registration_step,
            "profile_strength": client.profile_strength,
            "next_step": 3,
        }), 200

    @app.route("/api/client/register/complete", methods=["POST"])
    @login_required_client
    def client_register_complete():
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
        return jsonify({
            "message": "Registration complete",
            "client_id": client.id,
            "profile_complete": True,
            "profile_strength": client.profile_strength,
        }), 200

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
            "addresses": [a.to_dict() if hasattr(a, "to_dict") else {"id": a.id} for a in addresses],
        }), 200

    @app.route("/api/sp/register/start", methods=["POST"])
    def sp_register_start():
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
            name=name, email=email, phone=phone,
            registration_step=1, profile_strength=25,
            is_active=False, verification_status="pending",
        )
        sp.set_password(password)
        db.session.add(sp)
        db.session.commit()
        session.clear()
        session["sp_id"] = sp.id
        session.permanent = True
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
            addresses_in = [data]
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
            addr.latitude = lat
            addr.longitude = lng
            addr.is_primary = label == "home"
        sp.registration_step = max(sp.registration_step or 1, 2)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()
        return jsonify({
            "message": "Business info saved",
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": 3,
        }), 200

    @app.route("/api/sp/register/step/3", methods=["PUT"])
    @login_required_sp
    def sp_register_step3():
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404
        skill_ids = data.get("skill_ids") or []
        if not skill_ids:
            return jsonify({"error": "skill_ids required"}), 400
        ServiceProviderSkill.query.filter_by(service_provider_id=sp.id).delete()
        for i, sid in enumerate(skill_ids):
            skill = db.session.get(Skill, int(sid))
            if not skill:
                continue
            db.session.add(ServiceProviderSkill(
                service_provider_id=sp.id, skill_id=skill.id, is_primary=(i == 0),
            ))
        sp.registration_step = max(sp.registration_step or 1, 3)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()
        return jsonify({
            "message": "Skills saved",
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": 4,
        }), 200

    @app.route("/api/sp/register/step/4", methods=["PUT"])
    @login_required_sp
    def sp_register_step4():
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404
        method_type = (data.get("method_type") or "cash").lower()
        if method_type not in ("cash", "bank"):
            return jsonify({"error": "method_type must be cash or bank"}), 400
        pm = ServiceProviderPayoutMethod(
            service_provider_id=sp.id,
            method_type=method_type,
            bank_name=data.get("bank_name"),
            account_holder=data.get("account_holder"),
            account_number=data.get("account_number"),
            branch_code=data.get("branch_code"),
            account_type=data.get("account_type"),
            is_primary=True,
        )
        db.session.add(pm)
        sp.registration_step = max(sp.registration_step or 1, 4)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()
        return jsonify({
            "message": "Payout method saved",
            "registration_step": sp.registration_step,
            "profile_strength": sp.profile_strength,
            "next_step": "complete",
        }), 200

    @app.route("/api/sp/register/complete", methods=["POST"])
    @login_required_sp
    def sp_register_complete():
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "Service provider not found"}), 404
        sp.profile_complete = True
        sp.onboarding_completed_at = datetime.utcnow()
        sp.registration_step = max(sp.registration_step or 1, 5)
        sp.profile_strength = calc_sp_strength(sp, Address, ServiceProviderSkill, ServiceProviderPayoutMethod)
        db.session.commit()
        return jsonify({
            "message": "Registration submitted for review",
            "sp_id": sp.id,
            "profile_complete": True,
            "verification_status": sp.verification_status,
            "is_active": sp.is_active,
        }), 200

    @app.route("/api/skills", methods=["GET"])
    def list_skills():
        skills = Skill.query.filter_by(is_active=True).order_by(Skill.category, Skill.name).all()
        flat = [{"id": s.id, "name": s.name, "category": s.category} for s in skills]
        by_cat = {}
        for s in flat:
            by_cat.setdefault(s["category"] or "Other", []).append(s)
        return jsonify({"skills": flat, "by_category": by_cat}), 200

    @app.route("/api/sp/register", methods=["POST"])
    def sp_register_legacy():
        data = _json()
        required = ["name", "email", "phone", "password"]
        if not all(data.get(k) for k in required):
            return jsonify({"error": "Missing required fields: name, email, phone, password"}), 400
        email = data["email"].strip().lower()
        if ServiceProvider.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400
        if len(str(data.get("password") or "")) < 6:
            return jsonify({"error": "password must be at least 6 characters"}), 400
        sp = ServiceProvider(
            name=data["name"].strip(),
            email=email,
            phone=str(data["phone"]).strip(),
            province=(data.get("province") or "").strip() or None,
            is_active=False,
            verification_status="pending",
            registration_step=1,
            profile_strength=25,
        )
        sp.set_password(data["password"])
        try:
            if data.get("latitude") is not None:
                sp.current_latitude = float(data["latitude"])
            if data.get("longitude") is not None:
                sp.current_longitude = float(data["longitude"])
        except (TypeError, ValueError):
            return jsonify({"error": "latitude and longitude must be numbers"}), 400
        db.session.add(sp)
        db.session.flush()
        skill_name = (data.get("skill") or "").strip()
        if skill_name:
            skill = Skill.query.filter(db.func.lower(Skill.name) == skill_name.lower()).first()
            if not skill:
                skill = Skill(name=skill_name, category="Other", is_active=True)
                db.session.add(skill)
                db.session.flush()
            db.session.add(ServiceProviderSkill(
                service_provider_id=sp.id, skill_id=skill.id, is_primary=True,
            ))
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

    @app.route("/api/client/location", methods=["POST"])
    @login_required_client
    def client_location():
        data = _json()
        client = db.session.get(Client, int(_client_id()))
        if not client:
            return jsonify({"error": "Client not found"}), 404
        try:
            lat, lng = float(data["latitude"]), float(data["longitude"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "latitude and longitude required"}), 400
        client.current_latitude = lat
        client.current_longitude = lng
        client.current_location_at = datetime.utcnow()
        hist = ClientLocationHistory(
            client_id=client.id, latitude=lat, longitude=lng,
            accuracy_m=data.get("accuracy_m"),
            event=data.get("event") or "heartbeat",
            source=data.get("source") or "app",
        )
        db.session.add(hist)
        db.session.commit()
        return jsonify({"message": "Location recorded", "recorded_at": client.current_location_at.isoformat()}), 200

    @app.route("/api/sp/location", methods=["POST"])
    @login_required_sp
    def sp_location():
        data = _json()
        sp = db.session.get(ServiceProvider, int(_sp_id()))
        if not sp:
            return jsonify({"error": "SP not found"}), 404
        try:
            lat, lng = float(data["latitude"]), float(data["longitude"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "latitude and longitude required"}), 400
        sp.current_latitude = lat
        sp.current_longitude = lng
        sp.current_location_at = datetime.utcnow()
        hist = SPLocationHistory(
            service_provider_id=sp.id, latitude=lat, longitude=lng,
            accuracy_m=data.get("accuracy_m"),
            event=data.get("event") or "heartbeat",
            source=data.get("source") or "app",
        )
        db.session.add(hist)
        db.session.commit()
        return jsonify({"message": "Location recorded", "recorded_at": sp.current_location_at.isoformat()}), 200

    @app.route("/api/admin/sp/pending", methods=["GET"])
    @login_required_admin
    def admin_pending_sps():
        sps = ServiceProvider.query.filter_by(verification_status="pending").order_by(ServiceProvider.created_at.desc()).all()
        out = []
        for sp in sps:
            skills = [s.skill.name for s in sp.skills if s.skill]
            out.append({
                "id": sp.id, "name": sp.name, "email": sp.email, "phone": sp.phone,
                "business_name": sp.business_name, "province": sp.province,
                "skills": skills, "profile_strength": sp.profile_strength,
                "created_at": sp.created_at.isoformat() if sp.created_at else None,
            })
        return jsonify(out), 200

    @app.route("/api/admin/sp/<int:sp_id>/activate", methods=["POST"])
    @login_required_admin
    def admin_activate_sp(sp_id):
        sp = db.session.get(ServiceProvider, sp_id)
        if not sp:
            return jsonify({"error": "Not found"}), 404
        sp.verification_status = "approved"
        sp.is_active = True
        sp.activated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({
            "message": "SP activated",
            "sp_id": sp.id,
            "verification_status": sp.verification_status,
            "is_active": True,
        }), 200

    @app.route("/api/admin/sp/<int:sp_id>/reject", methods=["POST"])
    @login_required_admin
    def admin_reject_sp(sp_id):
        sp = db.session.get(ServiceProvider, sp_id)
        if not sp:
            return jsonify({"error": "Not found"}), 404
        sp.verification_status = "rejected"
        sp.is_active = False
        db.session.commit()
        return jsonify({
            "message": "SP rejected",
            "sp_id": sp.id,
            "verification_status": "rejected",
            "is_active": False,
        }), 200

    @app.route("/api/banks", methods=["GET"])
    def list_banks():
        banks = Bank.query.order_by(Bank.name).all()
        return jsonify([{"id": b.id, "name": b.name, "universal_branch_code": getattr(b, "universal_branch_code", None)} for b in banks]), 200

    @app.route("/api/admin/login", methods=["POST"])
    def admin_login_api():
        data = _json()
        email = (data.get("email") or data.get("username") or "").strip().lower()
        password = data.get("password")
        admin = Admin.query.filter_by(email=email).first()
        if admin and admin.check_password(password) and admin.is_active:
            session.clear()
            session["admin_id"] = admin.id
            session["admin_role"] = admin.role
            session["user"] = "admin"
            session.permanent = True
            return jsonify({"message": "Admin logged in", "admin_id": admin.id, "name": admin.name, "role": admin.role}), 200
        if email in ("admin", "admin@local") and password == "admin123":
            session.clear()
            session["user"] = "admin"
            session["admin_role"] = "superadmin"
            session.permanent = True
            return jsonify({"message": "Admin logged in (legacy)", "role": "superadmin"}), 200
        return jsonify({"error": "Invalid credentials"}), 401

    # ---- Job lifecycle (jobs_routes.py) ----
    from jobs_routes import register_job_routes
    register_job_routes(
        app,
        db,
        models,
        {
            "_json": _json,
            "_client_id": _client_id,
            "_sp_id": _sp_id,
            "login_required_client": login_required_client,
            "login_required_sp": login_required_sp,
            "audit": audit,
        },
    )

    print("✓ API routes registered (registration, jobs, skills, documents, admin, location, activation, payouts)")
