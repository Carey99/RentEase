# Daraja API Integration Guide for RentEase

## 🎯 Overview

This document outlines the complete integration of Safaricom's Daraja API (M-Pesa) into RentEase. The goal is to **simplify payment collection** for landlords by enabling direct M-Pesa payments from tenants.

### Why Daraja API?

- **Direct Integration**: No intermediary payment gateways
- **Simplified Setup**: Landlords only need their M-Pesa number
- **Lower Costs**: No gateway fees, only M-Pesa transaction fees
- **Kenya-Focused**: Built specifically for the Kenyan market
- **Real-Time**: Instant payment notifications via webhooks

---

## 📚 Understanding Daraja API

### What is Daraja?

Daraja is Safaricom's M-Pesa API platform that allows businesses to integrate M-Pesa payments into their applications. For RentEase, we'll use:

1. **STK Push (Lipa Na M-Pesa Online)**: Initiates payment from tenant's phone
2. **C2B (Customer to Business)**: Receives payment notifications

### How It Works

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌─────────┐
│ Tenant  │────────▶│ RentEase │────────▶│  Daraja  │────────▶│ M-Pesa  │
│  App    │ Clicks  │  Server  │   STK   │   API    │  Push   │ Service │
└─────────┘  "Pay"  └──────────┘  Push   └──────────┘  to      └─────────┘
                                  Request               Phone
                                     │
                                     │ Callback
                                     ▼
                          ┌─────────────────┐
                          │ Tenant confirms │
                          │  on phone with  │
                          │   M-Pesa PIN    │
                          └─────────────────┘
                                     │
                                     │ Payment Result
                                     ▼
                          ┌─────────────────┐
                          │  Daraja sends   │
                          │   callback to   │
                          │  RentEase API   │
                          └─────────────────┘
                                     │
                                     │ Update
                                     ▼
                          ┌─────────────────┐
                          │   Update bill   │
                          │  status & send  │
                          │  notifications  │
                          └─────────────────┘
```

---

## 🔑 Required Credentials

### 1. Daraja Portal Setup

You need to register on the Daraja Portal to get API credentials:

**Sandbox (Testing):**
- Portal: https://developer.safaricom.co.ke/
- Create an account and create a new app

**Production (Live):**
- Portal: https://developer.safaricom.co.ke/
- Go Live process after testing

### 2. Required Keys

```env
# Daraja API Credentials
DARAJA_CONSUMER_KEY=your_consumer_key_here
DARAJA_CONSUMER_SECRET=your_consumer_secret_here

# Business Details
DARAJA_BUSINESS_SHORT_CODE=174379  # Your paybill/till number (Sandbox: 174379)
DARAJA_PASSKEY=your_passkey_here   # Provided by Safaricom

# Environment
DARAJA_ENV=sandbox  # or 'production'

# Callback URLs
DARAJA_CALLBACK_URL=https://your-domain.com/api/daraja/callback
DARAJA_TIMEOUT_URL=https://your-domain.com/api/daraja/timeout
```

### 3. How to Get Credentials

**Step-by-step:**

1. **Register on Daraja Portal**
   - Go to https://developer.safaricom.co.ke/
   - Sign up with email and phone number
   - Verify your account

2. **Create an App**
   - Click "My Apps" → "Add a New App"
   - Select "Lipa Na M-Pesa Online" API
   - Fill in app details
   - You'll receive:
     - Consumer Key
     - Consumer Secret
     - Passkey (for Lipa Na M-Pesa)

3. **Get Business Short Code**
   - Sandbox: Use `174379` (test paybill)
   - Production: Use your actual M-Pesa business number

4. **Set Callback URLs**
   - Must be HTTPS (not HTTP)
   - Must be publicly accessible
   - Will be configured in the API request

---

## 📋 Implementation Phases

### Phase 1: Foundation Setup ⏱️ 2-3 hours

**Goal**: Set up Daraja service, authentication, and utilities

**Tasks:**
1. Create Daraja service module
2. Implement OAuth token generation
3. Create payment reference generator
4. Set up phone number validator/normalizer
5. Create database models for payments
6. Write unit tests

**Deliverables:**
- `server/utils/darajaService.ts`
- `server/utils/darajaAuth.ts`
- `server/utils/paymentReference.ts`
- `server/utils/phoneValidator.ts`
- Database schema updates
- Test script for Phase 1

---

### Phase 2: Landlord Configuration UI ⏱️ 2-3 hours

**Goal**: Allow landlords to set up their M-Pesa receiving account

**Tasks:**
1. Create landlord M-Pesa configuration form
2. Add paybill/till selection
3. Validate business short code format
4. Test configuration endpoint
5. Store landlord-specific config in database
6. Display configuration status in dashboard

**Deliverables:**
- `POST /api/landlords/:id/daraja/configure`
- `GET /api/landlords/:id/daraja/status`
- `POST /api/landlords/:id/daraja/test`
- M-Pesa setup wizard UI component
- Configuration status display

**Landlord Setup UI Flow:**
```
Step 1: Select Payment Type
  → Paybill or Till Number

