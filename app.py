from flask import Flask, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__, static_folder='static')
socketio = SocketIO(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///service_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)

class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    appointment_time = db.Column(db.String(50))
    distance = db.Column(db.String(50))
    service_provider_id = db.Column(db.Integer, db.ForeignKey('service_provider.id'))

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/service_provider')
def service_provider():
    return render_template('service_provider.html')

@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.static_folder, filename)

@socketio.on('send_notification')
def handle_notification(data):
    print(f'Received notification: {data}')
    emit('receive_notification', data, broadcast=True)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, use_reloader=False)




# Directory structure
# flask_service_app/
# ├── app.py                   # Main Flask application
# ├── templates/               # HTML templates folder
# │   ├── home.html            # Home page template
# │   ├── client.html          # Client page template
# │   └── service_provider.html # Service Provider page template
# ├── static/                  # Static files (CSS, JS, images)
# │   └── styles.css           # Stylesheet for the app
# └── requirements.txt         # Python dependencies









#Initial Working Code:  
""" from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__, static_folder='static')

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/service_provider')
def service_provider():
    return render_template('service_provider.html')

@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False) """