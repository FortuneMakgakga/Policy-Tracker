from flask import Flask, render_template, send_from_directory
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
    app.run(debug=True, use_reloader=False)