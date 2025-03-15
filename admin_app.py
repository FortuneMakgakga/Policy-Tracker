from flask import Flask, render_template, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
import pandas as pd
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///claims.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'  # Needed for Flask-Admin

db = SQLAlchemy(app)

# Define the Claim model (Same as in `app.py`)
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

# Flask-Admin to manage database via UI
admin = Admin(app, name='Claims Dashboard', template_mode='bootstrap4')
admin.add_view(ModelView(Claim, db.session))  # Add Claims table to Admin UI

# Route to visualize claims data
@app.route('/')
def dashboard():
    claims = Claim.query.all()
    return render_template("dashboard.html", claims=claims)

# Route to download claims data as CSV
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
