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

admin = Admin(app, name='Claims Admin', template_mode='bootstrap4')
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
