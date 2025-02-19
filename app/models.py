import os
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
import datetime
import secrets

client = None
db = None

def init_db():
    """
    Initializes MongoDB client and set the global db reference.
    Called once in app/__init__.py
    """
    global client, db
    load_dotenv() #loads environment variable from .env
    connection_str = os.getenv("MONGO_URI")
    client = MongoClient(connection_str)
    db = client.rentease
    
class User:
    MIN_PASSWORD_LENGTH = 8
    
    def __init__(self, email, password):
        self.email = email
        self.password = password
        
    def save(self):
        if len(self.password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {self.MIN_PASSWORD_LENGTH} characters.")
        
        existing_user = db.tenants.find_one({"email": self.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        hashed = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        result = db.tenants.insert_one({
            "email": self.email,
            "password": hashed
        })
        return result.inserted_id
    
    def check_password(self, candidate_password):
        return bcrypt.checkpw(candidate_password.encode('utf-8'), self.password.encode('utf-8'))
    
    @classmethod
    def find_by_email(cls, email):
        user_data = db.tenants.find_one({"email": email})
        if user_data:
            return cls(user_data["email"], user_data["password"])
        return None
    
    def generate_reset_token(self, expires_in=3600):
        token = secrets.token_urlsafe(32)
        expiration = datetime.datetime.now() + datetime.timedelta(seconds=expires_in)
        db.tenants.update_one(
            {"email": self.email},
            {"$set": {"reset_token": token, "reset_token_expires": expiration}}
        )
        return token
    
    def reset_password(self, new_password, token=None):
        if len(new_password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"New password must be at least {self.MIN_PASSWORD_LENGTH} characters.")
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.tenants.update_one({"email": self.email}, {"$set": {"password": hashed}})
        return True