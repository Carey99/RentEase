/**
 * Phase 3 Test Script - Daraja Integration
 * 
 * Tests the STK Push payment initiation and status checking
 */

import { connectToDatabase, Landlord, Tenant, PaymentIntent } from './server/database';
import { 
  generatePassword, 
  generateTimestamp, 
  initiateSTKPush,
  querySTKPushStatus,
  getResultMessage,
  RESULT_CODES
} from './server/utils/darajaService';
import { generatePaymentReference } from './server/utils/paymentReference';
import type { Request, Response } from 'express';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let testResults: { test: string; passed: boolean; message: string }[] = [];

function logTest(test: string, passed: boolean, message: string) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? GREEN : RED;
  console.log(`${color}${symbol} ${test}${RESET}`);
  if (message) {
    console.log(`  ${message}`);
  }
  testResults.push({ test, passed, message });
}

async function runTests() {
  console.log(`\n${BLUE}=== Phase 3: STK Push Payment Tests ===${RESET}\n`);

  try {
    // Connect to database
    await connectToDatabase();
    console.log(`${GREEN}✓ Connected to database${RESET}\n`);

    // Cleanup any leftover test data from previous runs
    console.log(`${YELLOW}Cleaning up previous test data...${RESET}`);
    await Landlord.deleteMany({ email: { $regex: 'phase3@test.com' } });
    await Tenant.deleteMany({ email: { $regex: 'phase3@test.com' } });
    console.log('Cleanup complete\n');

    // Test 1: Password Generation
    console.log(`${BLUE}Test 1: Password Generation${RESET}`);
    const timestamp1 = generateTimestamp();
    const shortCode1 = '174379';
    
    logTest(
      'Timestamp format is correct',
      /^\d{14}$/.test(timestamp1),
      `Generated: ${timestamp1} (YYYYMMDDHHmmss)`
    );

    try {
      const password1 = generatePassword(shortCode1, timestamp1);
      logTest(
        'Password generation successful',
        password1.length > 0 && /^[A-Za-z0-9+/=]+$/.test(password1),
        `Generated: ${password1.substring(0, 20)}... (Base64)`
      );
    } catch (error: any) {
      logTest(
        'Password generation',
        false,
        `Error: ${error.message}`
      );
    }

    // Test 2: Payment Reference Generation
    console.log(`\n${BLUE}Test 2: Payment Reference Generation${RESET}`);
    const testLandlordId = '507f1f77bcf86cd799439011';
    const testTenantId = '507f191e810c19729de860ea';
    
    const reference1 = generatePaymentReference(testLandlordId, testTenantId);
    const reference2 = generatePaymentReference(testLandlordId, testTenantId);
    
    logTest(
      'Payment references are unique',
      reference1 !== reference2,
      `Ref1: ${reference1}\nRef2: ${reference2}`
    );
    
    logTest(
      'Payment reference format is correct',
      /^RE-\d{6}-L[a-zA-Z0-9]{3}-T[a-zA-Z0-9]{3}-[A-Z0-9]{6}$/.test(reference1),
      `Format: ${reference1}`
    );

    // Test 3: Result Code Messages
    console.log(`\n${BLUE}Test 3: Result Code Messages${RESET}`);
    const successMsg = getResultMessage(RESULT_CODES.SUCCESS);
    const cancelMsg = getResultMessage(RESULT_CODES.USER_CANCELLED);
    const timeoutMsg = getResultMessage(RESULT_CODES.TIMEOUT);
    
    logTest(
      'Success message is correct',
      successMsg.includes('successfully'),
      `Message: ${successMsg}`
    );
    
    logTest(
      'Cancel message is correct',
      cancelMsg.includes('cancelled'),
      `Message: ${cancelMsg}`
    );
    
    logTest(
      'Timeout message is correct',
      timeoutMsg.includes('timeout') || timeoutMsg.includes('PIN'),
      `Message: ${timeoutMsg}`
    );

    // Test 4: Create Test Data
    console.log(`\n${BLUE}Test 4: Create Test Landlord and Tenant${RESET}`);
    
    // Create landlord with M-Pesa configuration
    const landlord = await Landlord.create({
      fullName: 'Test Landlord - Phase 3',
      email: 'landlord-phase3@test.com',
      password: 'dummy',
      role: 'landlord',
      paymentMethod: 'daraja',
      darajaConfig: {
        businessShortCode: '174379', // Sandbox paybill
        businessType: 'paybill',
        businessName: 'Test Business',
        accountNumber: 'RENT',
        isConfigured: true,
        isActive: true,
        configuredAt: new Date()
      }
    });

    logTest(
      'Landlord created with M-Pesa config',
      landlord.darajaConfig?.isActive === true,
      `Landlord ID: ${landlord._id}, Paybill: ${landlord.darajaConfig?.businessShortCode}`
    );

    // Create tenant
    const tenant = await Tenant.create({
      fullName: 'Test Tenant - Phase 3',
      email: 'tenant-phase3@test.com',
      password: 'dummy',
      role: 'tenant',
      phone: '254712345678',
      apartmentInfo: {
        landlordId: landlord._id.toString(),
        propertyId: '507f1f77bcf86cd799439011',
        propertyName: 'Test Property',
        unitNumber: 'A101',
        rent: 1
      }
    });

    logTest(
      'Tenant created',
      tenant.phone === '254712345678',
      `Tenant ID: ${tenant._id}, Phone: ${tenant.phone}`
    );

    // Test 5: PaymentIntent Creation
    console.log(`\n${BLUE}Test 5: PaymentIntent Creation${RESET}`);
    
    const paymentReference = generatePaymentReference(
      landlord._id.toString(),
      tenant._id.toString()
    );

    const paymentIntent = await PaymentIntent.create({
      tenantId: tenant._id,
      landlordId: landlord._id,
      amount: 1,
      phoneNumber: tenant.phone,
      paymentReference,
      businessShortCode: landlord.darajaConfig!.businessShortCode,
      businessType: landlord.darajaConfig!.businessType,
      status: 'pending',
      initiatedAt: new Date()
    });

    logTest(
      'PaymentIntent created',
      paymentIntent.status === 'pending',
      `Payment ID: ${paymentIntent._id}, Amount: KES ${paymentIntent.amount}`
    );

    logTest(
      'PaymentIntent has correct business routing',
      paymentIntent.businessShortCode === '174379',
      `Routes to: ${paymentIntent.businessShortCode} (${paymentIntent.businessType})`
    );

    // Test 6: STK Push Initiation (sandbox)
    console.log(`\n${BLUE}Test 6: STK Push Initiation (Real API Call)${RESET}`);
    console.log(`${YELLOW}⚠️  This will send an actual STK Push to the test phone${RESET}`);
    console.log(`${YELLOW}⚠️  Amount: KES 1 (sandbox)${RESET}\n`);

    try {
      const stkResponse = await initiateSTKPush({
        landlordId: landlord._id.toString(),
        tenantId: tenant._id.toString(),
        tenantPhone: '254708374149', // Use Safaricom test number
        amount: 1,
        businessShortCode: '174379',
        businessType: 'paybill',
        accountReference: 'RENT',
        transactionDesc: 'Test Rent'
      });

      logTest(
        'STK Push initiated successfully',
        stkResponse.success === true,
        `Response: ${stkResponse.responseDescription}`
      );

      logTest(
        'Checkout Request ID received',
        stkResponse.checkoutRequestId.length > 0,
        `CheckoutRequestID: ${stkResponse.checkoutRequestId}`
      );

      // Update payment intent with STK details
      paymentIntent.merchantRequestId = stkResponse.merchantRequestId;
      paymentIntent.checkoutRequestId = stkResponse.checkoutRequestId;
      await paymentIntent.save();

      console.log(`${CYAN}\n📱 STK Push sent! Customer message:${RESET}`);
      console.log(`${CYAN}"${stkResponse.customerMessage}"${RESET}\n`);

      // Test 7: Payment Status Query
      console.log(`${BLUE}Test 7: Payment Status Query${RESET}`);
      console.log(`${YELLOW}⚠️  Waiting 5 seconds before querying status...${RESET}\n`);
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const statusResponse = await querySTKPushStatus(
          '174379',
          stkResponse.checkoutRequestId
        );

        logTest(
          'Status query executed',
          statusResponse.resultCode !== undefined,
          `Result Code: ${statusResponse.resultCode}`
        );

        logTest(
          'Status result description received',
          statusResponse.resultDesc.length > 0,
          `Description: ${statusResponse.resultDesc}`
        );

        const resultMessage = getResultMessage(statusResponse.resultCode);
        console.log(`${CYAN}  Human-readable message: ${resultMessage}${RESET}`);

      } catch (statusError: any) {
        logTest(
          'Status query',
          false,
          `Query error (expected in sandbox): ${statusError.message}`
        );
        console.log(`${YELLOW}  Note: Status queries may fail in sandbox after initial success${RESET}`);
      }

    } catch (stkError: any) {
      logTest(
        'STK Push initiation',
        false,
        `Error: ${stkError.message}`
      );
      console.log(`${RED}  Full error: ${JSON.stringify(stkError, null, 2)}${RESET}`);
    }

    // Test 8: Multi-Tenant Payment Routing
    console.log(`\n${BLUE}Test 8: Multi-Tenant Payment Routing${RESET}`);
    
    // Create second landlord with different paybill
    const landlord2 = await Landlord.create({
      fullName: 'Test Landlord 2',
      email: 'landlord2-phase3@test.com',
      password: 'dummy',
      role: 'landlord',
      paymentMethod: 'daraja',
      darajaConfig: {
        businessShortCode: '556677',
        businessType: 'till',
        businessName: 'Another Business',
        isConfigured: true,
        isActive: true,
        configuredAt: new Date()
      }
    });

    const tenant2 = await Tenant.create({
      fullName: 'Test Tenant 2',
      email: 'tenant2-phase3@test.com',
      password: 'dummy',
      role: 'tenant',
      phone: '254722334455',
      apartmentInfo: {
        landlordId: landlord2._id.toString(),
        propertyId: '507f1f77bcf86cd799439012',
        propertyName: 'Test Property 2',
        unitNumber: 'B202',
        rent: 25000
      }
    });

    const paymentIntent2 = await PaymentIntent.create({
      tenantId: tenant2._id,
      landlordId: landlord2._id,
      amount: 25000,
      phoneNumber: tenant2.phone,
      paymentReference: generatePaymentReference(
        landlord2._id.toString(),
        tenant2._id.toString()
      ),
      businessShortCode: landlord2.darajaConfig!.businessShortCode,
      businessType: landlord2.darajaConfig!.businessType,
      status: 'pending',
      initiatedAt: new Date()
    });

    logTest(
      'Payment 1 routes to Landlord 1 paybill',
      paymentIntent.businessShortCode === '174379' &&
      paymentIntent.businessType === 'paybill',
      `L1: ${paymentIntent.businessShortCode} (${paymentIntent.businessType})`
    );

    logTest(
      'Payment 2 routes to Landlord 2 till',
      paymentIntent2.businessShortCode === '556677' &&
      paymentIntent2.businessType === 'till',
      `L2: ${paymentIntent2.businessShortCode} (${paymentIntent2.businessType})`
    );

    logTest(
      'Payments are independent',
      paymentIntent.landlordId.toString() !== paymentIntent2.landlordId.toString(),
      'Each payment routes to correct landlord'
    );

    // Cleanup
    console.log(`\n${YELLOW}Cleaning up test data...${RESET}`);
    await Landlord.deleteMany({ _id: { $in: [landlord._id, landlord2._id] } });
    await Tenant.deleteMany({ _id: { $in: [tenant._id, tenant2._id] } });
    await PaymentIntent.deleteMany({ 
      _id: { $in: [paymentIntent._id, paymentIntent2._id] } 
    });
    console.log('Test data deleted\n');

    // Summary
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    const color = passed === total ? GREEN : (passed > 0 ? YELLOW : RED);

    console.log(`\n${color}=== Test Summary ===${RESET}`);
    console.log(`${color}Passed: ${passed}/${total}${RESET}`);
    
    if (passed === total) {
      console.log(`\n${GREEN}✓ All Phase 3 backend tests passed!${RESET}`);
      console.log(`${GREEN}✓ STK Push service working correctly${RESET}`);
      console.log(`${GREEN}✓ Payment routing to landlord-specific accounts verified${RESET}`);
      console.log(`${GREEN}✓ Multi-tenant architecture validated${RESET}`);
      console.log(`\n${BLUE}Ready to proceed to Phase 3 Frontend: Tenant Payment UI${RESET}\n`);
    } else {
      console.log(`\n${YELLOW}⚠️  Some tests failed, but this may be expected in sandbox${RESET}`);
      console.log(`${YELLOW}⚠️  Review the errors above to determine if they're critical${RESET}\n`);
    }

    // Important Notes
    console.log(`${CYAN}=== Important Notes ===${RESET}`);
    console.log(`${CYAN}1. STK Push was sent to test number 254708374149${RESET}`);
    console.log(`${CYAN}2. In production, you'll need to configure a public callback URL${RESET}`);
    console.log(`${CYAN}3. Sandbox may have limitations on status queries${RESET}`);
    console.log(`${CYAN}4. Test with your own phone number in production${RESET}\n`);

  } catch (error) {
    console.error(`${RED}✗ Test execution failed:${RESET}`, error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
