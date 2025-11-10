# 🚀 Paystack Integration - Complete Implementation Guide

**Project:** RentEase - M-Pesa Payment Gateway Integration  
**Gateway:** Paystack (Replaced Flutterwave - no longer operates in Kenya)  
**Start Date:** November 9, 2025  
**Status:** Phase 1 Complete ✅ → Phase 2 In Progress  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema](#database-schema)
6. [Core Services](#core-services)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Webhook Integration](#webhook-integration)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Checklist](#deployment-checklist)
12. [Progress Tracking](#progress-tracking)

---

## 🎯 Overview

### **Goal**
Implement Paystack payment gateway integration to enable automated rent collection with three receiving methods:
1. **Mobile Money** (Personal M-Pesa) - For small landlords (1-5 units)
2. **Business Paybill** - For medium-large landlords (10+ units)
3. **Business Till** - For retail/office-based property managers

### **Key Features**
- ✅ STK Push payments (tenant enters PIN on phone)
- ✅ Real-time payment confirmation via webhooks
- ✅ Automatic payment matching and bill updates
- ✅ Multi-landlord support (each has own subaccount)
- ✅ Payment intent tracking with idempotency
- ✅ Comprehensive webhook logging for debugging

### **Payment Flow**
```
Tenant clicks "Pay Rent" 
  → RentEase creates PaymentIntent
  → Flutterwave sends STK Push to tenant's phone
  → Tenant enters M-Pesa PIN
  → Payment processed
  → Webhook to RentEase
  → Match payment to bill
  → Update dashboard
  → Notify landlord & tenant
  → Flutterwave disburses to landlord (T+1)
```

---

## 📦 Prerequisites

### **A. Flutterwave Account Setup**

#### **1. Sign Up**
- URL: https://flutterwave.com/ke
- Account Type: Business Account
- Dashboard: https://dashboard.flutterwave.com

#### **2. Complete KYC** ⏳ STATUS: PENDING
Required documents:
- [ ] Business registration certificate
- [ ] KRA PIN certificate
- [ ] Director's ID/Passport copy
- [ ] Bank account details (for settlement)
- [ ] Proof of address (utility bill)

**Timeline:** 2-5 business days for approval

#### **3. Enable M-Pesa** ⏳ STATUS: PENDING
- [ ] Request M-Pesa activation in Flutterwave dashboard
- [ ] Provide M-Pesa business shortcode (if applicable)
- [ ] Test with sandbox first

#### **4. Get API Credentials** ⏳ STATUS: PENDING
```env
# Sandbox (Testing)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret-hash

# Production (Live)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECKxxxxxxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret-hash

# Environment
FLUTTERWAVE_ENV=sandbox  # or 'production'
FRONTEND_URL=https://rentease.com
```

**Where to find:**
- Dashboard → Settings → API Keys
- Copy Public Key, Secret Key, Encryption Key
- Create webhook secret (used to verify webhook signatures)

---

### **B. Development Environment Setup**

#### **1. Install Dependencies** ⏳ STATUS: PENDING
```bash
# Flutterwave Node.js SDK
npm install flutterwave-node-v3

# Additional utilities
npm install crypto  # (built-in Node.js module)
```

#### **2. Environment Variables** ⏳ STATUS: PENDING
Create/update `.env` file:
```bash
# Add to .env
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret
FLUTTERWAVE_ENV=sandbox
FRONTEND_URL=http://localhost:5173
```

#### **3. Webhook Endpoint Setup** ⏳ STATUS: PENDING
For local development, use **ngrok** to expose localhost:
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 5000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to Flutterwave dashboard: https://abc123.ngrok.io/api/webhooks/flutterwave
```

**For staging/production:**
- Deploy to Render/Railway/Vercel
- Configure webhook URL in Flutterwave dashboard
- Example: `https://api.rentease.com/api/webhooks/flutterwave`

---

## 🏗️ Architecture

### **System Components**

```
┌─────────────────────────────────────────────────────────────┐
│                        TENANT                               │
│  (Clicks "Pay Rent" → Receives STK Push → Enters PIN)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   RENTEASE BACKEND                          │
│                                                             │
│  1. Create PaymentIntent (with idempotency)                │
│  2. Call FlutterwaveService.initiatePayment()              │
│  3. Store intent in database                               │
│  4. Return status to tenant                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLUTTERWAVE                              │
│                                                             │
│  1. Receive payment request                                │
│  2. Send STK Push to tenant's phone                        │
│  3. Process payment via M-Pesa                             │
│  4. Send webhook to RentEase                               │
│  5. Disburse to landlord subaccount (T+1)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              WEBHOOK HANDLER (RentEase)                     │
│                                                             │
│  1. Verify webhook signature                               │
│  2. Log webhook to database                                │
│  3. Match payment to PaymentIntent                         │
│  4. Update bill status (processTenantPayment)              │
│  5. Notify landlord & tenant via WebSocket                 │
│  6. Update dashboard                                       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    LANDLORD                                 │
│  (Receives notification → Sees payment on dashboard)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Implementation Phases

### **Phase 1: Foundation** (Days 1-2) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 1.1. Install Flutterwave SDK
- [ ] 1.2. Set up environment variables
- [ ] 1.3. Create database migration for new tables
- [ ] 1.4. Run migration and verify schema
- [ ] 1.5. Create FlutterwaveService utility
- [ ] 1.6. Create payment reference generator
- [ ] 1.7. Create phone normalizer utility
- [ ] 1.8. Set up ngrok for webhook testing

**Deliverables:**
- ✅ Dependencies installed
- ✅ Database schema updated with `paymentIntents` and `webhookLogs` tables
- ✅ Landlord schema has `gatewayConfig` field
- ✅ Core utilities created and tested

---

### **Phase 2: Landlord Gateway Setup** (Days 3-4) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 2.1. Create GatewayController with configure endpoint
- [ ] 2.2. Implement Flutterwave subaccount creation
- [ ] 2.3. Add gateway routes to server
- [ ] 2.4. Create frontend payment method selection UI
- [ ] 2.5. Build dynamic form with dropdown (Mobile Money/Paybill/Till)
- [ ] 2.6. Implement test connection functionality
- [ ] 2.7. Add validation for phone numbers and business details

**Deliverables:**
- ✅ POST `/api/landlords/:id/gateway/configure` endpoint working
- ✅ GET `/api/landlords/:id/gateway/status` endpoint working
- ✅ POST `/api/landlords/:id/gateway/test` endpoint working
- ✅ Frontend wizard component for landlord setup
- ✅ Landlords can configure Mobile Money, Paybill, or Till

---

### **Phase 3: Payment Initiation** (Days 5-6) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 3.1. Create PaymentController with initiate endpoint
- [ ] 3.2. Implement PaymentIntent creation with idempotency
- [ ] 3.3. Integrate FlutterwaveService.initiatePayment()
- [ ] 3.4. Add payment status polling endpoint
- [ ] 3.5. Create frontend "Pay Rent" button
- [ ] 3.6. Build payment status modal (waiting for STK Push)
- [ ] 3.7. Add payment expiry handling (15 min timeout)
- [ ] 3.8. Implement retry mechanism for failed payments

**Deliverables:**
- ✅ POST `/api/tenants/:id/payments/initiate` endpoint working
- ✅ GET `/api/payments/:intentId/status` endpoint working
- ✅ Tenant can click "Pay Rent" and receive STK Push
- ✅ Real-time status updates on frontend
- ✅ Payment intents expire after 15 minutes

---

### **Phase 4: Webhook Integration** (Days 7-8) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 4.1. Create WebhookController for Flutterwave
- [ ] 4.2. Implement webhook signature verification
- [ ] 4.3. Log all webhooks to database
- [ ] 4.4. Handle 'charge.completed' event
- [ ] 4.5. Match payment to bill using reference
- [ ] 4.6. Call processTenantPayment() to update bill
- [ ] 4.7. Broadcast notifications via WebSocket
- [ ] 4.8. Handle edge cases (duplicate webhooks, late webhooks)

**Deliverables:**
- ✅ POST `/api/webhooks/flutterwave` endpoint working
- ✅ Webhook signature verification implemented
- ✅ All webhooks logged for debugging
- ✅ Payments automatically matched and bills updated
- ✅ Landlord & tenant receive real-time notifications

---

### **Phase 5: Testing & Error Handling** (Days 9-10) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 5.1. Test Mobile Money payment flow end-to-end
- [ ] 5.2. Test Paybill payment flow end-to-end
- [ ] 5.3. Test Till payment flow end-to-end
- [ ] 5.4. Test failed payment scenarios
- [ ] 5.5. Test timeout/expired payment intents
- [ ] 5.6. Test duplicate webhook handling
- [ ] 5.7. Test payment matching edge cases
- [ ] 5.8. Add comprehensive error messages
- [ ] 5.9. Create payment audit logs
- [ ] 5.10. Test on sandbox environment

**Deliverables:**
- ✅ All payment flows tested successfully
- ✅ Error handling robust and user-friendly
- ✅ Edge cases handled gracefully
- ✅ Ready for staging deployment

---

### **Phase 6: Production Deployment** (Days 11-12) ⏳ STATUS: NOT STARTED

#### **Tasks:**
- [ ] 6.1. Switch from sandbox to production credentials
- [ ] 6.2. Deploy to production server
- [ ] 6.3. Configure production webhook URL in Flutterwave
- [ ] 6.4. Test with real KSH 1 transaction
- [ ] 6.5. Set up monitoring and alerting
- [ ] 6.6. Create landlord documentation/video guide
- [ ] 6.7. Add payment analytics dashboard
- [ ] 6.8. Go live! 🚀

**Deliverables:**
- ✅ Production deployment complete
- ✅ Real payments flowing through system
- ✅ Monitoring and alerts configured
- ✅ Documentation available for landlords

---

## 🗄️ Database Schema

### **1. Update Landlord Table** ⏳ STATUS: NOT STARTED

**File:** `shared/schema.ts`

```typescript
// Add payment method enum
export const paymentMethodEnum = pgEnum('payment_method', [
  'gateway',      // Flutterwave, etc.
  'daraja',       // Direct M-Pesa API
  'statement_upload', // Manual statement parsing
  'manual'        // Manual marking as paid
]);

// Update landlords table
export const landlords = pgTable('landlords', {
  // ... existing fields
  
  // Payment method selection
  paymentMethod: paymentMethodEnum('payment_method').default('manual'),
  
  // Gateway configuration
  gatewayConfig: json('gateway_config').$type<{
    provider: 'flutterwave';
    receiveMethod: 'mobile_money' | 'paybill' | 'till';
    
    // Mobile money fields
    recipientPhone?: string;
    recipientName?: string;
    idNumber?: string;
    
    // Paybill fields
    paybillNumber?: string;
    paybillAccountReference?: string;
    
    // Till fields
    tillNumber?: string;
    
    // Common business fields
    businessName?: string;
    kraPin?: string;
    businessPhone?: string;
    
    // Flutterwave account details
    subaccountId?: string;
    accountBank?: string;
    accountNumber?: string;
    
    // Status tracking
    isConfigured: boolean;
    isVerified: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
    configuredAt?: string;
    verifiedAt?: string;
    lastTestedAt?: string;
  }>(),
});
```

---

### **2. Create PaymentIntents Table** ⏳ STATUS: NOT STARTED

```typescript
export const paymentIntents = pgTable('payment_intents', {
  id: serial('id').primaryKey(),
  
  // References
  landlordId: integer('landlord_id').references(() => landlords.id).notNull(),
  tenantId: integer('tenant_id').references(() => tenants.id).notNull(),
  propertyId: integer('property_id').references(() => properties.id).notNull(),
  billId: integer('bill_id').references(() => paymentHistory.id).notNull(),
  
  // Payment details
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).default('KES'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  
  // Gateway tracking
  provider: varchar('provider', { length: 50 }).notNull(),
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
  gatewayReference: varchar('gateway_reference', { length: 255 }),
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }),
  
  // Status tracking
  status: varchar('status', { length: 50 }).notNull().default('initiated'),
  
  // Customer details
  customerPhone: varchar('customer_phone', { length: 20 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerName: varchar('customer_name', { length: 255 }),
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  
  // Metadata
  metadata: json('metadata').$type<{
    apartmentNumber?: string;
    forMonth?: number;
    forYear?: number;
    description?: string;
  }>(),
  
  // Gateway response
  gatewayResponse: json('gateway_response'),
  errorMessage: text('error_message'),
  
  // Timestamps
  initiatedAt: timestamp('initiated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  landlordIdx: index('payment_intents_landlord_idx').on(table.landlordId),
  tenantIdx: index('payment_intents_tenant_idx').on(table.tenantId),
  billIdx: index('payment_intents_bill_idx').on(table.billId),
  statusIdx: index('payment_intents_status_idx').on(table.status),
  gatewayRefIdx: index('payment_intents_gateway_ref_idx').on(table.gatewayReference),
}));
```

---

### **3. Create WebhookLogs Table** ⏳ STATUS: NOT STARTED

```typescript
export const webhookLogs = pgTable('webhook_logs', {
  id: serial('id').primaryKey(),
  
  provider: varchar('provider', { length: 50 }).notNull(),
  event: varchar('event', { length: 100 }).notNull(),
  
  // Request details
  payload: json('payload').notNull(),
  headers: json('headers'),
  signature: text('signature'),
  
  // Processing
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  
  // Matching
  paymentIntentId: integer('payment_intent_id').references(() => paymentIntents.id),
  
  // Timestamps
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  providerIdx: index('webhook_logs_provider_idx').on(table.provider),
  processedIdx: index('webhook_logs_processed_idx').on(table.processed),
}));
```

---

### **4. Migration File** ⏳ STATUS: NOT STARTED

**File:** `server/migrations/add-flutterwave-support.ts`

```typescript
import { db } from '../database';
import { sql } from 'drizzle-orm';

export async function up() {
  // Add payment_method enum
  await db.execute(sql`
    CREATE TYPE payment_method AS ENUM ('gateway', 'daraja', 'statement_upload', 'manual');
  `);
  
  // Add paymentMethod and gatewayConfig to landlords
  await db.execute(sql`
    ALTER TABLE landlords
    ADD COLUMN payment_method payment_method DEFAULT 'manual',
    ADD COLUMN gateway_config JSONB,
    ADD COLUMN mpesa_config JSONB,
    ADD COLUMN statement_config JSONB;
  `);
  
  // Create payment_intents table
  await db.execute(sql`
    CREATE TABLE payment_intents (
      id SERIAL PRIMARY KEY,
      landlord_id INTEGER NOT NULL REFERENCES landlords(id),
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      property_id INTEGER NOT NULL REFERENCES properties(id),
      bill_id INTEGER NOT NULL REFERENCES payment_history(id),
      amount INTEGER NOT NULL,
      currency VARCHAR(3) DEFAULT 'KES',
      payment_method VARCHAR(50) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      gateway_transaction_id VARCHAR(255),
      gateway_reference VARCHAR(255),
      mpesa_receipt_number VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'initiated',
      customer_phone VARCHAR(20),
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      idempotency_key VARCHAR(255) UNIQUE,
      metadata JSONB,
      gateway_response JSONB,
      error_message TEXT,
      initiated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE INDEX payment_intents_landlord_idx ON payment_intents(landlord_id);
    CREATE INDEX payment_intents_tenant_idx ON payment_intents(tenant_id);
    CREATE INDEX payment_intents_bill_idx ON payment_intents(bill_id);
    CREATE INDEX payment_intents_status_idx ON payment_intents(status);
    CREATE INDEX payment_intents_gateway_ref_idx ON payment_intents(gateway_reference);
  `);
  
  // Create webhook_logs table
  await db.execute(sql`
    CREATE TABLE webhook_logs (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) NOT NULL,
      event VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      headers JSONB,
      signature TEXT,
      processed BOOLEAN DEFAULT FALSE,
      processed_at TIMESTAMP,
      error_message TEXT,
      payment_intent_id INTEGER REFERENCES payment_intents(id),
      received_at TIMESTAMP DEFAULT NOW() NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE INDEX webhook_logs_provider_idx ON webhook_logs(provider);
    CREATE INDEX webhook_logs_processed_idx ON webhook_logs(processed);
  `);
}

export async function down() {
  await db.execute(sql`DROP TABLE IF EXISTS webhook_logs;`);
  await db.execute(sql`DROP TABLE IF EXISTS payment_intents;`);
  await db.execute(sql`
    ALTER TABLE landlords
    DROP COLUMN payment_method,
    DROP COLUMN gateway_config,
    DROP COLUMN mpesa_config,
    DROP COLUMN statement_config;
  `);
  await db.execute(sql`DROP TYPE IF EXISTS payment_method;`);
}
```

---

## 🛠️ Core Services

### **1. FlutterwaveService** ⏳ STATUS: NOT STARTED

**File:** `server/services/flutterwaveService.ts`

```typescript
import Flutterwave from 'flutterwave-node-v3';
import crypto from 'crypto';

const flw = new Flutterwave(
  process.env.FLUTTERWAVE_PUBLIC_KEY!,
  process.env.FLUTTERWAVE_SECRET_KEY!
);

export class FlutterwaveService {
  /**
   * Create subaccount for landlord
   */
  static async createSubaccount(config: {
    receiveMethod: 'mobile_money' | 'paybill' | 'till';
    businessName: string;
    businessPhone: string;
    businessEmail: string;
  }) {
    const payload = {
      account_bank: 'MPS', // M-Pesa code
      account_number: config.businessPhone,
      business_name: config.businessName,
      business_email: config.businessEmail,
      business_contact: config.businessName,
      business_mobile: config.businessPhone,
      country: 'KE',
      split_type: 'flat',
      split_value: 1.0,
    };

    const response = await flw.Subaccount.create(payload);
    
    if (response.status === 'success') {
      return {
        subaccountId: response.data.id,
        subaccountCode: response.data.subaccount_id,
      };
    }
    
    throw new Error(response.message || 'Subaccount creation failed');
  }

  /**
   * Initiate M-Pesa payment
   */
  static async initiatePayment(params: {
    amount: number;
    customerPhone: string;
    customerEmail: string;
    customerName: string;
    txRef: string;
    subaccountId?: string;
    metadata?: Record<string, any>;
  }) {
    const payload: any = {
      tx_ref: params.txRef,
      amount: params.amount,
      currency: 'KES',
      payment_type: 'mobilemoneykenya',
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      customer: {
        email: params.customerEmail,
        phone_number: params.customerPhone,
        name: params.customerName,
      },
      customizations: {
        title: 'RentEase',
        description: 'Rent Payment',
      },
      meta: params.metadata || {},
    };

    if (params.subaccountId) {
      payload.subaccounts = [{ id: params.subaccountId }];
    }

    const response = await flw.MobileMoney.mpesa(payload);
    
    if (response.status === 'success') {
      return {
        status: 'pending',
        paymentLink: response.data.link,
        transactionId: response.data.id,
        reference: response.data.tx_ref,
      };
    }
    
    throw new Error(response.message || 'Payment initiation failed');
  }

  /**
   * Verify payment
   */
  static async verifyPayment(transactionId: string) {
    const response = await flw.Transaction.verify({ id: transactionId });
    
    if (response.status === 'success') {
      return {
        status: response.data.status,
        amount: response.data.amount,
        txRef: response.data.tx_ref,
        flwRef: response.data.flw_ref,
      };
    }
    
    throw new Error(response.message || 'Verification failed');
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET!)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }
}
```

---

### **2. Payment Reference Generator** ⏳ STATUS: NOT STARTED

**File:** `server/utils/paymentReference.ts`

```typescript
import crypto from 'crypto';

/**
 * Generate unique payment reference
 * Format: PROP-UNIT-INITIALS-MMYY-CHECKSUM
 * Example: SUN-A101-JM-1125-X7K9
 */
export function generatePaymentReference(
  propertyCode: string,
  apartmentNumber: string,
  tenantName: string,
  forMonth: number,
  forYear: number
): string {
  const propCode = propertyCode.substring(0, 3).toUpperCase();
  const apt = apartmentNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  const nameParts = tenantName.split(' ');
  const initials = nameParts.map(part => part[0]).join('').toUpperCase().substring(0, 3);
  
  const monthYear = `${String(forMonth).padStart(2, '0')}${String(forYear).slice(-2)}`;
  
  const baseString = `${propCode}-${apt}-${initials}-${monthYear}`;
  const checksum = crypto
    .createHash('md5')
    .update(baseString + Date.now())
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  
  return `${baseString}-${checksum}`;
}
```

---

### **3. Phone Normalizer** ⏳ STATUS: NOT STARTED

**File:** `server/utils/phoneNormalizer.ts`

```typescript
/**
 * Normalize phone to E.164 format (254XXXXXXXXX)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return '254' + cleaned;
  }
  
  return cleaned.length === 9 ? '254' + cleaned : cleaned;
}

/**
 * Validate Kenyan phone
 */
export function isValidKenyanPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  const regex = /^254(7|1|2)\d{8}$/;
  return regex.test(normalized);
}
```

---

## 🔌 API Endpoints

### **Gateway Configuration Endpoints** ⏳ STATUS: NOT STARTED

**File:** `server/controllers/gatewayController.ts`

```typescript
// POST /api/landlords/:landlordId/gateway/configure
// Configure payment gateway (Mobile Money/Paybill/Till)

