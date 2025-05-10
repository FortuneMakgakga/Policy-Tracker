from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing
socketio = SocketIO(app, cors_allowed_origins="*")  # Enable WebSockets

# Store active service providers (SPs)
active_sps = {}

# Store requests
service_requests = {}

@app.route('/')
def home():
    return "Service Request System Running!"

# Client sends a service request
@app.route('/request_help', methods=['POST'])
def request_help():
    data = request.json
    request_id = len(service_requests) + 1  # Generate a simple request ID
    service_requests[request_id] = {
        "client": data["client_name"],
        "location": data["location"],
        "status": "pending"
    }

    # Notify all active SPs
    socketio.emit('new_request', {"request_id": request_id, "data": service_requests[request_id]})

    return jsonify({"message": "Request sent!", "request_id": request_id})

# SP joins and listens for requests
@socketio.on('join')
def handle_join(data):
    sp_name = data["sp_name"]
    active_sps[sp_name] = request.sid  # Store SP connection
    print(f"{sp_name} joined")

# SP accepts a request
@socketio.on('accept_request')
def handle_accept(data):
    request_id = data["request_id"]
    sp_name = data["sp_name"]

    if request_id in service_requests:
        service_requests[request_id]["status"] = "accepted"
        service_requests[request_id]["accepted_by"] = sp_name

        # Notify all clients and SPs
        socketio.emit('request_accepted', {"request_id": request_id, "sp_name": sp_name})

        return "Request accepted"

    return "Request not found"

# SP rejects a request
@socketio.on('reject_request')
def handle_reject(data):
    request_id = data["request_id"]
    sp_name = data["sp_name"]

    if request_id in service_requests:
        service_requests[request_id]["status"] = "rejected"
        
        # Notify all clients and SPs
        socketio.emit('request_rejected', {"request_id": request_id, "sp_name": sp_name})

        return "Request rejected"

    return "Request not found"

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

