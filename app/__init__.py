# app/__init__.py
import os
from flask import Flask
from dotenv import load_dotenv
from .models import init_db
from .views.auth import auth_bp

def create_app():
    load_dotenv
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "defaultsecret")
    
    #Initialize Mongodb
    init_db()
    
    #Register blue prints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    
    return app