Step 2: Enter Details
  → Paybill Number: [______]
  → Account Name (optional): [______]
  → Business Name: [______]

Step 3: Test Configuration
  → Send KSH 1 test transaction
  → Verify it reaches their M-Pesa

Step 4: Activate
  → Configuration saved
  → Tenants can now pay
```

---

### Phase 3: STK Push Implementation ⏱️ 3-4 hours

**Goal**: Enable tenants to initiate payments to their landlord

**Tasks:**
1. Create payment initiation endpoint (with landlord routing)
2. Implement dynamic STK Push logic
3. Create PaymentIntent model with landlord reference
4. Handle timeout scenarios
5. Build tenant "Pay Rent" UI
6. Add payment status polling

**Deliverables:**
- `POST /api/payments/initiate`
- `GET /api/payments/:id/status`
- Payment button in tenant dashboard
- Payment status modal with countdown
- Dynamic payment routing logic
- Test STK Push flow for multiple landlords

**Key Implementation:**
- Tenant clicks "Pay" → System identifies landlord → Fetches landlord's paybill → Sends STK Push to that paybill
- Each tenant pays to their own landlord's M-Pesa
- No cross-contamination between landlords

---

### Phase 4: Callback Handling ⏱️ 3-4 hours

**Goal**: Process payment results and update bills

**Tasks:**
1. Create callback webhook endpoint
2. Implement callback signature verification
3. Match payments to bills
4. Update bill status on success
5. Handle failed payments
6. Log all transactions

**Deliverables:**
- `POST /api/daraja/callback`
- `POST /api/daraja/timeout`
- Callback verification logic
- Payment-to-bill matching
- Transaction logging
- Idempotency handling

---

### Phase 5: Notifications & UI ⏱️ 2-3 hours

**Goal**: Real-time updates and user feedback

**Tasks:**
1. WebSocket notifications for payment status
2. Email notifications (optional)
3. SMS notifications (optional)
4. Payment history UI improvements
5. Receipt generation
6. Dashboard statistics update

**Deliverables:**
- Real-time payment updates
- Payment success/failure notifications
- Updated payment history
- Digital receipt
- Updated dashboard stats

---

### Phase 6: Testing & Production ⏱️ 4-5 hours

**Goal**: Ensure reliability and go live

**Tasks:**
1. End-to-end testing (sandbox)
2. Error handling and edge cases
3. Production environment setup
4. Security audit
5. Go-live checklist
6. Monitoring setup

**Deliverables:**
- Complete test suite
- Production environment configured
- Security measures verified
- Go-live documentation
- Monitoring dashboard

---

## 🏗️ Simplified Architecture

### Multi-Tenant Payment System

**Key Principle**: Each landlord has their own unique M-Pesa receiving account. Payments are dynamically routed to the correct landlord based on the tenant making the payment.

### For Landlords

**Setup Process:**
```
1. Landlord signs up
2. Provides THEIR OWN M-Pesa business number (paybill/till)
3. System stores landlord-specific payment configuration
4. When their tenants pay, money goes directly to THEIR M-Pesa
5. Each landlord receives only THEIR tenants' payments
```

**No Need For:**
- ❌ Bank account details
- ❌ API key management
- ❌ Technical configuration
- ❌ Settlement account setup
- ❌ Sharing payment accounts with other landlords

**They Only Provide:**
- ✅ Their own M-Pesa business number (paybill or till)
- ✅ Business name (optional)
- ✅ Paybill account number (if using paybill)

### Payment Flow (Multi-Tenant)

```
TENANT SIDE:
1. Tenant John (belongs to Landlord A) sees "Rent Due: KSH 15,000"
2. Clicks "Pay Now" button
3. System identifies: John → Landlord A → Paybill: 123456
4. Enters phone number (pre-filled)
5. Confirms amount
6. STK Push sent to Landlord A's paybill (123456)
7. Receives M-Pesa prompt on phone
8. Enters M-Pesa PIN
9. Money goes to Landlord A's M-Pesa account
10. Payment complete!

