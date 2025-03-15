from flask import Flask, render_template, send_file, flash, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_admin.actions import action
import pandas as pd
import os

# Initialize Flask App
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(app.instance_path, "claims.db").replace("\\", "/")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'  # Needed for Flask-Admin

# Initialize Database
db = SQLAlchemy(app)

# Define the Claim Model
class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.Integer, nullable=False)
    claim_type = db.Column(db.String(50), nullable=False)
    incident_date = db.Column(db.String(50), nullable=False)
    incident_location = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    claim_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default="Pending")
    claimant_name = db.Column(db.String(100), nullable=False)
    contact_number = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)

# ✅ Custom Admin View for Claim Management
class ClaimAdmin(ModelView):
    can_create = False  # Users cannot create new claims from the admin panel
    can_edit = True     # ✅ Enable editing claims
    can_delete = True   # ✅ Enable deleting claims
    column_editable_list = ['status', 'claim_type', 'incident_date', 'claim_amount']
    column_searchable_list = ['claimant_name', 'policy_id', 'status']
    column_filters = ['claim_type', 'status']
    form_choices = {
        'status': [
            ('Pending', 'Pending'),
            ('Approved', 'Approved'),
            ('Rejected', 'Rejected')
        ]
    }  # Allow dropdown selection for status

    # ✅ Bulk Approve Claims
    @action('approve', 'Approve Selected', 'Are you sure you want to approve these claims?')
    def action_approve(self, ids):
        for claim_id in ids:
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Approved"
        db.session.commit()
        flash(f"✅ {len(ids)} claim(s) approved!", "success")
        return redirect('/admin/claim')

    # ✅ Bulk Reject Claims
    @action('reject', 'Reject Selected', 'Are you sure you want to reject these claims?')
    def action_reject(self, ids):
        for claim_id in ids:
            claim = Claim.query.get(claim_id)
            if claim:
                claim.status = "Rejected"
        db.session.commit()
        flash(f"❌ {len(ids)} claim(s) rejected!", "danger")
        return redirect('/admin/claim')

# ✅ Initialize Flask-Admin
admin = Admin(app, name='Claims Dashboard', template_mode='bootstrap4')
admin.add_view(ClaimAdmin(Claim, db.session))  # Add Claims Table to Admin

# ✅ Route to View Claims Dashboard
@app.route('/')
def dashboard():
    claims = Claim.query.all()
    return render_template("dashboard.html", claims=claims)

# ✅ Route to Download Claims Data as CSV
@app.route('/download')
def download():
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
    filename = "claims_data.csv"
    df.to_csv(filename, index=False)

    return send_file(filename, as_attachment=True, mimetype="text/csv")

# ✅ Route to Download Claims Data as Excel
@app.route('/export-excel')
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

    os.makedirs("downloads", exist_ok=True)  # Ensure "downloads" folder exists
    filename = os.path.join("downloads", "claims_data.xlsx")
    df.to_excel(filename, index=False)

    return send_file(filename, as_attachment=True, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

# ✅ Dark Mode for Flask-Admin
from flask_admin import helpers

@app.context_processor
def override_admin_template():
    return dict(
        admin_base_css="https://cdn.jsdelivr.net/npm/bootswatch@5.3.2/dist/darkly/bootstrap.min.css"
    )


# ✅ Initialize Database & Run App
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