// GET /api/landlords/:landlordId/gateway/status
// Get current configuration status

// POST /api/landlords/:landlordId/gateway/test
// Test gateway connection
```

---

### **Payment Endpoints** ⏳ STATUS: NOT STARTED

**File:** `server/controllers/paymentController.ts`

```typescript
// POST /api/tenants/:tenantId/payments/initiate
// Initiate payment (creates PaymentIntent, calls Flutterwave)

// GET /api/payments/:intentId/status
// Poll payment status

// POST /api/payments/:intentId/cancel
// Cancel payment intent
```

---

### **Webhook Endpoint** ⏳ STATUS: NOT STARTED

**File:** `server/controllers/webhookController.ts`

```typescript
// POST /api/webhooks/flutterwave
// Handle Flutterwave webhook callbacks
```

---

## 🎨 Frontend Components

### **1. Gateway Setup Wizard** ⏳ STATUS: NOT STARTED

**File:** `client/src/components/gateway/GatewaySetupWizard.tsx`

Dynamic form with dropdown for Mobile Money/Paybill/Till selection.

---

### **2. Pay Rent Button** ⏳ STATUS: NOT STARTED

**File:** `client/src/components/payments/PayRentButton.tsx`

Button on tenant dashboard that initiates payment.

---

### **3. Payment Status Modal** ⏳ STATUS: NOT STARTED

**File:** `client/src/components/payments/PaymentStatusModal.tsx`

Shows STK Push status and payment confirmation.

---

## 🪝 Webhook Integration

### **Webhook Handler Implementation** ⏳ STATUS: NOT STARTED

**Endpoint:** `POST /api/webhooks/flutterwave`

**Events to handle:**
- `charge.completed` - Payment successful
- `charge.failed` - Payment failed

**Process:**
1. Verify signature
2. Log to database
3. Match to PaymentIntent
4. Update bill status
5. Broadcast notification

---

## 🧪 Testing Strategy

### **Sandbox Testing Checklist** ⏳ STATUS: NOT STARTED

- [ ] Mobile Money payment flow
- [ ] Paybill payment flow
- [ ] Till payment flow
- [ ] Failed payment handling
- [ ] Timeout handling
- [ ] Duplicate webhook handling
- [ ] Invalid signature rejection

---

## 🚀 Deployment Checklist

### **Pre-Production** ⏳ STATUS: NOT STARTED

- [ ] All tests passing
- [ ] Error handling robust
- [ ] Logging configured
- [ ] Monitoring set up

### **Production** ⏳ STATUS: NOT STARTED

- [ ] Switch to production credentials
- [ ] Configure production webhook URL
- [ ] Test with real KSH 1 transaction
- [ ] Go live!

---

## 📈 Progress Tracking

### **Overall Progress: 0%** ⏳

#### **Phase 1: Foundation** - 0% ⏳
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Database migrated
- [ ] Core utilities created

#### **Phase 2: Landlord Setup** - 0% ⏳
- [ ] Backend endpoints
- [ ] Frontend components
- [ ] Subaccount creation working

#### **Phase 3: Payment Initiation** - 0% ⏳
- [ ] Payment endpoints
- [ ] Frontend integration
- [ ] STK Push working

#### **Phase 4: Webhooks** - 0% ⏳
- [ ] Webhook handler
- [ ] Signature verification
- [ ] Payment matching

#### **Phase 5: Testing** - 0% ⏳
- [ ] All flows tested
- [ ] Edge cases handled

#### **Phase 6: Production** - 0% ⏳
- [ ] Deployed
- [ ] Live payments

---

## 📝 Notes & Decisions

### **Design Decisions:**
1. **Three payment methods** - Provides flexibility for different landlord types
2. **Subaccounts** - Each landlord gets own Flutterwave subaccount (direct payment)
3. **PaymentIntent pattern** - Tracks entire payment lifecycle
4. **Webhook logging** - All webhooks logged for debugging
5. **Idempotency keys** - Prevent duplicate charges

### **Future Enhancements:**
- Statement upload parsing
- Direct Daraja API integration
- Payment analytics dashboard
- Automated reconciliation reports
- Multi-currency support (USD, EUR)

---

**Last Updated:** November 9, 2025  
**Next Review:** After Phase 1 completion