LANDLORD A SIDE:
1. Receives M-Pesa notification for John's payment
2. Sees payment in RentEase dashboard
3. Bill marked as paid automatically
4. John's tenant status updated

LANDLORD B SIDE:
1. Has their own paybill: 789012
2. Their tenants pay to paybill 789012
3. Completely separate from Landlord A
4. Each landlord manages their own tenants
```

**Dynamic Routing Logic:**
```
Tenant Payment Request
    ↓
Identify Tenant → Get Landlord → Retrieve Landlord's Paybill
    ↓
Send STK Push to Landlord's Paybill
    ↓
Money deposited to that specific Landlord's M-Pesa
```

---

## � Dynamic Payment Routing - Technical Implementation

### How RentEase Handles Multiple Landlords

**Single Daraja App, Multiple Destinations:**

```typescript
// RentEase has ONE set of Daraja credentials
const RENTEASE_DARAJA_CONFIG = {
  consumerKey: process.env.DARAJA_CONSUMER_KEY,
  consumerSecret: process.env.DARAJA_CONSUMER_SECRET,
  passkey: process.env.DARAJA_PASSKEY,
  environment: 'sandbox'
};

// But each landlord has their own receiving account
const landlordConfigs = {
  'landlord_A_id': {
    businessShortCode: '123456',  // Landlord A's paybill
    businessType: 'paybill',
    accountNumber: 'Property A'
  },
  'landlord_B_id': {
    businessShortCode: '789012',  // Landlord B's paybill
    businessType: 'paybill',
    accountNumber: 'Property B'
  },
  'landlord_C_id': {
    businessShortCode: '556677',  // Landlord C's till
    businessType: 'till',
    accountNumber: null  // Tills don't need account numbers
  }
};
```

### Payment Initiation Flow

```typescript
async function initiatePayment(tenantId: string, billId: string) {
  // 1. Get tenant and bill details
  const tenant = await Tenant.findById(tenantId);
  const bill = await Bill.findById(billId);
  
  // 2. CRITICAL: Get the landlord who owns this tenant
  const landlord = await Landlord.findById(tenant.landlordId);
  
  // 3. Get landlord's specific M-Pesa configuration
  const landlordConfig = landlord.darajaConfig;
  
  if (!landlordConfig.isConfigured) {
    throw new Error('Landlord has not configured M-Pesa payments');
  }
  
  // 4. Build STK Push request with LANDLORD'S details
  const stkPushRequest = {
    BusinessShortCode: landlordConfig.businessShortCode,  // THIS landlord's paybill
    Amount: bill.amount,
    PartyA: tenant.phone,
    PartyB: landlordConfig.businessShortCode,             // Money goes to THIS landlord
    PhoneNumber: tenant.phone,
    AccountReference: `${landlord.businessName}-${bill.month}`,
    TransactionDesc: `Rent Payment - ${bill.month}`
  };
  
  // 5. Generate password using LANDLORD'S shortcode
  const timestamp = getTimestamp();
  const password = generatePassword(
    landlordConfig.businessShortCode,  // Landlord-specific
    RENTEASE_DARAJA_CONFIG.passkey,    // RentEase's passkey (same for all)
    timestamp
  );
  
  // 6. Send STK Push using RentEase's credentials but landlord's destination
  const response = await sendSTKPush({
    ...stkPushRequest,
    Password: password,
    Timestamp: timestamp
  });
  
  // 7. Store payment intent with landlord reference
  await PaymentIntent.create({
    landlordId: landlord._id,
    tenantId: tenant._id,
    billId: bill._id,
    businessShortCode: landlordConfig.businessShortCode,  // Track which paybill
    amount: bill.amount,
    merchantRequestID: response.MerchantRequestID,
    checkoutRequestID: response.CheckoutRequestID,
    status: 'pending'
  });
  
  return response;
}
```

### Callback Handling (Multi-Tenant)

```typescript
async function handleDarajaCallback(callbackData: any) {
  const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData;
  
  // 1. Find payment intent by CheckoutRequestID
  const paymentIntent = await PaymentIntent.findOne({ 
    checkoutRequestID: CheckoutRequestID 
  });
  
  if (!paymentIntent) {
    throw new Error('Payment intent not found');
  }
  
  // 2. Payment intent already contains landlordId and businessShortCode
  //    This ensures we update the correct landlord's records
  
  if (ResultCode === 0) {
    // Success! Update bill for THIS specific landlord's tenant
    await Bill.updateOne(
      { _id: paymentIntent.billId },
      { 
        status: 'paid',
        paidAt: new Date(),
        transactionId: callbackData.TransactionID
      }
    );
    
    // 3. Send notification to THIS landlord (not all landlords)
    await notifyLandlord(paymentIntent.landlordId, {
      message: `Payment received from tenant`,
      amount: paymentIntent.amount,
      transactionId: callbackData.TransactionID
    });
    
    // 4. Send notification to THIS tenant
    await notifyTenant(paymentIntent.tenantId, {
      message: 'Payment successful',
      amount: paymentIntent.amount
    });
  }
  
  // 5. Update payment intent status
  await PaymentIntent.updateOne(
    { _id: paymentIntent._id },
    {
      status: ResultCode === 0 ? 'success' : 'failed',
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      completedAt: new Date()
    }
  );
}
```

### Landlord Setup Process

```typescript
// When landlord configures their M-Pesa settings
async function configureLandlordDaraja(landlordId: string, config: any) {
  const { businessShortCode, businessType, accountNumber, businessName } = config;
  
  // 1. Validate the paybill/till number exists (optional but recommended)
  const isValid = await validateBusinessShortCode(businessShortCode);
  
  if (!isValid) {
    throw new Error('Invalid paybill/till number');
  }
  
  // 2. Store landlord-specific configuration
  await Landlord.updateOne(
    { _id: landlordId },
    {
      darajaConfig: {
        businessShortCode: businessShortCode,
        businessType: businessType,
        accountNumber: accountNumber || null,
        businessName: businessName || 'Rent Payment',
        isConfigured: true,
        configuredAt: new Date(),
        isActive: true
      }
    }
  );
  
  // 3. Test the configuration with a KSH 1 transaction (optional)
  await testLandlordConfiguration(landlordId);
  
  return { success: true, message: 'M-Pesa configured successfully' };
}
```

### Key Implementation Points

1. **One Daraja App**: RentEase has one set of Daraja credentials
2. **Many Destinations**: Each landlord has their own paybill/till
3. **Dynamic Routing**: System determines destination based on tenant → landlord relationship
4. **Isolated Payments**: Landlord A never sees Landlord B's payments
5. **Secure**: Each landlord can only configure their own M-Pesa account
6. **Auditable**: Every payment is linked to specific landlord and tenant

### Validation Rules

```typescript
// Ensure tenant can only pay their own landlord
function validatePayment(tenantId: string, landlordId: string) {
  const tenant = await Tenant.findById(tenantId);
  
  if (tenant.landlordId.toString() !== landlordId) {
    throw new Error('Unauthorized: Tenant does not belong to this landlord');
  }
  
  return true;
}

