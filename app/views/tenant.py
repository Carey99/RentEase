from flask import Blueprint, jsonify, session, request, render_template
from app.models import User
import os
from werkzeug.utils import secure_filename

# Create a Blueprint for tenant-related routes
tenant_bp = Blueprint('tenant_bp', __name__)

# Folder where uploaded profile pictures will be stored
UPLOAD_FOLDER = 'path/to/upload/folder'
# Allowed file extensions for profile picture uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """
    Check if the uploaded file has an allowed extension.
    Returns True if allowed, otherwise False.
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@tenant_bp.route('/settings/tenant', methods=['GET'])
def tenant_settings():
    """
    Render the tenant settings page.
    This page displays the form where tenants can update their details.
    """
    return render_template('tenant_settings.html')

@tenant_bp.route('/api/tenant/info', methods=['GET'])
def get_tenant_info():
    """
    Retrieve tenant information based on the email stored in the session.
    Returns a JSON object containing the tenant's details.
    """
    tenant_email = session.get('email')
    # Ensure the user is logged in
    if not tenant_email:
        return jsonify({"message": "Unauthorized"}), 401

    # Find the tenant in the database
    tenant = User.find_by_email(tenant_email)
    if not tenant or tenant.role != "tenant":
        return jsonify({"message": "Tenant not found"}), 404

    # Return tenant info as JSON
    return jsonify({
        "first_name": tenant.first_name,
        "last_name": tenant.last_name,
        "email": tenant.email,
        "phone": tenant.phone,
        "house_type": tenant.house_type
    }), 200

@tenant_bp.route('/api/tenant/settings', methods=['POST'])
def update_tenant_settings():
    """
    Update tenant settings from the submitted form data.
    Allows updating of basic information (first name, last name, phone, house type),
    optional profile picture upload, and password update if provided.
    """
    tenant_email = session.get('email')
    # Ensure the user is logged in
    if not tenant_email:
        return jsonify({"message": "Unauthorized"}), 401

    # Retrieve the tenant from the database
    tenant = User.find_by_email(tenant_email)
    if not tenant or tenant.role != "tenant":
        return jsonify({"message": "Tenant not found"}), 404

    # Update basic tenant information from the form data
    tenant.first_name = request.form.get('first_name')
    tenant.last_name = request.form.get('last_name')
    tenant.phone = request.form.get('phone')
    tenant.house_type = request.form.get('house_type')

    # Handle password update only if both current and new password fields are provided and non-empty
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    if current_password and new_password:
        # Verify the current password is correct before updating
        if not tenant.check_password(current_password):
            return jsonify({"message": "Current password is incorrect"}), 400
        # Set the new password (the save() method will handle hashing)
        tenant.password = new_password

    # Handle profile picture upload if provided and allowed
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and allowed_file(file.filename):
            # Secure the filename and save the file to the designated UPLOAD_FOLDER
            filename = secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_FOLDER, filename))
            tenant.profile_picture = filename

    # Save the updated tenant settings to the database
    tenant.save()
    return jsonify({"message": "Settings updated successfully"}), 200
