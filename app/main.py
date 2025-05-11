from app import app, socketio
import eventlet

if __name__ == "__main__":
    eventlet.monkey_patch()  # Ensure compatibility with Flask-SocketIO
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
