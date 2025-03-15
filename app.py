from flask import Flask, render_template, request, jsonify, send_from_directory
import os
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__, static_folder="static")
#app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///claims.db'
#app.config['SQLALCHEMY_DATABASE_URI'] = os.path.join(os.getcwd(), 'claims.db')
#app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(os.getcwd(), "claims.db").replace("\\", "/")

#I added this new line to fix the path issue so that all changes are saved to the database
app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(app.instance_path, "claims.db").replace("\\", "/")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = True

db = SQLAlchemy(app)

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

with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return render_template("index.html")

@app.route('/track')
def track():
    return render_template("track.html")

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/api/claims', methods=['POST'])
def register_claim():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request. No JSON data received'}), 400

    required_fields = ['policy_id', 'claim_type', 'incident_date', 'incident_location', 
                       'description', 'claim_amount', 'claimant_name', 'contact_number', 'email']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        new_claim = Claim(
            policy_id=int(data['policy_id']),
            claim_type=data['claim_type'],
            incident_date=data['incident_date'],
            incident_location=data['incident_location'],
            description=data['description'],
            claim_amount=float(data['claim_amount']),
            claimant_name=data['claimant_name'],
            contact_number=data['contact_number'],
            email=data['email']
        )
        db.session.add(new_claim)
        db.session.commit()
        return jsonify({'message': 'Claim registered successfully', 'claim_id': new_claim.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

@app.route('/api/claims/<int:claim_id>', methods=['GET'])
def get_claim_status(claim_id):
    if claim_id <= 0:
        return jsonify({'error': 'Invalid claim ID'}), 400

    claim = Claim.query.get(claim_id)
    if claim:
        return jsonify({
            'claim_id': claim.id,
            'status': claim.status,
            'claim_type': claim.claim_type,
            'incident_date': claim.incident_date,
            'incident_location': claim.incident_location,
            'description': claim.description,
            'claim_amount': claim.claim_amount,
            'claimant_name': claim.claimant_name
        })
    return jsonify({'error': 'Claim not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
