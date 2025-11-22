import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Only load .env file in development (Render injects env vars directly in production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Accept both MONGODB_URL and MONGODB_URI (Render uses MONGODB_URI by default)
const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI;
const MONGODB_LOCAL_URL = process.env.MONGODB_LOCAL_URL || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || "RentFlow";

if (!MONGODB_URL && !process.env.USE_LOCAL_DB) {
  console.error('❌ MongoDB connection string not found!');
  console.error('Available MongoDB env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
  console.error('Please set either MONGODB_URL or MONGODB_URI in your environment variables.');
  throw new Error('MongoDB connection string is required (set MONGODB_URL or MONGODB_URI, or USE_LOCAL_DB=true for local MongoDB)');
}

export async function connectToDatabase() {
  // Determine which MongoDB to use
  const useLocal = process.env.USE_LOCAL_DB === 'true';
  const connectionUrl = useLocal ? MONGODB_LOCAL_URL : MONGODB_URL!;
  const dbType = useLocal ? 'Local MongoDB' : 'MongoDB Atlas';
  
  try {
    // Add connection options for better network handling
    const options: any = {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: useLocal ? 5000 : 10000, // Shorter timeout for local
      socketTimeoutMS: useLocal ? 30000 : 45000,
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };
    
    // Only add these options for Atlas (not local MongoDB)
    if (!useLocal) {
      options.retryWrites = true;
      options.w = 'majority';
    }

    console.log(`Attempting to connect to ${dbType}...`);
    if (!useLocal) {
      console.log('Connection URL (masked):', connectionUrl?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    } else {
      console.log('Connection URL:', connectionUrl);
    }
    
    await mongoose.connect(connectionUrl, options);
    console.log(`✅ Connected to ${dbType} - RentFlow database`);
  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    
    // Provide specific error messages and solutions
    if (error.message.includes('ENETUNREACH')) {
      console.error('🔧 SOLUTION: Network unreachable. This is likely due to:');
      console.error('   1. IP Address not whitelisted in MongoDB Atlas');
      console.error('   2. Network firewall blocking the connection');
      console.error('   3. IPv6 connectivity issues');
      console.error('');
      console.error('📋 TO FIX:');
      console.error('   1. Go to MongoDB Atlas → Network Access → Add IP Address');
      console.error('   2. Add 0.0.0.0/0 for testing (or your current IP)');
      console.error('   3. Alternatively, try connecting from a different network');
    } else if (error.message.includes('authentication')) {
      console.error('🔧 SOLUTION: Authentication failed - check username/password');
    } else if (error.message.includes('timeout')) {
      console.error('🔧 SOLUTION: Connection timeout - check network connectivity');
    }
    
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
  // Payment collection method
  paymentMethod: { type: String, enum: ['daraja', 'statement_upload', 'manual'], default: 'manual' },
  // Daraja M-Pesa configuration (per landlord)
  darajaConfig: {
    // Landlord's own Daraja credentials
    consumerKey: { type: String }, // Landlord's Daraja Consumer Key
    consumerSecret: { type: String }, // Landlord's Daraja Consumer Secret
    passkey: { type: String }, // Landlord's Lipa Na M-Pesa Online Passkey
    environment: { type: String, enum: ['sandbox', 'production'], default: 'production' }, // Their environment
    
    // Business details
    businessShortCode: { type: String }, // Landlord's paybill or till number
    businessType: { type: String, enum: ['paybill', 'till'] }, // Type of M-Pesa account
    businessName: { type: String }, // Name for receipts/statements
    accountNumber: { type: String }, // Optional: for paybill account reference
    
    // Status tracking
    isConfigured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    configuredAt: { type: Date },
    lastTestedAt: { type: Date }
  },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    newTenantAlerts: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true },
    currency: { type: String, default: 'KSH' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    language: { type: String, default: 'en' }
  },
  // Email notification settings
  emailSettings: {
    enabled: { type: Boolean, default: true },
    autoRemindersEnabled: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, default: 3, min: 1, max: 7 },
    fromName: { type: String, default: 'RentEase' },
    // Customizable email templates
    templates: {
      rentReminder: {
        subject: { type: String, default: 'Rent Payment Reminder' },
        customMessage: { type: String, default: '' }
      },
      paymentReceived: {
        subject: { type: String, default: 'Payment Received - Thank You!' },
        customMessage: { type: String, default: '' }
      },
      welcome: {
        subject: { type: String, default: 'Welcome to Your New Home!' },
        customMessage: { type: String, default: '' }
      }
    }
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
    lastPaymentAmount: Number,
    currentMonthPaid: { type: Boolean, default: false },
    paidForMonth: Number,  // 1-12
    paidForYear: Number,   // e.g., 2025
    nextDueDate: Date,
    daysRemaining: Number,
    rentStatus: { type: String, enum: ['paid', 'active', 'overdue', 'grace_period'], default: 'active' }
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
    units: { type: Number, required: true, default: 1, min: 1 },
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
  forMonth: { type: Number, required: true, min: 1, max: 12 }, // Month this payment is for
  forYear: { type: Number, required: true, min: 2020 }, // Year this payment is for
  monthlyRent: { type: Number, required: true, min: 0 }, // Expected rent amount
  paymentMethod: { type: String, default: 'Not specified' },
  status: { type: String, enum: ['pending', 'partial', 'completed', 'overpaid', 'failed'], default: 'completed' },
  notes: String,
  utilityCharges: [{
    type: { type: String, required: true },
    unitsUsed: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  totalUtilityCost: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'payment_history'
});

// Activity Log Model (activity_logs collection)
const activityLogSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },
  activityType: { 
    type: String, 
    required: true,
    enum: [
      'tenant_registered',
      'tenant_removed',
      'payment_received',
      'payment_failed',
      'property_added',
      'property_updated',
      'property_removed',
      'debt_created',
      'debt_cleared',
      'rent_overdue',
      'utility_bill_added',
      'system_alert'
    ]
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  metadata: {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    tenantName: String,
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentHistory' },
    amount: Number,
    unitNumber: String,
    previousValue: String,
    newValue: String,
  },
  icon: { 
    type: String, 
    enum: [
      'user-plus',
      'user-minus',
      'dollar-sign',
      'alert-circle',
      'building',
      'building-minus',
      'file-text',
      'check-circle',
      'zap',
      'bell'
    ],
    default: 'bell'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'activity_logs'
});

// Index for efficient querying of recent activities
activityLogSchema.index({ landlordId: 1, createdAt: -1 });
activityLogSchema.index({ isRead: 1, createdAt: -1 });

// Tenant Activity Log Model (tenant_activity_logs collection)
const tenantActivityLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  activityType: { 
    type: String, 
    required: true,
    enum: [
      'bill_created',
      'bill_reminder',
      'bill_overdue',
      'grace_period_warning',
      'payment_processed',
      'payment_failed',
      'partial_payment_received',
      'final_notice',
      'system_alert'
    ]
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  metadata: {
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord' },
    landlordName: String,
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentHistory' },
    amount: Number,
    dueDate: String,
    daysOverdue: Number,
  },
  icon: { 
    type: String, 
    enum: [
      'file-text',
      'bell',
      'alert-circle',
      'alert-triangle',
      'check-circle',
      'x-circle',
      'dollar-sign',
      'clock'
    ],
    default: 'bell'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'tenant_activity_logs'
});

// Index for efficient querying
tenantActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
tenantActivityLogSchema.index({ isRead: 1, createdAt: -1 });

// Payment Intent Model (daraja_payment_intents collection)
// Tracks Daraja M-Pesa payment attempts from initiation to completion
const paymentIntentSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentHistory' }, // Optional: linked bill
  
  // Payment details
  amount: { type: Number, required: true, min: 1 },
  phoneNumber: { type: String, required: true }, // Tenant's phone (254...)
  paymentReference: { type: String, required: true, unique: true, index: true }, // RE-YYYYMM-LXXX-TXXX-RANDOM
  
  // Landlord's M-Pesa details (copied from landlord.darajaConfig at time of payment)
  businessShortCode: { type: String, required: true }, // Landlord's paybill/till
  businessType: { type: String, enum: ['paybill', 'till'], required: true },
  accountReference: { type: String }, // Appears in landlord's M-Pesa statement
  
  // Daraja API response details
  merchantRequestID: { type: String, index: true }, // Daraja's merchant request ID
  checkoutRequestID: { type: String, index: true }, // Daraja's checkout request ID
  transactionId: { type: String }, // M-Pesa transaction ID (e.g., QGR12345678)
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'success', 'failed', 'timeout', 'cancelled'], 
    default: 'pending',
    index: true
  },
  resultCode: { type: Number }, // Daraja result code (0 = success)
  resultDesc: { type: String }, // Human-readable result description
  
  // Timestamps
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  expiresAt: { type: Date, index: true, default: () => new Date(Date.now() + 2 * 60 * 1000) }, // Expires in 2 minutes
  
  // Metadata
  callbackReceived: { type: Boolean, default: false },
  callbackData: { type: mongoose.Schema.Types.Mixed }, // Raw callback data
  attemptNumber: { type: Number, default: 1 }, // Retry counter
  ipAddress: { type: String }, // For security logging
}, {
  timestamps: true,
  collection: 'daraja_payment_intents'
});

