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


## 🚀 Installation

1. **Clone the Repository**

```plaintext
git clone https://github.com/Carey99/Rentease.git
cd rentease

2. **Set Up Virtual Environment**
```plaintext
python3 -m venv venv
source venv/bin/activate   # For MacOS/Linux
venv\Scripts\activate      # For Windows

3. **Install Dependencies**
```plaintext
pip install -r requirements.txt

4 **Run the Application**
```plaintext
python run.py


## 📚 API Documentation
Documentation for the API routes will be available soon. Stay tuned for updates!


## 🔒 Authentication
The RentEase app uses JWT (JSON Web Token) for user authentication and role-based access control.


## 🖥️ Frontend Integration
The frontend of RentEase will be built using React.js. Further instructions on how to integrate the backend with the frontend will be provided in future updates.

## 🤝 Contribution
Contributions are welcome!
Feel free to open issues or submit pull requests to improve the app.

## 📜 License
This project is licensed under the MIT License.
See the LICENSE file for details.

### How to Ensure This Works on GitHub:
1. Copy and paste the above content into your `README.md` file.
2. Save the file and push it to your GitHub repository:
   ```bash
   git add README.md
   git commit -m "Update README"
   git push origin main