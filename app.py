from flask import Flask, render_template, request, jsonify, send_from_directory, flash, redirect, session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_admin.actions import action
from flask_socketio import SocketIO, join_room
import pandas as pd
import os
from functools import wraps
import math
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = 'supersecretkey'
app.permanent_session_lifetime = timedelta(minutes=30)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'claims.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")


# ============================
# MODELS
# ============================

class Claim(db.Model):
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


class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True)
    phone = db.Column(db.String(50))
    address = db.Column(db.String(255))
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    jobs = db.relationship('JobRequest', backref='client', lazy=True, foreign_keys='JobRequest.client_id')

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=False, unique=True)
    skill = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(100), nullable=False)
    province = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_assigned_at = db.Column(db.DateTime)
    password_hash = db.Column(db.String(200), nullable=False)

    jobs = db.relationship(
        'JobRequest',
        backref=db.backref('assigned_provider', lazy=True),
        lazy=True,
        foreign_keys='JobRequest.assigned_sp_id'
    )
    ratings = db.relationship('Rating', backref='provider', lazy=True)
    payments = db.relationship('Payment', backref='provider', lazy=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class JobRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=True)
    client_name = db.Column(db.Text, nullable=False)
    client_phone = db.Column(db.String(50))
    client_address = db.Column(db.String(255))

    job_description = db.Column(db.Text, nullable=False)
    skill_required = db.Column(db.String(100), nullable=False)
    appointment_time = db.Column(db.DateTime, nullable=False)
    province = db.Column(db.String(100), nullable=False)

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    assigned_sp_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))
    status = db.Column(db.String(50), default="Open")  # Open, Assigned, Accepted, Cancelled, Completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    declined_sps = db.Column(db.Text, default="")  # CSV of sp_ids


class JobDecline(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_request.id'))
    sp_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


class JobHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_request.id'), nullable=False)
    sp_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)  # Created, Assigned, Accepted, Declined, Cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))
    job_request_id = db.Column(db.Integer, db.ForeignKey('job_request.id'))
    score = db.Column(db.Integer, nullable=False)  # 1–5
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))
    job_request_id = db.Column(db.Integer, db.ForeignKey('job_request.id'))
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="Pending")  # Pending, Paid, Failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Quote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_request_id = db.Column(db.Integer, db.ForeignKey('job_request.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'), nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    details = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_request_id = db.Column(db.Integer, db.ForeignKey('job_request.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'), nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    details = db.Column(db.Text, default="")
    status = db.Column(db.String(50), default="Unpaid")
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)


# ============================
# LOGIN DECORATORS
# ============================

def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('user') != 'admin':
            flash("You must be logged in as an admin to view this page.", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


def sp_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'sp_id' not in session:
            return redirect(url_for('sp_login'))
        return f(*args, **kwargs)
    return decorated_function


# ============================
# ADMIN VIEWS
# ============================

class MyAdminIndexView(AdminIndexView):
    def is_accessible(self):
        return session.get('user') == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))


class SecuredModelView(ModelView):
    def is_accessible(self):
        return session.get('user') == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))


