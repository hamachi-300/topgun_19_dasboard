# Save this file as server.py
import logging
from flask import Flask, request, jsonify
from functools import wraps

# --- Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
app = Flask(__name__)

# Define your secret token. In a real app, get this from an environment variable!
TOKEN = "my-super-secret-token-123"

# --- Token Check Decorator ---
def token_required(f):
    """
    A decorator function to check for a valid token in the request headers.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the token from the 'X-Auth-Token' header
        token = request.headers.get('x-camera-token')

        # 1. Check if the token is missing
        if not token:
            logging.warning("Request rejected: Missing X-Auth-Token header.")
            return jsonify({"status": "error", "message": "Unauthorized: Token is missing"}), 401
        
        # 2. Check if the token is incorrect
        if token != TOKEN:
            logging.warning(f"Request rejected: Invalid token provided '{token}'.")
            return jsonify({"status": "error", "message": "Unauthorized: Token is invalid"}), 401
        
        # 3. Token is valid, proceed with the original function
        return f(*args, **kwargs)
    
    return decorated_function

# --- Server Route ---
@app.route('/log', methods=['POST'])
@token_required  # Apply the token checker decorator to this route
def log_request():
    """
    Receives a JSON request, logs its content, 
    and returns a success response.
    This route is now protected and requires a valid token.
    """
    data = request.json
    
    logging.info(f"Received data (authenticated): {data}")
    
    response = {
        "status": "success",
        "message": "Data logged successfully",
        "received_data": data
    }
    return jsonify(response), 200

# --- Run the Server ---
if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    print("Listening for requests at /log (token required)...")
    app.run(host='0.0.0.0', port=3000)