// Ensure landlord configuration exists before allowing payments
function validateLandlordConfig(landlordId: string) {
  const landlord = await Landlord.findById(landlordId);
  
  if (!landlord.darajaConfig.isConfigured) {
    throw new Error('Landlord must configure M-Pesa before accepting payments');
  }
  
  if (!landlord.darajaConfig.isActive) {
    throw new Error('Landlord M-Pesa configuration is inactive');
  }
  
  return true;
}
```

---

## �🔐 Security Considerations

### 1. Callback Validation
- Verify all callbacks are from Daraja
- Check source IP addresses
- Validate callback signatures
- Implement rate limiting

### 2. Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Never log M-Pesa PINs
- Comply with PCI DSS guidelines

### 3. Idempotency
- Use unique payment references
- Prevent duplicate payments
- Handle callback retries correctly

### 4. Error Handling
- Graceful failure handling
- User-friendly error messages
- Automatic retry for transient failures
- Comprehensive logging

---

## 📊 Database Schema

### Landlord Model (Extended)
```typescript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  
  // DYNAMIC PAYMENT CONFIG PER LANDLORD
  darajaConfig: {
    // Each landlord has their own M-Pesa business number
    businessShortCode: String,     // e.g., "123456" (their paybill)
    businessType: 'paybill' | 'till',
    accountNumber: String,          // For paybill: account reference
    businessName: String,           // Optional: for receipts
    
    // Status
    isConfigured: Boolean,
    configuredAt: Date,
    lastTestedAt: Date,
    isActive: Boolean
  },
  
  properties: [ObjectId],
  tenants: [ObjectId]
}
```

**Key Point**: RentEase uses ONE Daraja App (our credentials), but routes payments to MANY different landlord paybills/tills.

### PaymentIntent Model
```typescript
{
  _id: ObjectId,
  landlordId: ObjectId,          // Which landlord will receive payment
  tenantId: ObjectId,            // Which tenant is paying
  billId: ObjectId,
  
  // Payment details
  amount: Number,
  phoneNumber: String,           // Tenant's phone
  paymentReference: String,      // RE-202511-L123-T456-ABC789
  
  // LANDLORD-SPECIFIC Daraja details
  businessShortCode: String,     // THIS landlord's paybill (copied from landlord.darajaConfig)
  accountReference: String,      // Bill/property reference sent to landlord's M-Pesa
  
  // Daraja response details
  merchantRequestID: String,
  checkoutRequestID: String,
  transactionId: String,         // M-Pesa receipt (e.g., QGR12345678)
  
  // Status tracking
  status: 'pending' | 'processing' | 'success' | 'failed' | 'timeout',
  resultCode: Number,
  resultDesc: String,
  
  // Timestamps
  initiatedAt: Date,
  completedAt: Date,
  expiresAt: Date,              // 2 minutes timeout
  
  // Metadata
  callbackReceived: Boolean,
  callbackData: Object,
  attemptNumber: Number
}
```

**Why store businessShortCode in PaymentIntent?**
- Ensures payment is linked to correct landlord
- Audit trail if landlord changes their paybill
- Easy reconciliation of which paybill received payment

### CallbackLog Model
```typescript
{
  _id: ObjectId,
  merchantRequestID: String,
  checkoutRequestID: String,
  resultCode: Number,
  resultDesc: String,
  rawPayload: Object,
  processed: Boolean,
  processedAt: Date,
  error: String,
  createdAt: Date
}
```

---

## 🧪 Testing Strategy

### Sandbox Testing

**Test Scenarios:**
1. ✅ Successful payment
2. ✅ Cancelled payment
3. ✅ Insufficient balance
4. ✅ Invalid phone number
5. ✅ Timeout (no user response)
6. ✅ Network failure
7. ✅ Duplicate payment attempt
8. ✅ Callback retry

**Sandbox Test Credentials:**
- Business Short Code: `174379`
- Test Phone: `254708374149`
- Test Amount: Any amount (no actual money)

---

## 💰 Cost Analysis

### Daraja API
- **Setup**: FREE
- **API Calls**: FREE
- **Maintenance**: Minimal

### M-Pesa Transaction Fees
- **Customer to Business (C2B)**: ~1% (paid by customer)
- **Free for business** receiving payments
- Standard M-Pesa withdrawal charges apply

### RentEase Model
**Option 1: Landlord Pays**
- Landlord receives full rent amount
- Withdraws from M-Pesa (normal charges)

**Option 2: Tenant Pays**
- Tenant pays M-Pesa fee
- Landlord receives full rent amount

---

## 🚀 Quick Start Timeline

**Week 1:**
- Days 1-2: Phase 1 (Foundation)
- Days 3-4: Phase 2 (STK Push)
- Day 5: Testing Phase 1 & 2

**Week 2:**
- Days 1-2: Phase 3 (Callbacks)
- Days 3-4: Phase 4 (Notifications)
- Day 5: Testing Phase 3 & 4

**Week 3:**
- Days 1-3: Phase 5 (Testing & Production)
- Days 4-5: Go Live & Monitoring

**Total**: ~15-20 days for complete implementation

---

## 📖 Key API Endpoints

### 1. STK Push (Lipa Na M-Pesa Online) - DYNAMIC PER LANDLORD
```
POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest

Headers:
  Authorization: Bearer {access_token}  // RentEase's token (same for all)
  Content-Type: application/json

Body:
{
  // CRITICAL: These values are DIFFERENT for each landlord
  "BusinessShortCode": "123456",           // Landlord A's paybill (from landlord.darajaConfig)
  "Password": "{base64(123456 + passkey + timestamp)}",  // Generated using landlord's shortcode
  "Timestamp": "20231105143000",
  "TransactionType": "CustomerPayBillOnline",  // or "CustomerBuyGoodsOnline" for till
  "Amount": "15000",                       // Tenant's rent amount
  "PartyA": "254708374149",               // Tenant's phone
  "PartyB": "123456",                     // SAME as BusinessShortCode (landlord's paybill)
  "PhoneNumber": "254708374149",          // Tenant's phone
  "CallBackURL": "https://your-domain.com/api/daraja/callback",  // RentEase callback
  "AccountReference": "Property-A-Unit-5", // Helps landlord identify payment
  "TransactionDesc": "Rent Payment - November 2023"
}
```

**Example for Different Landlords:**

**Landlord A (Paybill: 123456):**
```json
{
  "BusinessShortCode": "123456",  // Landlord A's paybill
  "PartyB": "123456",
  "AccountReference": "Property-A-Unit-5"
}
```

**Landlord B (Paybill: 789012):**
```json
{
  "BusinessShortCode": "789012",  // Landlord B's paybill
  "PartyB": "789012",
  "AccountReference": "Property-B-Unit-3"
}
```

**Landlord C (Till: 556677):**
```json
{
  "BusinessShortCode": "556677",  // Landlord C's till
  "PartyB": "556677",
  "TransactionType": "CustomerBuyGoodsOnline",  // Till uses BuyGoods
  "AccountReference": "Property-C-Unit-1"
}
```

### 2. OAuth Token
```
GET https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