class ClaimAdmin(SecuredModelView):
    can_create = False
    can_edit = True
    can_delete = True
    column_editable_list = ['status', 'claim_type', 'incident_date', 'claim_amount']
    column_searchable_list = ['claimant_name', 'policy_id', 'status']
    column_filters = ['claim_type', 'status']
    form_args = {
        'status': {
            'choices': [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')],
            'label': 'Claim Status'
        }
    }

    @action('approve', 'Approve Selected', 'Are you sure you want to approve these claims?')
    def action_approve(self, ids):
        for claim_id in ids:
            claim = db.session.get(Claim, claim_id)
            if claim:
                claim.status = "Approved"
        db.session.commit()
        flash(f"{len(ids)} claim(s) approved!", "success")

    @action('reject', 'Reject Selected', 'Are you sure you want to reject these claims?')
    def action_reject(self, ids):
        for claim_id in ids:
            claim = db.session.get(Claim, claim_id)
            if claim:
                claim.status = "Rejected"
        db.session.commit()
        flash(f"{len(ids)} claim(s) rejected!", "danger")


# ============================
# ADMIN SETUP
# ============================

admin = Admin(app, name='Claims Admin', index_view=MyAdminIndexView())
admin.add_view(ClaimAdmin(Claim, db.session))
admin.add_view(SecuredModelView(JobRequest, db.session))
admin.add_view(SecuredModelView(JobHistory, db.session))
admin.add_view(SecuredModelView(ServiceProvider, db.session))
admin.add_view(SecuredModelView(Client, db.session))
admin.add_view(SecuredModelView(Rating, db.session))
admin.add_view(SecuredModelView(Payment, db.session))
admin.add_view(SecuredModelView(Quote, db.session))
admin.add_view(SecuredModelView(Invoice, db.session))
admin.add_view(SecuredModelView(JobDecline, db.session))


# ============================
# HELPERS
# ============================

def calculate_distance(lat1, lon1, lat2, lon2):
    """Return distance in km using Haversine formula."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def parse_dt(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def validate_location_input(address=None, latitude=None, longitude=None):
    """
    Option A validation:
    require either address text OR valid latitude/longitude.
    """
    has_address = bool(address and str(address).strip())

    has_coords = latitude is not None and longitude is not None
    if has_coords:
        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            return False, "Latitude and longitude must be numbers."

        if not (-90 <= latitude <= 90):
            return False, "Latitude must be between -90 and 90."

        if not (-180 <= longitude <= 180):
            return False, "Longitude must be between -180 and 180."

    if not has_address and not has_coords:
        return False, "Provide either an address or latitude/longitude."

    return True, None


def record_job_history(job_id, action, sp_id=None):
    history = JobHistory(job_id=job_id, sp_id=sp_id, action=action)
    db.session.add(history)
    db.session.commit()


def assign_job(job, max_distance_km=20):
    """Allocate job to the best provider."""
    providers = ServiceProvider.query.filter_by(
        skill=job.skill_required,
        province=job.province,
        is_available=True
    ).all()

    eligible = []
    for sp in providers:
        if sp.latitude is not None and sp.longitude is not None and job.latitude is not None and job.longitude is not None:
            dist = calculate_distance(job.latitude, job.longitude, sp.latitude, sp.longitude)
            if dist <= max_distance_km:
                eligible.append(sp)

    if not eligible:
        return None

    eligible.sort(key=lambda sp: ((sp.last_assigned_at or datetime.min), sp.created_at))

    selected = eligible[0]
    job.assigned_sp_id = selected.id
    job.status = "Assigned"
    selected.last_assigned_at = datetime.utcnow()
    db.session.commit()
    return selected


# ============================
# ROUTES
# ============================

@app.route('/')
def home():
    return render_template('home.html')


@app.route('/track')
def track():
    return render_template('register_claim.html')


@app.route('/api/claims/<int:claim_id>')
def get_claim(claim_id):
    claim = db.session.get(Claim, claim_id)
    if claim:
        return jsonify({
            'id': claim.id,
            'policy_id': claim.policy_id,
            'claim_type': claim.claim_type,
            'incident_date': claim.incident_date,
            'incident_location': claim.incident_location,
            'description': claim.description,
            'claim_amount': claim.claim_amount,
            'status': claim.status,
            'claimant_name': claim.claimant_name,
            'contact_number': claim.contact_number,
            'email': claim.email
        })
    return jsonify({'error': 'Claim not found'}), 404


@app.route('/register_claim')
def register_claim():
    return render_template('register_claim.html')


@app.route('/submit_claim', methods=['POST'])
def submit_claim():
    data = request.get_json() or {}
    new_claim = Claim(
        policy_id=data.get('policy_id'),
        claim_type=data.get('claim_type'),
        incident_date=data.get('incident_date'),
        incident_location=data.get('incident_location'),
        description=data.get('description'),
        claim_amount=data.get('claim_amount'),
        claimant_name=data.get('claimant_name'),
        contact_number=data.get('contact_number'),
        email=data.get('email'),
    )
    db.session.add(new_claim)
    db.session.commit()
    return jsonify({'message': 'Claim submitted successfully!', 'claim_id': new_claim.id}), 201


@app.route('/client')
def client():
    return render_template('client.html')


# ============================
# CLIENT API AUTH + PROFILE
# ============================

@app.route('/api/client/register', methods=['POST'])
def client_register():
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if not email or not password or not name:
        return jsonify({'error': 'name, email, and password are required'}), 400

    existing = Client.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email already registered'}), 400

    client_obj = Client(
        name=name,
        email=email,
        phone=data.get('phone'),
        address=data.get('address')
    )
    client_obj.set_password(password)

    db.session.add(client_obj)
    db.session.commit()

    return jsonify({'message': 'Client registered successfully', 'client_id': client_obj.id}), 201


@app.route('/api/client/login', methods=['POST'])
def client_login():
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')

    client_obj = Client.query.filter_by(email=email).first()
    if not client_obj or not client_obj.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    session.clear()
    session['client_id'] = client_obj.id
    session.permanent = True

    return jsonify({
        'message': 'Client logged in successfully',
        'client_id': client_obj.id,
        'name': client_obj.name,
        'email': client_obj.email
    }), 200


@app.route('/api/client/logout', methods=['POST'])
def client_logout():
    session.pop('client_id', None)
    return jsonify({'message': 'Client logged out successfully'}), 200


@app.route('/api/client/profile', methods=['GET'])
def client_profile():
    client_id = session.get('client_id') or request.args.get('client_id')
    if not client_id:
        return jsonify({'error': 'client_id required'}), 400

    client_obj = db.session.get(Client, int(client_id))
    if not client_obj:
        return jsonify({'error': 'Client not found'}), 404

    return jsonify({
        'id': client_obj.id,
        'name': client_obj.name,
        'email': client_obj.email,
        'phone': client_obj.phone,
        'address': client_obj.address
    }), 200


@app.route('/api/client/jobs', methods=['GET'])
def client_jobs():
    client_id = session.get('client_id') or request.args.get('client_id')
    if not client_id:
        return jsonify({'error': 'client_id required'}), 400

    jobs = JobRequest.query.filter_by(client_id=int(client_id)).order_by(JobRequest.created_at.desc()).all()
    return jsonify([
        {
            'job_id': j.id,
            'status': j.status,
            'desc': j.job_description,
            'skill_required': j.skill_required,
            'appointment': j.appointment_time.isoformat() if j.appointment_time else None,
            'latitude': j.latitude,
            'longitude': j.longitude,
            'assigned_sp_id': j.assigned_sp_id
        }
        for j in jobs
    ]), 200


@app.route('/api/client/job/<int:job_id>/cancel', methods=['POST'])
def client_cancel_job(job_id):
    client_id = session.get('client_id') or (request.get_json() or {}).get('client_id')
    if not client_id:
        return jsonify({'error': 'client_id required'}), 400

    job = db.session.get(JobRequest, job_id)
    if not job or job.client_id != int(client_id):
        return jsonify({'error': 'Job not found or access denied'}), 404

    if job.status in ('Completed', 'Cancelled'):
        return jsonify({'error': f'Job already {job.status}'}), 400

    job.status = 'Cancelled'
    db.session.commit()
    record_job_history(job.id, 'Cancelled', job.assigned_sp_id)

    if job.assigned_sp_id:
        socketio.emit('job_cancelled', {'job_id': job.id}, room=f"sp_{job.assigned_sp_id}")

    return jsonify({'message': 'Job cancelled', 'job_id': job.id}), 200


# ============================
# SERVICE PROVIDER AUTH
# ============================

@app.route('/api/sp/login', methods=['POST'])
def api_sp_login():
    data = request.get_json() or {}

    email = data.get('email')
    password = data.get('password')

    sp = ServiceProvider.query.filter_by(email=email).first()
    if not sp or not sp.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401

    session.clear()
    session['sp_id'] = sp.id
    session.permanent = True
    

    return jsonify({
        'message': 'Service provider logged in successfully',
        'sp_id': sp.id,
        'name': sp.name,
        'email': sp.email
    }), 200


@app.route('/api/sp/logout', methods=['POST'])
def api_sp_logout():
    session.pop('sp_id', None)
    return jsonify({'message': 'Service provider logged out successfully'}), 200


@app.route('/sp_login', methods=['GET', 'POST'])
def sp_login():
    error = None
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        sp = ServiceProvider.query.filter_by(email=email).first()
        if sp and sp.check_password(password):
            session['sp_id'] = sp.id
            session.permanent = True
            return redirect(url_for('service_provider'))
        else:
            error = 'Invalid Credentials. Please try again.'

    return render_template('login_provider.html', error=error)




@app.route('/sp_logout')
@sp_login_required
def sp_logout():
    session.pop('sp_id', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('sp_login'))


@app.route('/api/sp/register', methods=['POST'])
def api_sp_register():
    data = request.get_json() or {}

    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    province = data.get('province')
    skill = data.get('skill')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    password = data.get('password')

    if not name or not email or not phone or not province or not skill or not password:
        return jsonify({'error': 'Missing required fields'}), 400

    existing = ServiceProvider.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email already registered'}), 400

    sp = ServiceProvider(
        name=name,
        email=email,
        phone=phone,
        province=province,
        skill=skill,
        latitude=float(latitude) if latitude is not None else None,
        longitude=float(longitude) if longitude is not None else None,
        password_hash=generate_password_hash(password)
    )

    db.session.add(sp)
    db.session.commit()

    return jsonify({
        'message': 'Service provider registered successfully',
        'sp_id': sp.id
    }), 201



@app.route('/service-provider')
@sp_login_required
def service_provider():
    provider = db.session.get(ServiceProvider, session['sp_id'])
    if not provider:
        return redirect(url_for('sp_login'))

    jobs = JobRequest.query.filter(JobRequest.skill_required == provider.skill).all()

    return render_template(
        'service_provider.html',
        provider=provider,
        jobs=jobs,
        provider_lat=provider.latitude,
        provider_lng=provider.longitude
    )


@app.route('/register_provider', methods=['GET', 'POST'])
def register_provider():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        province = request.form.get('province')
        skill = request.form.get('skill')
        latitude = float(request.form.get('latitude') or 0)
        longitude = float(request.form.get('longitude') or 0)
        password = request.form.get('password')

        existing = ServiceProvider.query.filter_by(email=email).first()
        if existing:
            flash('Email already registered. Please login.', 'warning')
            return redirect(url_for('sp_login'))

        new_provider = ServiceProvider(
            name=name,
            email=email,
            phone=phone,
            skill=skill,
            province=province,
            latitude=latitude,
            longitude=longitude,
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_provider)
        db.session.commit()
        flash('Service Provider registered! Please login.', 'success')
        return redirect(url_for('sp_login'))

    return render_template('register_provider.html')


# ============================
# ADMIN AUTH + DASHBOARD
# ============================

@app.route('/admin')
@admin_login_required
def admin_panel():
    jobs = JobRequest.query.all()
    claims = Claim.query.all()
    service_providers = ServiceProvider.query.all()

    return render_template('admin.html', jobs=jobs, claims=claims, service_providers=service_providers)


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'admin123':
            session['user'] = 'admin'
            session.permanent = True
            return redirect(url_for('admin_panel'))
        else:
            error = 'Invalid Credentials. Please try again.'
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('sp_id', None)
    session.pop('client_id', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('sp_login'))


@app.route('/admin/export/csv')
@admin_login_required
def export_csv():
    claims = Claim.query.all()
    data = [{
        'Claim ID': c.id,
        'Policy ID': c.policy_id,
        'Claim Type': c.claim_type,
        'Incident Date': c.incident_date,
        'Incident Location': c.incident_location,
        'Description': c.description,
        'Claim Amount': c.claim_amount,
        'Status': c.status,
        'Claimant Name': c.claimant_name,
        'Contact Number': c.contact_number,
        'Email': c.email
    } for c in claims]
    df = pd.DataFrame(data)
    filename = "claims_export.csv"
    df.to_csv(filename, index=False)
    return send_from_directory('.', filename, as_attachment=True)


@app.route('/admin/export/excel')
@admin_login_required
def export_excel():
    claims = Claim.query.all()
    data = [{
        'Claim ID': c.id,
        'Policy ID': c.policy_id,
        'Claim Type': c.claim_type,
        'Incident Date': c.incident_date,
        'Incident Location': c.incident_location,
        'Description': c.description,
        'Claim Amount': c.claim_amount,
        'Status': c.status,
        'Claimant Name': c.claimant_name,
        'Contact Number': c.contact_number,
        'Email': c.email
    } for c in claims]
    df = pd.DataFrame(data)
    os.makedirs("downloads", exist_ok=True)
    filepath = os.path.join("downloads", "claims_export.xlsx")
    df.to_excel(filepath, index=False)
    return send_from_directory('downloads', "claims_export.xlsx", as_attachment=True)


# ============================
# JOB NOTIFICATIONS & BROADCASTS
# ============================

@app.route('/send_notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'No data received'}), 400

    client_name = data.get('clientName')
    job_desc = data.get('jobDesc')
    skill = data.get('skill')
    province = data.get('province')
    address = data.get('address')

    latitude = data.get('latitude')
    longitude = data.get('longitude')

    valid, error = validate_location_input(address, latitude, longitude)
    if not valid:
        return jsonify({'status': error}), 400

    latitude = float(latitude) if latitude is not None else None
    longitude = float(longitude) if longitude is not None else None

    appointment_time = parse_dt(data.get('appointment')) or datetime.utcnow()

    job = JobRequest(
        client_name=client_name,
        client_address=address,
        job_description=job_desc,
        skill_required=skill,
        appointment_time=appointment_time,
        province=province,
        latitude=latitude,
        longitude=longitude
    )
    db.session.add(job)
    db.session.commit()

    record_job_history(job.id, 'Created')

    socketio.emit('receive_notification', {
        'job_id': job.id,
        'clientName': client_name,
        'jobDesc': job_desc,
        'skill': skill,
        'appointment': appointment_time.isoformat(),
        'province': province,
        'latitude': latitude,
        'longitude': longitude,
        'address': address
    }, room='all_sp_room')

    return jsonify({'status': 'Notifications sent to all SPs', 'job_id': job.id}), 201


@socketio.on('join_room')
def handle_join_room(data):
    sp_id = data.get('sp_id')
    if sp_id is not None:
        room_name = f"sp_{str(sp_id)}"
        join_room(room_name)
        join_room('all_sp_room')


@app.route('/submit_provider', methods=['POST'])
def submit_provider():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    province = request.form['province']
    skill = request.form['skill']
    latitude = float(request.form.get('latitude') or 0)
    longitude = float(request.form.get('longitude') or 0)
    password = request.form['password']

    new_provider = ServiceProvider(
        name=name,
        email=email,
        phone=phone,
        province=province,
        skill=skill,
        latitude=latitude,
        longitude=longitude,
        password_hash=generate_password_hash(password)
    )

    db.session.add(new_provider)
    db.session.commit()
    flash('Service provider registered successfully!')
    return redirect(url_for('admin_panel'))


@app.route('/jobs', methods=['POST'])
def create_job():
    data = request.json or {}

    appointment_time = data.get("appointment_time")
    if isinstance(appointment_time, str):
        appointment_time = parse_dt(appointment_time) or datetime.utcnow()
    elif not appointment_time:
        appointment_time = datetime.utcnow()

    address = data.get('address')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    valid, error = validate_location_input(address, latitude, longitude)
    if not valid:
        return jsonify({'error': error}), 400

    latitude = float(latitude) if latitude is not None else None
    longitude = float(longitude) if longitude is not None else None

    client_id = data.get("client_id")
    client_obj = db.session.get(Client, client_id) if client_id else None

    job = JobRequest(
        client_id=client_obj.id if client_obj else None,
        client_name=data.get("client_name") or (client_obj.name if client_obj else "Unknown Client"),
        client_phone=data.get("client_phone") or (client_obj.phone if client_obj else None),
        client_address=address or (client_obj.address if client_obj else None),
        job_description=data["job_description"],
        skill_required=data["skill_required"],
        appointment_time=appointment_time,
        province=data.get("province"),
        latitude=latitude,
        longitude=longitude
    )
    db.session.add(job)
    db.session.commit()

    record_job_history(job.id, 'Created')

    assigned = assign_job(job)
    if assigned:
        record_job_history(job.id, 'Assigned', assigned.id)
        return jsonify({
            "message": "Job created and assigned",
            "job_id": job.id,
            "provider_id": assigned.id
        }), 200
    else:
        return jsonify({
            "message": "Job created but no provider available",
            "job_id": job.id
        }), 200


@app.route('/api/jobs/open', methods=['GET'])
def get_open_jobs():
    jobs = JobRequest.query.filter(JobRequest.status.in_(["Open", "Assigned"])).all()
    return jsonify([
        {
            "job_id": j.id,
            "client_name": j.client_name,
            "job_description": j.job_description,
            "skill_required": j.skill_required,
            "appointment_time": j.appointment_time.isoformat() if j.appointment_time else None,
            "province": j.province,
            "latitude": j.latitude,
            "longitude": j.longitude,
            "status": j.status
        }
        for j in jobs
    ]), 200


# --- Accept Job ---
@app.route('/accept_job', methods=['POST'])
def accept_job():
    data = request.get_json()
    job_id = data.get('job_id')
    sp_id = data.get('sp_id')

    job = db.session.get(JobRequest, job_id)
    sp = db.session.get(ServiceProvider, sp_id)

    if not job or not sp:
        return jsonify({'status': 'Job or SP not found'}), 404

    if job.status in ('Assigned', 'Accepted'):
        return jsonify({'status': 'Job already taken'}), 400

    job.assigned_sp_id = sp.id
    job.status = 'Accepted'

    try:
        db.session.commit()
        record_job_history(job.id, 'Accepted', sp.id)
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'Error committing transaction', 'error': str(e)}), 500

    other_sps = ServiceProvider.query.filter(
        ServiceProvider.id != sp.id,
        ServiceProvider.is_available == True
    ).all()

    for other_sp in other_sps:
        socketio.emit('job_taken', {'job_id': job.id}, room=f"sp_{other_sp.id}")

    return jsonify({
        'status': 'Job accepted',
        'job_id': job.id,
        'latitude': job.latitude,
        'longitude': job.longitude
    }), 200


# --- Decline Job ---
@app.route('/decline_job', methods=['POST'])
def decline_job():
    data = request.get_json()
    job_id = data.get('job_id')
    sp_id = data.get('sp_id')

    job = db.session.get(JobRequest, job_id)
    sp = db.session.get(ServiceProvider, sp_id)

    if not job or not sp:
        return jsonify({'status': 'Job or SP not found'}), 404

    decline = JobDecline(job_id=job.id, sp_id=sp.id)
    try:
        db.session.add(decline)
        db.session.commit()
        record_job_history(job.id, 'Declined', sp.id)
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'Error committing decline', 'error': str(e)}), 500

    socketio.emit('job_declined', {'job_id': job.id, 'sp_id': sp.id}, room=f"sp_{sp.id}")

    return jsonify({'status': 'Job declined', 'job_id': job.id}), 200


@app.route('/ratings', methods=['POST'])
def create_rating():
    data = request.json or {}
    rating = Rating(
        service_provider_id=data["service_provider_id"],
        job_request_id=data["job_request_id"],
        score=data["score"],
        comment=data.get("comment")
    )
    db.session.add(rating)
    db.session.commit()
    return jsonify({"message": "Rating added", "id": rating.id}), 201


@app.route('/ratings/sp/<int:sp_id>', methods=['GET'])
def get_ratings_for_sp(sp_id):
    ratings = Rating.query.filter_by(service_provider_id=sp_id).all()
    return jsonify([
        {
            "id": r.id,
            "score": r.score,
            "comment": r.comment,
            "job_id": r.job_request_id,
            "created_at": r.created_at.isoformat()
        }
        for r in ratings
    ]), 200


@app.route('/payments', methods=['POST'])
def create_payment():
    data = request.json or {}
    payment = Payment(
        service_provider_id=data["service_provider_id"],
        job_request_id=data["job_request_id"],
        amount=data["amount"],
        status=data.get("status", "Pending")
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({"message": "Payment recorded", "id": payment.id}), 201


@app.route('/payments/sp/<int:sp_id>', methods=['GET'])
def get_payments_by_sp(sp_id):
    payments = Payment.query.filter_by(service_provider_id=sp_id).all()
    return jsonify([
        {
            "id": p.id,
            "job_request_id": p.job_request_id,
            "amount": p.amount,
            "status": p.status,
            "created_at": p.created_at.isoformat()
        }
        for p in payments
    ]), 200


@app.route('/quotes', methods=['POST'])
def create_quote():
    data = request.json or {}

    quote = Quote(
        job_request_id=data["job_request_id"],
        client_id=data["client_id"],
        service_provider_id=data.get("service_provider_id"),
        total_amount=data["total_amount"],
        details=data.get("details", "")
    )
    db.session.add(quote)
    db.session.commit()

    return jsonify({"message": "Quote created", "id": quote.id}), 201


@app.route('/quotes/client/<int:client_id>', methods=['GET'])
def get_quotes_by_client(client_id):
    quotes = Quote.query.filter_by(client_id=client_id).all()
    return jsonify([
        {
            "id": q.id,
            "job_request_id": q.job_request_id,
            "service_provider_id": q.service_provider_id,
            "total_amount": q.total_amount,
            "details": q.details,
            "status": q.status,
            "created_at": q.created_at.isoformat()
        }
        for q in quotes
    ]), 200


@app.route('/quotes/job/<int:job_id>', methods=['GET'])
def get_quotes_by_job(job_id):
    quotes = Quote.query.filter_by(job_request_id=job_id).all()
    return jsonify([
        {
            "id": q.id,
            "client_id": q.client_id,
            "service_provider_id": q.service_provider_id,
            "total_amount": q.total_amount,
            "details": q.details,
            "status": q.status,
            "created_at": q.created_at.isoformat()
        }
        for q in quotes
    ]), 200


@app.route('/invoices', methods=['POST'])
def create_invoice():
    data = request.json or {}

    invoice = Invoice(
        job_request_id=data["job_request_id"],
        client_id=data["client_id"],
        service_provider_id=data.get("service_provider_id"),
        total_amount=data["total_amount"],
        details=data.get("details", "")
    )
    db.session.add(invoice)
    db.session.commit()

    return jsonify({"message": "Invoice created", "id": invoice.id}), 201


@app.route('/invoices/client/<int:client_id>', methods=['GET'])
def get_invoices_by_client(client_id):
    invoices = Invoice.query.filter_by(client_id=client_id).all()
    return jsonify([
        {
            "id": i.id,
            "job_request_id": i.job_request_id,
            "service_provider_id": i.service_provider_id,
            "total_amount": i.total_amount,
            "details": i.details,
            "status": i.status,
            "issued_at": i.issued_at.isoformat()
        }
        for i in invoices
    ]), 200


@app.route('/invoices/job/<int:job_id>', methods=['GET'])
def get_invoices_by_job(job_id):
    invoices = Invoice.query.filter_by(job_request_id=job_id).all()
    return jsonify([
        {
            "id": i.id,
            "client_id": i.client_id,
            "service_provider_id": i.service_provider_id,
            "total_amount": i.total_amount,
            "details": i.details,
            "status": i.status,
            "issued_at": i.issued_at.isoformat()
        }
        for i in invoices
    ]), 200


# ============================
# MAIN
# ============================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, use_reloader=False)




""" 
from flask import Flask, render_template, request, jsonify, send_from_directory, flash, redirect, session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_admin.actions import action
from flask_socketio import SocketIO, emit
import pandas as pd
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///claims.db'
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")  # Enable WebSocket

# ----------------------------- MODELS ----------------------------- #

# Claim model
class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.String(100))
    claim_type = db.Column(db.String(50))
    incident_date = db.Column(db.String(50))
    incident_location = db.Column(db.String(100))
    description = db.Column(db.Text)
    claim_amount = db.Column(db.Float)
    status = db.Column(db.String(50))
    claimant_name = db.Column(db.String(100))
    contact_number = db.Column(db.String(50))
    email = db.Column(db.String(100))