// Indexes for efficient querying
paymentIntentSchema.index({ status: 1, createdAt: -1 });
paymentIntentSchema.index({ landlordId: 1, status: 1 });
paymentIntentSchema.index({ tenantId: 1, status: 1 });
paymentIntentSchema.index({ expiresAt: 1 }); // For cleanup of expired intents

// Callback Log Model (daraja_callback_logs collection)
// Logs all incoming Daraja callbacks for debugging and audit trail
const callbackLogSchema = new mongoose.Schema({
  // Callback identification
  merchantRequestID: { type: String, required: true, index: true },
  checkoutRequestID: { type: String, required: true, index: true },
  
  // Callback result
  resultCode: { type: Number, required: true },
  resultDesc: { type: String, required: true },
  
  // Transaction details (if successful)
  mpesaReceiptNumber: { type: String, index: true }, // M-Pesa receipt
  transactionDate: { type: String },
  phoneNumber: { type: String },
  amount: { type: Number },
  
  // Processing status
  processed: { type: Boolean, default: false, index: true },
  processedAt: { type: Date },
  processingError: { type: String }, // Error if processing failed
  
  // Linked entities (populated after processing)
  paymentIntentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentIntent', index: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  
  // Raw data
  rawPayload: { type: mongoose.Schema.Types.Mixed, required: true }, // Full callback body
  rawHeaders: { type: mongoose.Schema.Types.Mixed }, // HTTP headers
  ipAddress: { type: String }, // Source IP
  
  // Response
  responseStatus: { type: Number }, // HTTP status we returned
  responseBody: { type: mongoose.Schema.Types.Mixed }, // What we responded with
}, {
  timestamps: true,
  collection: 'daraja_callback_logs'
});

