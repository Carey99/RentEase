#!/usr/bin/python3
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
import os

#loads environment variable from .env
load_dotenv()

#Gets connection string from the variable in .env
connection_str = os.getenv("DB_URL")

#Intialize client
try:
    client = MongoClient(connection_str)
    print(client.list_database_names())
except Exception as e:
    print("Error:", e)

#Access both db and its collection
db = client.rentease
collection = db.tenants

#try creating user
test_user = {"name" : "John Doe", "email" : "johndoe@gmail.com"}

#insert user into collection
try:
    collection.insert_one(test_user)
except DuplicateKeyError:
    print("Email exists!")

#Retrieve saved user
user1 = collection.find_one({"email": "johndoe@gmail.com"})
print("Test User: ", user1)