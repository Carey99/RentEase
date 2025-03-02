from functools import wraps
from flask import Blueprint, render_template, session, redirect, url_for, flash

dashboard_bp = Blueprint('dashboard_bp', __name__, url_prefix='/dashboard')

def role_required(required_role):
    """
    Decorator checking if the user has the required role.
    if not direct them to login page or error
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_role = session.get('role')
            if user_role != required_role:
                flash("Access Denied. You do not have permission to view this page")
                return redirect(url_for('auth_bp.login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@dashboard_bp.route('/landlord')
@role_required('landlord')
def landlord_dashboard():
    return render_template('landlord_dashboard.html')

@dashboard_bp.route('/tenant')
@role_required('tenant')
def tenant_dashboard():
    return render_template('tenant_dashboard.html')