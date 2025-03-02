#This file handles event
from flask_socketio import emit, join_room, leave_room
from flask import session
from app import socketio

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {session.get('email')}")
    
@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {session.get('email')}")
 
@socketio.on('join_dashboard')
def join_dashboard(data):
    """Allows users to jon the land"""   
@socketio.on('rent_payment')
def handle_rent_payment(data):
    print(f'Received payment update: {data}')
    emit('payment_update', data, broadcast=True)