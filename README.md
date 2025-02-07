📌 RentEase - Rental Management System

🚀 A web-based rental management system for landlords and tenants to manage rent payments, tenants, bills, and properties efficiently.
📖 Table of Contents
📌 About RentEase
⚙️ Features
📂 Folder Structure
📦 Installation
🛠️ API Documentation
🔐 Authentication
🖥️ Frontend Integration
🤝 Contribution
📜 License
📌 About RentEase
RentEase is a rental management system designed to help landlords and tenants track rent payments, manage tenants, houses, and bills with ease. It includes authentication, notifications, and a responsive web interface.

⚙️ Features
✅ Tenant Management – Add, edit, and remove tenants.
✅ Rent Payment Tracking – Monitor paid, due, and overdue payments.
✅ House Management – Track available, occupied, and vacant properties.
✅ Bill Management – Manage utility bills and split them among tenants.
✅ User Authentication – Secure login using JWT authentication.
✅ Notifications – Send rent due reminders.
✅ Role-Based Access Control (RBAC) – Different access for landlords and tenants.

📂 Folder Structure

rentease/
│── app/
│   ├── static/           # Static files (CSS, JS, Images)
│   ├── templates/        # HTML templates (for email notifications)
│   ├── models.py         # Database models (MongoDB)
│   ├── views/            # API routes
│   │   ├── auth.py       # User authentication routes
│   │   ├── tenants.py    # Tenant management routes
│   │   ├── houses.py     # House management routes
│   │   ├── bills.py      # Bill management routes
│   ├── __init__.py       # Flask app initialization
│   ├── config.py         # App configuration settings
│── tests/                # Unit tests
│── migrations/           # Database migrations
│── requirements.txt      # Python dependencies
│── run.py                # Flask entry point
│── README.md             # Project documentation
│── .gitignore            # Files to ignore in Git
📦 Installation
1️⃣ Clone the Repository

git clone https://github.com/yourusername/rentease.git
cd rentease
2️⃣ Set Up Virtual Environment

python3 -m venv venv
source venv/bin/activate  # For MacOS/Linux
venv\Scripts\activate     # For Windows
3️⃣ Install Dependencies

pip install -r requirements.txt
4️⃣ Set Up Environment Variables
Create a .env file and add:

FLASK_ENV=development
SECRET_KEY=your_secret_key
MONGO_URI=mongodb+srv://your_mongodb_url
5️⃣ Run the App

flask run
Visit http://127.0.0.1:5000 in your browser.

🛠️ API Documentation
🚀 Authentication Endpoints
Method	Endpoint	Description	Required Fields
POST	/api/auth/register	Register new user	email, password, role
POST	/api/auth/login	Login user	email, password
GET	/api/auth/logout	Logout user	Token
🏠 House Management
Method	Endpoint	Description	Required Fields
GET	/api/houses	Get all houses	-
POST	/api/houses	Add a new house	name, location, rent_price
PUT	/api/houses/<id>	Update house details	name, location, rent_price
DELETE	/api/houses/<id>	Delete a house	-
👥 Tenant Management
Method	Endpoint	Description	Required Fields
GET	/api/tenants	Get all tenants	-
POST	/api/tenants	Add a new tenant	name, email, house_id
PUT	/api/tenants/<id>	Update tenant details	name, email
DELETE	/api/tenants/<id>	Remove a tenant	-
🔐 Authentication
JWT Token is required for protected routes.
Send the token in the Authorization Header:
makefile

Authorization: Bearer <your_token>
🖥️ Frontend Integration
To connect the frontend:

React.js: Use fetch or Axios to call APIs.
Example Login Request in React.js:

fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => console.log(data));
🤝 Contribution
I welcome contributions!

How to Contribute
Fork the repository.
Create a new branch (feature-branch).
Make your changes and commit.
Push to GitHub and submit a PR.
Coding Guidelines
Use Flask best practices for clean code.
Follow PEP8 coding standards.
Add comments where necessary.
Write unit tests before submitting.
📜 License
This project is licensed under the MIT License – you are free to modify and distribute it.

🔥 Let’s build RentEase together! 💡 Feel free to reach out for questions or contributions. 🚀