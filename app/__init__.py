# app/__init__.py
import os
from flask import Flask
from dotenv import load_dotenv
from flask_socketio import SocketIO
from .models import init_db
from .views.auth import auth_bp
from .views.dashboard import dashboard_bp
from .views.main import main_bp
from .views.payments import payments_bp
from .views.landlord import landlord_bp
from .views.tenant import tenant_bp  # Import the tenant blueprint
from .socketio import socketio

#initialize soketio globally
#socketio = SocketIO(cors_allowed_origins="*") --> already initialized in app/socketio.py

def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "defaultsecret")
    
    #Initialize Mongodb
    init_db()
    
    #Register blue prints
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(payments_bp, url_prefix="/api")
    app.register_blueprint(landlord_bp)
    app.register_blueprint(tenant_bp)  # Register the tenant blueprint
    
    #attach socketIO to app
    socketio.init_app(app)
    
    return app