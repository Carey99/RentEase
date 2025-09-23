import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const DATABASE_NAME = process.env.DATABASE_NAME || "RentFlow";

if (!MONGODB_URL) {
  throw new Error('MONGODB_URL environment variable is required');
}

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URL!, {
      dbName: DATABASE_NAME,
    });
    console.log('Connected to MongoDB Atlas - RentFlow database');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Landlord Model (landlords collection)
const landlordSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'landlord' },
  phone: { type: String },
  company: { type: String },
  address: { type: String },
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  settings: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    newTenantAlerts: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true },
    currency: { type: String, default: 'KSH' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    language: { type: String, default: 'en' }
  },
}, {
  timestamps: true,
  collection: 'landlords'
});

// Tenant Model (tenants collection)
const tenantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'tenant' },
  status: { type: String, enum: ['active', 'pending', 'inactive'], default: 'active' },
  apartmentInfo: {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    propertyType: String,
    unitNumber: String,
    rentAmount: String,
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord' },
  },
  rentCycle: {
    lastPaymentDate: Date,
    nextDueDate: Date,
    daysRemaining: Number,
    rentStatus: { type: String, enum: ['active', 'overdue', 'grace_period'], default: 'active' }
  }
}, {
  timestamps: true,
  collection: 'tenants'
});

// Property Model (properties collection)
const propertySchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
  name: { type: String, required: true },
  propertyTypes: [{
    type: { type: String, required: true },
    price: { type: String, required: true },
  }],
  rentSettings: {
    paymentDay: { type: Number, default: 1, min: 1, max: 31 },
    gracePeriodDays: { type: Number, default: 3, min: 0, max: 30 }
  },
  utilities: [{
    type: { type: String, required: true },
    price: { type: String, required: true },
  }],
  totalUnits: String,
  occupiedUnits: { type: String, default: '0' },
  tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
}, {
  timestamps: true,
  collection: 'properties'
});

// Payment History Model (payment_history collection)
const paymentHistorySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, default: 'Not specified' },
  status: { type: String, enum: ['pending', 'partial', 'completed', 'overpaid', 'failed'], default: 'completed' },
  notes: String,
  // New fields for monthly balance tracking
  forMonth: { type: Number, required: true, min: 1, max: 12 }, // Month this payment is intended for
  forYear: { type: Number, required: true }, // Year this payment is intended for
  monthlyRentAmount: { type: Number, required: true, min: 0 }, // Expected rent for that month
  appliedAmount: { type: Number, required: true, min: 0 }, // How much of this payment was applied to the specific month
  creditAmount: { type: Number, default: 0, min: 0 }, // Amount that goes towards future months
}, {
  timestamps: true,
  collection: 'payment_history'
});

// Monthly Balance Model (monthly_balances collection) - tracks balance per tenant per month
const monthlyBalanceSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  expectedAmount: { type: Number, required: true, min: 0 }, // Monthly rent amount
  paidAmount: { type: Number, default: 0, min: 0 }, // Total payments received for this month
  balance: { type: Number, default: 0 }, // Remaining balance (negative if overpaid)
  status: { type: String, enum: ['pending', 'partial', 'completed', 'overpaid'], default: 'pending' },
}, {
  timestamps: true,
  collection: 'monthly_balances'
});

export const Landlord = mongoose.model('Landlord', landlordSchema);
export const Tenant = mongoose.model('Tenant', tenantSchema);
export const Property = mongoose.model('Property', propertySchema);
export const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
export const MonthlyBalance = mongoose.model('MonthlyBalance', monthlyBalanceSchema);