# New JobRequest model for storing client-submitted jobs
class JobRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(100))
    job_description = db.Column(db.Text)
    skill_required = db.Column(db.String(100))
    appointment_time = db.Column(db.String(50))
    distance = db.Column(db.String(50))

# --------------------------- ADMIN VIEWS -------------------------- #

# Flask-Admin view for claims
class ClaimAdmin(ModelView):
    can_create = False
    can_edit = True
    can_delete = True
    column_editable_list = ['status', 'claim_type', 'incident_date', 'claim_amount']
    column_searchable_list = ['claimant_name', 'policy_id', 'status']
    column_filters = ['claim_type', 'status']
    form_args = {
        'status': {
            'choices': [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')],
            'label': 'Claim Status'
        }
    }

    def is_accessible(self):
        return session.get('user') == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

    @action('approve', 'Approve Selected', 'Are you sure you want to approve these claims?')
    def action_approve(self, ids):
        for claim_id in ids:
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Approved"
        db.session.commit()
        flash(f"{len(ids)} claim(s) approved!", "success")
        return redirect('/admin/claim')

    @action('reject', 'Reject Selected', 'Are you sure you want to reject these claims?')
    def action_reject(self, ids):
        for claim_id in ids:
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Rejected"
        db.session.commit()
        flash(f"{len(ids)} claim(s) rejected!", "danger")
        return redirect('/admin/claim')

# --------------------------- ADMIN SETUP -------------------------- #

admin = Admin(app, name='Claims Admin', template_mode='bootstrap4', base_template='admin/base.html')
admin.add_view(ClaimAdmin(Claim, db.session))
admin.add_view(ModelView(JobRequest, db.session))  # New admin panel for client jobs


# --------------------------- ROUTES -------------------------- #

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/api/claims/<int:claim_id>')
def get_claim(claim_id):
    claim = Claim.query.get(claim_id)
    if claim:
        return jsonify({
            'id': claim.id,
            'policy_id': claim.policy_id,
            'claim_type': claim.claim_type,
            'incident_date': claim.incident_date,
            'incident_location': claim.incident_location,
            'description': claim.description,
            'claim_amount': claim.claim_amount,
            'status': claim.status,
            'claimant_name': claim.claimant_name,
            'contact_number': claim.contact_number,
            'email': claim.email
        })
    else:
        return jsonify({'error': 'Claim not found'}), 404

@app.route('/track')
def track():
    return render_template('track.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'admin123':
            session['user'] = username
            return redirect(url_for('admin.index'))
        else:
            error = 'Invalid Credentials. Please try again.'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

@app.route('/admin/export/csv')
def export_csv():
    claims = Claim.query.all()
    data = [{
        'Claim ID': c.id,
        'Policy ID': c.policy_id,
        'Claim Type': c.claim_type,
        'Incident Date': c.incident_date,
        'Incident Location': c.incident_location,
        'Description': c.description,
        'Claim Amount': c.claim_amount,
        'Status': c.status,
        'Claimant Name': c.claimant_name,
        'Contact Number': c.contact_number,
        'Email': c.email
    } for c in claims]

    df = pd.DataFrame(data)
    filename = "claims_export.csv"
    df.to_csv(filename, index=False)
    return send_from_directory('.', filename, as_attachment=True)

@app.route('/admin/export/excel')
def export_excel():
    claims = Claim.query.all()
    data = [{
        'Claim ID': c.id,
        'Policy ID': c.policy_id,
        'Claim Type': c.claim_type,
        'Incident Date': c.incident_date,
        'Incident Location': c.incident_location,
        'Description': c.description,
        'Claim Amount': c.claim_amount,
        'Status': c.status,
        'Claimant Name': c.claimant_name,
        'Contact Number': c.contact_number,
        'Email': c.email
    } for c in claims]

    df = pd.DataFrame(data)
    os.makedirs("downloads", exist_ok=True)
    filepath = os.path.join("downloads", "claims_export.xlsx")
    df.to_excel(filepath, index=False)
    return send_from_directory('downloads', "claims_export.xlsx", as_attachment=True)

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/service-provider')
def service_provider():
    return render_template('service_provider.html')

@app.route('/send_notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'No data received'}), 400

    client_name = data.get('clientName')
    job_desc = data.get('jobDesc')
    skill = data.get('skill')
    appointment = data.get('appointment')
    distance = data.get('distance')

    # Save client job request to the database
    job = JobRequest(
        client_name=client_name,
        job_description=job_desc,
        skill_required=skill,
        appointment_time=appointment,
        distance=distance
    )
    db.session.add(job)
    db.session.commit()

    # Emit to all service providers
    socketio.emit('receive_notification', {
        'clientName': client_name,
        'jobDesc': job_desc,
        'skill': skill,
        'appointment': appointment,
        'distance': distance
    })

    return jsonify({'status': 'Notification sent and stored!'})

# ---------------------------- MAIN ---------------------------- #

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, use_reloader=False)



























 """