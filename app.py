from flask import Flask, render_template, request, jsonify, send_from_directory, flash, redirect, session, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_admin.actions import action
from flask_socketio import SocketIO, emit
import pandas as pd
import os
from functools import wraps
import math
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


app = Flask(__name__)
app.secret_key = 'supersecretkey'
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

class JobRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name=db.Column(db.Text, nullable=False)
    job_description = db.Column(db.Text, nullable=False)
    skill_required = db.Column(db.String(100), nullable=False)
    appointment_time=db.Column(db.DateTime, nullable=False)
    province = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))
    status = db.Column(db.String(50), default="Open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email=db.Column(db.String(150),nullable=False)
    skill = db.Column(db.String(100), nullable=False)
    phone=db.Column(db.String(100), nullable=False)
    province = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_assigned_at = db.Column(db.DateTime)
    password_hash = db.Column(db.String(200), nullable=False)

    jobs = db.relationship('JobRequest', backref='provider', lazy=True)
    ratings = db.relationship('Rating', backref='provider', lazy=True)
    payments = db.relationship('Payment', backref='provider', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)



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


# --------------------------- LOGIN DECORATORS -------------------------- #

def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('user') != 'admin':
            return redirect(url_for('login'))
        print("sp_id found:", session['sp_id'])
        return f(*args, **kwargs)
    return decorated_function

def sp_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'sp_id' not in session:
            return redirect(url_for('sp_login'))
        return f(*args, **kwargs)
    return decorated_function

# --------------------------- ADMIN VIEWS -------------------------- #

class MyAdminIndexView(AdminIndexView):
    def is_accessible(self):
        return session.get('user') == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

class ClaimAdmin(ModelView):
    def is_accessible(self):
        return session.get('user') == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

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
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Approved"
        db.session.commit()
        flash(f"{len(ids)} claim(s) approved!", "success")

    @action('reject', 'Reject Selected', 'Are you sure you want to reject these claims?')
    def action_reject(self, ids):
        for claim_id in ids:
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Rejected"
        db.session.commit()
        flash(f"{len(ids)} claim(s) rejected!", "danger")

# --------------------------- ADMIN SETUP -------------------------- #

admin = Admin(app, name='Claims Admin', template_mode='bootstrap4', index_view=MyAdminIndexView())
admin.add_view(ClaimAdmin(Claim, db.session))
admin.add_view(ModelView(JobRequest, db.session))
admin.add_view(ModelView(ServiceProvider, db.session))




# ============================
# HELPERS
# ============================

def calculate_distance(lat1, lon1, lat2, lon2):
    """Return distance in km using Haversine formula."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon/2) ** 2)
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))


def assign_job(job, max_distance_km=20):
    """Allocate job to the best provider."""
    providers = ServiceProvider.query.filter_by(
        skill=job.skill_required,
        province=job.province,
        is_available=True
    ).all()

    # Filter by distance
    eligible = []
    for sp in providers:
        if sp.latitude and sp.longitude and job.latitude and job.longitude:
            dist = calculate_distance(job.latitude, job.longitude, sp.latitude, sp.longitude)
            if dist <= max_distance_km:
                eligible.append(sp)

    if not eligible:
        return None

    # Sort by last_assigned_at then created_at (fair rotation)
    eligible.sort(key=lambda sp: (sp.last_assigned_at or datetime.min, sp.created_at))

    selected = eligible[0]
    job.service_provider_id = selected.id
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
    return jsonify({'error': 'Claim not found'}), 404

@app.route('/register_claim')
def register_claim():
    return render_template('register_claim.html')

@app.route('/submit_claim', methods=['POST'])
def submit_claim():
    data = request.get_json()
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
    return jsonify({'message': 'Claim submitted successfully!', 'claim_id': new_claim.id})

@app.route('/client')
def client():
    return render_template('client.html')


@app.route('/sp_login', methods=['GET', 'POST'])
def sp_login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        provider = ServiceProvider.query.filter_by(email=email).first()

        if provider and provider.check_password(password):
            session['sp_id'] = provider.id
            return redirect(url_for('service_provider'))
        else:
            flash('Invalid credentials', 'danger')

    return render_template('login_provider.html')

@app.route('/sp_logout')
def sp_logout():
    session.pop('sp_id', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('home'))



@app.route('/service-provider')
@sp_login_required
def service_provider():
    provider = ServiceProvider.query.get(session['sp_id'])
    if not provider:
        return redirect(url_for('sp_login'))

    # Filter jobs by provider's skill if applicable
    jobs = JobRequest.query.filter(JobRequest.skill_required == provider.skill).all()

    return render_template(
        'live_job_map.html',
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
        province=request.form.get('province')
        skill = request.form.get('skill')
        latitude = float(request.form.get('latitude') or 0)
        longitude = float(request.form.get('longitude') or 0)
        password = request.form.get('password')

        # Check if email already exists
        existing = ServiceProvider.query.filter_by(email=email).first()
        if existing:
            flash('Email already registered. Please login.', 'warning')
            return redirect(url_for('sp_login'))

        # Hash the password
        password_hash = generate_password_hash(password)

        new_provider = ServiceProvider(
            name=name,
            email=email,
            phone=phone,
            skill=skill,
            province=province,
            latitude=latitude,
            longitude=longitude,
            password_hash=password_hash  # Store hash instead of plain text
        )
        db.session.add(new_provider)
        db.session.commit()
        flash('Service Provider registered! Please login.', 'success')
        return redirect(url_for('sp_login'))

    return render_template('register_provider.html')


@app.route('/admin')
@admin_login_required
def admin_panel():
    jobs = JobRequest.query.all()
    claims = Claim.query.all()
    service_providers = ServiceProvider.query.all()

    return render_template('admin.html', jobs=jobs, claims=claims,service_providers=service_providers)

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'admin' and password == 'admin123':
            session['user'] = 'admin'
            return redirect(url_for('admin_panel'))
        else:
            error = 'Invalid Credentials. Please try again.'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

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

from datetime import datetime

@app.route('/send_notification', methods=['POST'])
def send_notification():
    data = request.get_json()
    if not data:
        return jsonify({'status': 'No data received'}), 400

    client_name = data.get('clientName')
    job_desc    = data.get('jobDesc')
    skill       = data.get('skill')
    province    = data.get('province')
    latitude    = data.get('latitude')
    longitude   = data.get('longitude')
    appt_raw    = data.get('appointment')

    # --- Robust datetime parsing ---
    appointment_time = None
    if appt_raw:
        for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M"):
            try:
                appointment_time = datetime.strptime(appt_raw, fmt)
                break
            except ValueError:
                continue
    if not appointment_time:
        appointment_time = datetime.utcnow()

    job = JobRequest(
        client_name=client_name,
        job_description=job_desc,       # or job_description if you renamed
        skill_required=skill,
        appointment_time=appointment_time,  # ✅ datetime, not str
        province=province,
        latitude=float(latitude or 0),
        longitude=float(longitude or 0)
    )
    db.session.add(job)
    db.session.commit()

    socketio.emit('receive_notification', {
        'clientName': job.client_name,
        'jobDesc': job.job_description,
        'skill': job.skill_required,
        'appointment': job.appointment_time.isoformat(),
        'province': job.province,
        'latitude': job.latitude,
        'longitude': job.longitude
    })

    return jsonify({'status': 'Notification sent and stored!', 'job_id': job.id})




@app.route('/submit_provider', methods=['POST'])
def submit_provider():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    province=request.form['province']
    skill = request.form['skill']
    latitude = float(request.form.get('latitude') or 0)
    longitude = float(request.form.get('longitude') or 0)
    password = request.form['password']

    # Hash the password before storing
    password_hash = generate_password_hash(password)

    new_provider = ServiceProvider(
        name=name,
        email=email,
        phone=phone,
        province=province,
        skill=skill,
        latitude=latitude,
        longitude=longitude,
        password_hash=password_hash  # ✅ store hash
    )

    db.session.add(new_provider)
    db.session.commit()
    flash('Service provider registered successfully!')
    return redirect(url_for('admin_panel'))


@app.route("/jobs", methods=["POST"])
def create_job():
    data = request.json or {}
    job = JobRequest(
        client_name=data["client_name"],
        job_description=data["job_description"],
        skill_required=data["skill_required"],
        appointment_time=data.get("appointment_time"),
        province=data.get("province"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude")
    )
    db.session.add(job)
    db.session.commit()

    assigned = assign_job(job)
    if assigned:
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



@app.route("/ratings", methods=["POST"])
def create_rating():
    data = request.json
    rating = Rating(
        service_provider_id=data["service_provider_id"],
        job_request_id=data["job_request_id"],
        score=data["score"],
        comment=data.get("comment")
    )
    db.session.add(rating)
    db.session.commit()
    return jsonify({"message": "Rating added", "id": rating.id})


@app.route("/payments", methods=["POST"])
def create_payment():
    data = request.json
    payment = Payment(
        service_provider_id=data["service_provider_id"],
        job_request_id=data["job_request_id"],
        amount=data["amount"],
        status="Pending"
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({"message": "Payment recorded", "id": payment.id})


# ---------------------------- MAIN ---------------------------- #

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