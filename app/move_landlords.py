#!/usr/bin/python3
import os
from pymongo import MongoClient
from dotenv import load_dotenv

def move_landlords():
    load_dotenv() #load environment variables
    connection_str = os.getenv("MONGO_URI")
    client = MongoClient(connection_str)
    db = client.rentease
    
    #find all landlords in tenants colection
    landlords = db.tenants.find({"role": "landlord"})
    
    for landlord in landlords:
        #insert landlord into landlord colection
        db.landlords.insert_one(landlord)
        #remove landlord from tenant collection
        db.tenants.delete_one({"_id": landlord["_id"]})
        
    print("Landlord moved successfully")
    
if __name__ == "__main__":
    move_landlords()