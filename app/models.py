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
    Initializes MongoDB client and sets the global db reference.
    Called once in app/__init__.py.
    """
    global client, db
    load_dotenv()  # loads environment variables from .env
    connection_str = os.getenv("MONGO_URI")
    client = MongoClient(connection_str)
    db = client.rentease

class User:
    MIN_PASSWORD_LENGTH = 8

    def __init__(self, email, password, role="tenant", landlord_email=None, first_name=None, last_name=None, phone=None, profile_picture=None, house_type=None):
        self.email = email
        self.password = password
        self.role = role
        self.landlord_email = landlord_email
        self.first_name = first_name
        self.last_name = last_name
        self.phone = phone
        self.profile_picture = profile_picture
        self.house_type = house_type

    def save(self):
        if len(self.password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {self.MIN_PASSWORD_LENGTH} characters.")

        # Choose collection based on role
        collection = db.landlords if self.role == "landlord" else db.tenants
        existing_user = collection.find_one({"email": self.email})

        # Hash the password
        hashed = bcrypt.hashpw(self.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        if existing_user:
            result = collection.update_one(
                {"email": self.email},
                {"$set": {
                    "password": hashed,
                    "first_name": self.first_name,
                    "last_name": self.last_name,
                    "phone": self.phone,
                    "profile_picture": self.profile_picture,
                    "house_type": self.house_type
                }}
            )
        else:
            result = collection.insert_one({
                "email": self.email,
                "password": hashed,
                "role": self.role,
                "first_name": self.first_name,
                "last_name": self.last_name,
                "phone": self.phone,
                "profile_picture": self.profile_picture,
                "house_type": self.house_type
            })

        # If the user is a tenant, add them to the landlord's dashboard (if landlord_email is provided)
        if self.role == "tenant" and self.landlord_email:
            landlord_collection = db.landlords
            landlord_collection.update_one(
                {"email": self.landlord_email},
                {"$push": {"tenants": {"name": self.email, "status": "overdue"}}}
            )
        return result.upserted_id if not existing_user else result.modified_count

    def get_tenants(self):
        if self.role != "landlord":
            raise ValueError("Only landlords can have tenants")
        landlord_collection = db.landlords
        landlord = landlord_collection.find_one({"email": self.email})
        return landlord.get("tenants", [])

    def check_password(self, candidate_password):
        return bcrypt.checkpw(candidate_password.encode('utf-8'), self.password.encode('utf-8'))

    @classmethod
    def find_by_email(cls, email, role=None):
        if role == "landlord":
            user_data = db.landlords.find_one({"email": email})
            if user_data:
                return cls(
                    email=user_data["email"],
                    password=user_data["password"],
                    role=user_data.get("role", "landlord"),
                    landlord_email=user_data.get("landlord_email"),
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                    phone=user_data.get("phone"),
                    profile_picture=user_data.get("profile_picture"),
                    house_type=user_data.get("house_type")
                )
        elif role == "tenant":
            user_data = db.tenants.find_one({"email": email})
            if user_data:
                return cls(
                    email=user_data["email"],
                    password=user_data["password"],
                    role=user_data.get("role", "tenant"),
                    landlord_email=user_data.get("landlord_email"),
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                    phone=user_data.get("phone"),
                    profile_picture=user_data.get("profile_picture"),
                    house_type=user_data.get("house_type")
                )
        else:
            # Search in landlords first
            user_data = db.landlords.find_one({"email": email})
            if user_data:
                return cls(
                    email=user_data["email"],
                    password=user_data["password"],
                    role=user_data.get("role", "landlord"),
                    landlord_email=user_data.get("landlord_email"),
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                    phone=user_data.get("phone"),
                    profile_picture=user_data.get("profile_picture"),
                    house_type=user_data.get("house_type")
                )
            # Then search in tenants
            user_data = db.tenants.find_one({"email": email})
            if user_data:
                return cls(
                    email=user_data["email"],
                    password=user_data["password"],
                    role=user_data.get("role", "tenant"),
                    landlord_email=user_data.get("landlord_email"),
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                    phone=user_data.get("phone"),
                    profile_picture=user_data.get("profile_picture"),
                    house_type=user_data.get("house_type")
                )
        return None

    def generate_reset_token(self, expires_in=3600):
        token = secrets.token_urlsafe(32)
        expiration = datetime.datetime.now() + datetime.timedelta(seconds=expires_in)
        collection = db.landlords if self.role == "landlord" else db.tenants
        collection.update_one(
            {"email": self.email},
            {"$set": {"reset_token": token, "reset_token_expires": expiration}}
        )
        return token

    def reset_password(self, new_password, token=None):
        if len(new_password) < self.MIN_PASSWORD_LENGTH:
            raise ValueError(f"New password must be at least {self.MIN_PASSWORD_LENGTH} characters.")
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        collection = db.landlords if self.role == "landlord" else db.tenants
        collection.update_one({"email": self.email}, {"$set": {"password": hashed}})
        return True

    @staticmethod
    def get_landlord():
        """
        Fetches the list of landlords from the database.
        """
        landlord_collection = db.landlords
        landlords = landlord_collection.find({"role": "landlord"}, {"email": 1, "_id": 0})
        return [landlord["email"] for landlord in landlords]
