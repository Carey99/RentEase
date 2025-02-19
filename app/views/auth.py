#app/views/auth.py
from flask import Blueprint, request, jsonify, render_template
from app.models import User

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('loginPage.html')
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.find_by_email(email)
    if user and user.check_password(password):
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401
    
@auth_bp.route('/request_reset', methods=['POST'])
def request_reset():
    data = request.get_json()
    email = data.get('email')
    user = User.find_by_email(email)
    
    if not user:
        return jsonify({"message": "User not found"}), 404
    token = user.generate_reset_token() #Normally this token would be emailed or generate a reset link
    return jsonify({"message": "reset token generated", "token": token}), 200

@auth_bp.route('/reset_password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'GET':
        return render_template('resetPasswd.html')
    
    data = request.get_json()
    email = data.get('email')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    
    if new_password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400
    
    user = User.find_by_email(email)
    if not user:
        return jsonify({"message": "User not found"}), 4040
    
    try:
        user.reset_password(new_password)
        return jsonify({"message": "Password reset successful"})
    except ValueError as e:
        return jsonify({"message": str(e)}), 400