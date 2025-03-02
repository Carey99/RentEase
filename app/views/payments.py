from flask import Blueprint, request, jsonify
from app.socketio import socketio

payments_bp = Blueprint('payments_bp', __name__)

@payments_bp.route('/pay', methods=['POST'])
def process_payment():
    data = request.get_json()
    tenant_email = data.get('email')
    amount = data.get('amount')
    
    if not tenant_email or not amount:
        return jsonify({"message": "Missing payment info"}), 400
    
    # Simulate saving payment to DB
    # db.payments.insert_one({...})
    
    # Emit real-time event to landlord's dashboard
    socketio.emit('update_dashboard', {
        'tenant': tenant_email,
        'amount': amount,
        'message': f"{tenant_email} paid ${amount}"
    }, broadcast=True) #or to a specific room
    
    return jsonify({"message": "Payment processed successfully"}), 200