Headers:
  Authorization: Basic {base64(consumer_key:consumer_secret)}
```

### 3. Query Transaction Status
```
POST https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query

Body:
{
  "BusinessShortCode": "174379",
  "Password": "{base64_encoded_password}",
  "Timestamp": "20231105143000",
  "CheckoutRequestID": "{checkout_request_id}"
}
```

---

## ✅ Go-Live Checklist

### Pre-Production
- [ ] All sandbox tests passed
- [ ] Security audit completed
- [ ] Error handling verified
- [ ] Logging implemented
- [ ] Monitoring setup
- [ ] Backup procedures in place

### Production Setup
- [ ] Production credentials obtained
- [ ] Production business number configured
- [ ] HTTPS configured and verified
- [ ] Callback URLs whitelisted
- [ ] Rate limiting implemented
- [ ] Load testing completed

### Post-Launch
- [ ] Monitor callback success rate
- [ ] Track payment success/failure ratios
- [ ] User feedback collection
- [ ] Performance optimization
- [ ] Documentation updates

---

## 🆘 Common Issues & Solutions

### Issue 1: "Invalid Access Token"
**Solution**: Token expires after 1 hour. Implement automatic token refresh.

### Issue 2: "The initiator information is invalid"
**Solution**: Check Business Short Code and Passkey are correct.

### Issue 3: "Request cancelled by user"
**Solution**: Normal behavior. Handle gracefully with retry option.

### Issue 4: "Callback not received"
**Solution**: 
- Verify callback URL is HTTPS
- Check firewall/security groups
- Ensure URL is publicly accessible
- Implement timeout handling

### Issue 5: "Insufficient Balance"
**Solution**: Show clear error message to tenant with retry option.

---

## 📞 Support Resources

### Daraja Portal
- Website: https://developer.safaricom.co.ke/
- Documentation: https://developer.safaricom.co.ke/Documentation
- Support Email: apisupport@safaricom.co.ke

### Community
- Daraja Community Forum
- Stack Overflow (#daraja-api)
- GitHub discussions

---

## 🎓 Next Steps

1. **Review this documentation thoroughly**
2. **Set up Daraja Portal account**
3. **Get sandbox credentials**
4. **Start with Phase 1 implementation**
5. **Test each phase before moving forward**

Ready to begin? Let's start with Phase 1! 🚀
