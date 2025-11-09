# 🏠 RentEase - Smart Rent Collection Platform

**Automated rent collection platform for Kenya with M-Pesa integration**

🌐 **Live App**: [https://rentease-e5g5.onrender.com](https://rentease-e5g5.onrender.com)

[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://rentease-e5g5.onrender.com)
[![MongoDB](https://img.shields.io/badge/database-MongoDB%20Atlas-green)](https://www.mongodb.com)
[![Paystack](https://img.shields.io/badge/payments-Paystack-blue)](https://paystack.com)

---

## 🚀 Features

### For Landlords
- 📊 **Property Management** - Add and manage multiple properties
- 👥 **Tenant Management** - Track tenant information and lease details
- 💰 **Automated Billing** - Automatic rent generation every month
- 📱 **M-Pesa Integration** - Collect rent via mobile money (Paystack)
- 🔔 **Real-time Notifications** - Get instant payment alerts
- 📈 **Analytics Dashboard** - Track income, occupancy, and arrears

### For Tenants
- 📱 **Pay with M-Pesa** - One-click STK Push payments
- 📜 **Payment History** - View all past transactions
- 🔔 **Bill Reminders** - Never miss a payment deadline
- 📊 **Dashboard** - Track rent status and account balance

### Payment Features
- ✅ **Mobile Money (M-Pesa)** - Direct payments to landlord's phone
- ✅ **Bank Account** - Settlements to any Kenyan bank
- ✅ **Subaccounts** - Each landlord has their own receiving account
- ✅ **Real-time Webhooks** - Instant payment confirmation
- ✅ **Payment Tracking** - Complete audit trail for all transactions

---

## 🛠️ Tech Stack

### Frontend
- **React** + **TypeScript** - Type-safe UI components
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first styling
- **Shadcn/UI** - Beautiful component library
- **React Query** - Data fetching and caching
- **React Hook Form** - Form validation
- **WebSocket** - Real-time notifications

### Backend
- **Node.js** + **Express** - RESTful API
- **TypeScript** - Type safety
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication
- **Paystack SDK** - Payment gateway integration
- **WebSocket** - Real-time communication

### Infrastructure
- **Render.com** - Hosting and deployment
- **MongoDB Atlas** - Cloud database
- **Paystack** - Payment processing
- **GitHub** - Version control and CI/CD

---

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Paystack account (test mode)

### Installation

```bash
# Clone the repository
git clone https://github.com/Carey99/RentEase.git
cd RentEase

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev

# Open browser
# http://localhost:5173
```

### Test Accounts
```
Landlord:
Email: landlord@example.com
Password: password123

Tenant:
Email: tenant@example.com
Password: password123
```

---

## 🚀 Deployment

RentEase is deployment-ready for Render.com with automatic CI/CD.

**See complete deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deploy to Render

1. Push code to GitHub
2. Connect Render to your repository
3. Render auto-detects configuration from `render.yaml`
4. Add environment variables
5. Deploy! 🎉

**Deployment time**: ~5 minutes

---

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)** - Complete deployment instructions
- **[Paystack Integration](./PAYSTACK_INTEGRATION.md)** - Payment gateway setup
- **[Environment Variables](./.env.example)** - Configuration reference

---

## 🔐 Environment Variables

Required environment variables:

```env
# Database
MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=RentFlow

# Server
NODE_ENV=development
PORT=5000
JWT_SECRET=your_jwt_secret

# Frontend
FRONTEND_URL=http://localhost:5173

# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxx
PAYSTACK_ENV=test
```

See [.env.example](./.env.example) for complete list.

---

## 📖 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/current/:id` - Get current user

### Properties
- `POST /api/properties` - Create property
- `GET /api/properties/landlord/:landlordId` - Get landlord's properties
- `PUT /api/properties/:id` - Update property

### Tenants
- `GET /api/tenants/landlord/:landlordId` - Get landlord's tenants
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant

### Payments
- `POST /api/payments/initiate` - Initiate M-Pesa payment
- `GET /api/payments/:id/status` - Check payment status
- `POST /api/webhooks/paystack` - Paystack webhook endpoint

### Health Check
- `GET /health` - Application health status

---

## 🧪 Testing

```bash
# Run tests (coming soon)
npm test

# Type check
npm run check

# Build for production
npm run build

# Start production server
npm start
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Carey**  
GitHub: [@Carey99](https://github.com/Carey99)

---

## 🙏 Acknowledgments

- [Paystack](https://paystack.com) - Payment gateway for Africa
- [Render](https://render.com) - Cloud hosting platform
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database as a service
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful React components

---

## 📞 Support

For support, email carey@rentease.com or open an issue on GitHub.

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] User authentication
- [x] Property management
- [x] Tenant management
- [x] Automated rent billing
- [x] Paystack M-Pesa integration
- [x] Real-time notifications
- [x] Deployment ready

### Phase 2: Enhanced Features (In Progress)
- [ ] SMS notifications
- [ ] Email notifications
- [ ] Payment receipts (PDF)
- [ ] Advanced analytics
- [ ] Utility bill tracking
- [ ] Maintenance requests

### Phase 3: Advanced (Planned)
- [ ] Mobile app (React Native)
- [ ] Multi-currency support
- [ ] Property marketplace
- [ ] Automated invoicing
- [ ] Accounting integration
- [ ] Tenant screening

---

## 📊 Project Status

- **Version**: 1.0.0
- **Status**: ✅ Production Ready
- **Last Updated**: November 9, 2025
- **Deployment**: Ready for Render.com

---

**Made with ❤️ in Kenya 🇰🇪**
