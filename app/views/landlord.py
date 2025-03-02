from flask import Blueprint, jsonify, session, request, render_template
from app.models import User
import os
from werkzeug.utils import secure_filename

# Define the blueprint for landlord routes
landlord_bp = Blueprint('landlord_bp', __name__)

# Define the upload folder and allowed file extensions for profile pictures
UPLOAD_FOLDER = 'path/to/upload/folder'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """
    Check if the uploaded file's extension is allowed.
    Returns True if allowed, False otherwise.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@landlord_bp.route('/api/landlord/tenants', methods=['GET'])
def get_tenants():
    """
    Retrieve the list of tenants associated with the logged-in landlord.
    This route fetches the landlord from the session and then returns the tenants
    along with their payment status and house type.
    """
    landlord_email = session.get('email')
    if not landlord_email:
        return jsonify({"message": "Unauthorized"}), 401

    # Find the landlord user based on email
    landlord = User.find_by_email(landlord_email)
    if not landlord or landlord.role != "landlord":
        return jsonify({"message": "Landlord not found"}), 404

    # Retrieve tenants from the landlord's record
    tenants = landlord.get_tenants()
    tenant_list = []
    for tenant in tenants:
        # Retrieve tenant details using their email (stored as 'name' in the tenants array)
        tenant_user = User.find_by_email(tenant['name'], role="tenant")
        if tenant_user:
            tenant_list.append({
                "name": tenant_user.email,
                "status": tenant['status'],
                "house_type": tenant_user.house_type
            })

    return jsonify(tenant_list), 200

@landlord_bp.route('/settings', methods=['GET'])
def settings():
    """
    Render the settings page for the landlord.
    """
    return render_template('settings.html')

@landlord_bp.route('/api/landlord/info', methods=['GET'])
def get_landlord_info():
    """
    Retrieve the landlord's personal information based on the session email.
    Returns a JSON object containing first name, last name, email, and phone.
    """
    landlord_email = session.get('email')
    if not landlord_email:
        return jsonify({"message": "Unauthorized"}), 401

    # Find the landlord in the database
    landlord = User.find_by_email(landlord_email)
    if not landlord or landlord.role != "landlord":
        return jsonify({"message": "Landlord not found"}), 404

    return jsonify({
        "first_name": landlord.first_name,
        "last_name": landlord.last_name,
        "email": landlord.email,
        "phone": landlord.phone
    }), 200

@landlord_bp.route('/api/landlord/settings', methods=['POST'])
def update_landlord_settings():
    """
    Update the landlord's settings based on the submitted form data.
    This route allows updating of basic information (first name, last name, phone),
    the profile picture, and optionally the password.
    
    Password update is performed only if both the current and new password fields are provided
    and non-empty. If they are left empty, the password remains unchanged.
    """
    landlord_email = session.get('email')
    if not landlord_email:
        return jsonify({"message": "Unauthorized"}), 401

    # Retrieve the landlord from the database
    landlord = User.find_by_email(landlord_email)
    if not landlord or landlord.role != "landlord":
        return jsonify({"message": "Landlord not found"}), 404

    # Update landlord's basic information from the form data
    landlord.first_name = request.form.get('first_name')
    landlord.last_name = request.form.get('last_name')
    landlord.phone = request.form.get('phone')
    
    # Update password only if both current and new password fields are provided and non-empty
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    if current_password and new_password:
        # Verify that the current password is correct
        if not landlord.check_password(current_password):
            return jsonify({"message": "Current password is incorrect"}), 400
        # Set the new password (the save() method will handle hashing)
        landlord.password = new_password

    # Handle profile picture upload if a file is provided and its extension is allowed
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and allowed_file(file.filename):
            # Secure the filename and save the file to the UPLOAD_FOLDER
            filename = secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_FOLDER, filename))
            landlord.profile_picture = filename

    # Save the updated landlord information to the database
    landlord.save()
    return jsonify({"message": "Settings updated successfully"}), 200
