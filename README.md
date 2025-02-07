# RentEase

📋 **A web-based rental management system for landlords and tenants to manage rent payments, tenants, bills, and properties efficiently.**

## 📑 Table of Contents
1. [About RentEase](#about-rentease)
2. [Features](#features)
3. [Folder Structure](#folder-structure)
4. [Installation](#installation)
5. [API Documentation](#api-documentation)
6. [Authentication](#authentication)
7. [Frontend Integration](#frontend-integration)
8. [Contribution](#contribution)
9. [License](#license)

---

## 📝 About RentEase
**RentEase** is a rental management system designed to help landlords and tenants track rent payments, manage tenants, houses, and bills with ease. It includes authentication, notifications, and a responsive web interface.

---

## 🛠️ Features
✅ **Tenant Management** – Add, edit, and remove tenants.  
✅ **Rent Payment Tracking** – Monitor paid, due, and overdue payments.  
✅ **House Management** – Track available, occupied, and vacant properties.  
✅ **Bill Management** – Manage utility bills and split them among tenants.  
✅ **User Authentication** – Secure login using JWT authentication.  
✅ **Notifications** – Send rent due reminders.  
✅ **Role-Based Access Control (RBAC)** – Different access for landlords and tenants.

---

## 📂 Folder Structure

```plaintext
rentease/
│
├── app/
│   ├── static/                 # Static files (CSS, JS, Images)
│   ├── templates/              # HTML templates (for email notifications)
│   ├── models.py               # Database models (MongoDB)
│   ├── views/                  # API routes
│   │   ├── auth.py             # User authentication routes
│   │   ├── tenants.py          # Tenant management routes
│   │   ├── houses.py           # House management routes
│   │   ├── bills.py            # Bill management routes
│   ├── __init__.py             # Flask app initialization
│   ├── config.py               # App configuration settings
│
├── tests/                      # Unit tests
├── migrations/                 # Database migrations
├── requirements.txt            # Python dependencies
├── run.py                      # Flask entry point
├── README.md                   # Project documentation
├── .gitignore                  # Files to ignore in Git
