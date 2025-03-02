#app/views/auth.py
from flask import Blueprint, request, jsonify, render_template, session
from app.models import User

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    # If request is GET, render signup form
    if request.method == 'GET':
        # Retrieve the role from the query params; defaults to tenant if not provided
        role = request.args.get('role', 'tenant')
        landlords = User.get_landlord()  # Fetch the list of landlords
        return render_template('signup.html', role=role, landlords=landlords)
    
    # If the request is POST, handle the signup logic
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    role = data.get("role", "tenant")  # Defaults to tenant if no role provided
    landlord_email = data.get('landlord_email')  # Get the selected landlord's email

    # Check if the two passwords match
    if password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400
    
    # Create and save the user
    try:
        user = User(email, password, role, landlord_email)
        user.save()  # Hashes the password and checks duplicates
        return jsonify({"message": "Registration successful", "role": role}), 201
    except ValueError as e:
        # e.g., if user exists or password is too short
        return jsonify({"message": str(e)}), 400

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('loginPage.html')
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = User.find_by_email(email)
    if user and user.check_password(password):
        session['role'] = user.role
        session['email'] = user.email
        return jsonify({
            "message": "Login successful",
            "role": user.role
        }), 200
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
        return jsonify({"message": "User not found"}), 404
    
    try:
        user.reset_password(new_password)
        return jsonify({"message": "Password reset successful"})
    except ValueError as e:
        return jsonify({"message": str(e)}), 400