from flask import Flask, render_template, send_from_directory, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from sqlalchemy import inspect, text
import os

app = Flask(__name__, static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="*")

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///service_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey'

db = SQLAlchemy(app)

# Models
class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)

class JobNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(100))
    job_desc = db.Column(db.String(200))
    skill = db.Column(db.String(50))
    appointment = db.Column(db.String(50))
    distance = db.Column(db.String(50))

class JobAdmin(ModelView):
    can_edit = True
    can_delete = True
    column_editable_list = ['client_name', 'job_desc', 'skill', 'appointment', 'distance']

# Flask-Admin setup
admin = Admin(app, name='Service App Admin', template_mode='bootstrap4')
admin.add_view(JobAdmin(JobNotification, db.session))

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/admin')
def admin_view():
    return redirect('/admin/')

@app.route('/edit/<int:job_id>', methods=['POST'])
def edit_job(job_id):
    job = JobNotification.query.get(job_id)
    if job:
        job.client_name = request.form['client_name']
        job.job_desc = request.form['job_desc']
        job.skill = request.form['skill']
        job.appointment = request.form['appointment']
        job.distance = request.form['distance']
        db.session.commit()
    return redirect(url_for('admin'))

@app.route('/delete/<int:job_id>')
def delete_job(job_id):
    job = JobNotification.query.get(job_id)
    if job:
        db.session.delete(job)
        db.session.commit()
    return redirect(url_for('admin'))

@app.route('/send_notification', methods=['POST'])
def send_notification():
    data = request.json
    job = JobNotification(client_name=data['clientName'], job_desc=data['jobDesc'], skill=data['skill'], appointment=data['appointment'], distance=data['distance'])
    db.session.add(job)
    db.session.commit()
    socketio.emit('receive_notification', data)
    return jsonify({'status': 'Notification sent'}), 200

@app.route('/service_provider')
def service_provider():
    return render_template('service_provider.html')

@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.static_folder, filename)

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
""" from flask import Flask, render_template, send_from_directory, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect,text
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__, static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="*")

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///service_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class ServiceProvider(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)

class JobNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(100))
    job_desc = db.Column(db.String(200))
    skill = db.Column(db.String(50))
    appointment = db.Column(db.String(50))
    distance = db.Column(db.String(50))

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/client')
def client():
    return render_template('client.html')

@app.route('/admin')
def admin():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    data = {}
    for table_name in tables:
        table_data = db.session.execute(text(f'SELECT * FROM {table_name}')).fetchall()
        columns = db.session.execute(text(f'PRAGMA table_info({table_name})')).fetchall()

        columns = db.session.execute(f'PRAGMA table_info({table_name})').fetchall()
        col_names = [col[1] for col in columns]
        data[table_name] = {'columns': col_names, 'rows': table_data}
    return render_template('admin.html', data=data)

@app.route('/edit/<int:job_id>', methods=['POST'])
def edit_job(job_id):
    job = JobNotification.query.get(job_id)
    if job:
        job.client_name = request.form['client_name']
        job.job_desc = request.form['job_desc']
        job.skill = request.form['skill']
        job.appointment = request.form['appointment']
        job.distance = request.form['distance']
        db.session.commit()
    return redirect(url_for('admin'))

@app.route('/delete/<int:job_id>')
def delete_job(job_id):
    job = JobNotification.query.get(job_id)
    if job:
        db.session.delete(job)
        db.session.commit()
    return redirect(url_for('admin'))

@app.route('/send_notification', methods=['POST'])
def send_notification():
    data = request.json
    job = JobNotification(client_name=data['clientName'], job_desc=data['jobDesc'], skill=data['skill'], appointment=data['appointment'], distance=data['distance'])
    db.session.add(job)
    db.session.commit()
    socketio.emit('receive_notification', data)
    return jsonify({'status': 'Notification sent'}), 200

@app.route('/service_provider')
def service_provider():
    return render_template('service_provider.html')

@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, use_reloader=False) """