// Indexes for efficient querying and debugging
callbackLogSchema.index({ processed: 1, createdAt: -1 });
callbackLogSchema.index({ resultCode: 1, createdAt: -1 });
callbackLogSchema.index({ mpesaReceiptNumber: 1 });

// Email Notification Log Schema
const notificationLogSchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  
  // Email details
  type: { type: String, enum: ['welcome', 'payment_received', 'rent_reminder', 'receipt', 'manual', 'overdue'], required: true, index: true },
  recipientEmail: { type: String, required: true },
  subject: { type: String, required: true },
  
  // Status tracking
  status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending', index: true },
  resendEmailId: { type: String }, // Resend's email ID for tracking
  sentAt: { type: Date },
  failureReason: { type: String },
  
  // Additional metadata
  metadata: {
    paymentAmount: { type: Number },
    propertyName: { type: String },
    unitNumber: { type: String },
    dueDate: { type: Date },
    customMessage: { type: String }
  }
}, {
  timestamps: true,
  collection: 'notification_logs'
});

// Indexes for efficient querying
notificationLogSchema.index({ landlordId: 1, createdAt: -1 });
notificationLogSchema.index({ tenantId: 1, createdAt: -1 });
notificationLogSchema.index({ type: 1, status: 1, createdAt: -1 });

export const Landlord = mongoose.model('Landlord', landlordSchema);
export const Tenant = mongoose.model('Tenant', tenantSchema);
export const Property = mongoose.model('Property', propertySchema);
export const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const TenantActivityLog = mongoose.model('TenantActivityLog', tenantActivityLogSchema);
export const PaymentIntent = mongoose.model('PaymentIntent', paymentIntentSchema);
export const CallbackLog = mongoose.model('CallbackLog', callbackLogSchema);
export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
