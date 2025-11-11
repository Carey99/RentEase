/**
 * Phase 2 Test Script - Daraja Integration
 * 
 * Tests the landlord M-Pesa configuration API
 */

import { connectToDatabase, Landlord } from './server/database';
import { DarajaConfigController } from './server/controllers/darajaConfigController';
import type { Request, Response } from 'express';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
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

// Mock Express Request/Response objects
function createMockReq(params: any, body?: any): Partial<Request> {
  return {
    params,
    body: body || {},
  };
}

function createMockRes(): Partial<Response> & { 
  _status?: number; 
  _json?: any;
  status: (code: number) => any;
  json: (data: any) => any;
} {
  const res: any = {
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: any) {
      res._json = data;
      return res;
    }
  };
  return res;
}

async function runTests() {
  console.log(`\n${BLUE}=== Phase 2: Landlord Configuration API Tests ===${RESET}\n`);

  try {
    // Connect to database
    await connectToDatabase();
    console.log(`${GREEN}✓ Connected to database${RESET}\n`);

    // Create test landlords
    console.log(`${YELLOW}Creating test landlords...${RESET}`);
    
    const landlord1 = await Landlord.create({
      fullName: 'Test Landlord 1',
      email: 'landlord1@test.com',
      password: 'dummy',
      role: 'landlord',
    });

    const landlord2 = await Landlord.create({
      fullName: 'Test Landlord 2',
      email: 'landlord2@test.com',
      password: 'dummy',
      role: 'landlord',
    });

    console.log(`Created landlord1: ${landlord1._id}`);
    console.log(`Created landlord2: ${landlord2._id}\n`);

    // Test 1: Configure M-Pesa (Paybill)
    console.log(`${BLUE}Test 1: Configure M-Pesa Paybill${RESET}`);
    const req1 = createMockReq(
      { landlordId: landlord1._id.toString() },
      {
        businessShortCode: '123456',
        businessType: 'paybill',
        businessName: 'Sunset Properties',
        accountNumber: 'RENT001'
      }
    );
    const res1 = createMockRes();
    await DarajaConfigController.configure(req1 as Request, res1 as Response);
    
    logTest(
      'Paybill configuration saved',
      (!res1._status || res1._status === 200) && res1._json?.success === true,
      res1._json?.message || ''
    );

    // Verify configuration was saved
    const savedLandlord1 = await Landlord.findById(landlord1._id);
    logTest(
      'Configuration persisted in database',
      savedLandlord1?.darajaConfig?.businessShortCode === '123456',
      `Stored: ${savedLandlord1?.darajaConfig?.businessShortCode}`
    );
    logTest(
      'Payment method set to daraja',
      savedLandlord1?.paymentMethod === 'daraja',
      `Payment method: ${savedLandlord1?.paymentMethod}`
    );

    // Test 2: Configure M-Pesa (Till)
    console.log(`\n${BLUE}Test 2: Configure M-Pesa Till${RESET}`);
    const req2 = createMockReq(
      { landlordId: landlord2._id.toString() },
      {
        businessShortCode: '556677',
        businessType: 'till',
        businessName: 'Mombasa Rentals'
      }
    );
    const res2 = createMockRes();
    await DarajaConfigController.configure(req2 as Request, res2 as Response);
    
    logTest(
      'Till configuration saved',
      (!res2._status || res2._status === 200) && res2._json?.success === true,
      res2._json?.message || ''
    );

    // Test 3: Get Configuration Status
    console.log(`\n${BLUE}Test 3: Get Configuration Status${RESET}`);
    const req3 = createMockReq({ landlordId: landlord1._id.toString() });
    const res3 = createMockRes();
    await DarajaConfigController.getStatus(req3 as Request, res3 as Response);
    
    logTest(
      'Status retrieved successfully',
      (!res3._status || res3._status === 200) && res3._json?.isConfigured === true,
      `Configured: ${res3._json?.isConfigured}, Active: ${res3._json?.isActive}`
    );
    logTest(
      'Status shows correct business type',
      res3._json?.businessType === 'paybill',
      `Type: ${res3._json?.businessType}`
    );

    // Test 4: Validation - Invalid short code
    console.log(`\n${BLUE}Test 4: Validation - Invalid Short Code${RESET}`);
    const req4 = createMockReq(
      { landlordId: landlord1._id.toString() },
      {
        businessShortCode: '12', // Too short
        businessType: 'paybill'
      }
    );
    const res4 = createMockRes();
    await DarajaConfigController.configure(req4 as Request, res4 as Response);
    
    logTest(
      'Invalid short code rejected',
      res4._status === 400,
      res4._json?.error || 'Validation failed'
    );

    // Test 5: Validation - Missing required fields
    console.log(`\n${BLUE}Test 5: Validation - Missing Required Fields${RESET}`);
    const req5 = createMockReq(
      { landlordId: landlord1._id.toString() },
      {
        businessShortCode: '123456'
        // Missing businessType
      }
    );
    const res5 = createMockRes();
    await DarajaConfigController.configure(req5 as Request, res5 as Response);
    
    logTest(
      'Missing fields rejected',
      res5._status === 400,
      res5._json?.error || 'Validation failed'
    );

    // Test 6: Test Configuration (requires Daraja credentials)
    console.log(`\n${BLUE}Test 6: Test Configuration${RESET}`);
    const req6 = createMockReq({ landlordId: landlord1._id.toString() });
    const res6 = createMockRes();
    await DarajaConfigController.testConfiguration(req6 as Request, res6 as Response);
    
    logTest(
      'Configuration test executed',
      (!res6._status || res6._status === 200) && res6._json?.success === true,
      res6._json?.message || 'Test completed'
    );

    // Verify lastTestedAt was updated
    const testedLandlord = await Landlord.findById(landlord1._id);
    logTest(
      'lastTestedAt timestamp updated',
      testedLandlord?.darajaConfig?.lastTestedAt !== undefined,
      testedLandlord?.darajaConfig?.lastTestedAt 
        ? `Updated: ${new Date(testedLandlord.darajaConfig.lastTestedAt).toISOString()}`
        : 'Not updated'
    );

    // Test 7: Remove Configuration
    console.log(`\n${BLUE}Test 7: Remove Configuration${RESET}`);
    const req7 = createMockReq({ landlordId: landlord1._id.toString() });
    const res7 = createMockRes();
    await DarajaConfigController.removeConfiguration(req7 as Request, res7 as Response);
    
    logTest(
      'Configuration deactivated',
      (!res7._status || res7._status === 200) && res7._json?.success === true,
      res7._json?.message || ''
    );

    // Verify configuration is inactive but still exists
    const removedLandlord = await Landlord.findById(landlord1._id);
    logTest(
      'Configuration marked inactive',
      removedLandlord?.darajaConfig?.isActive === false,
      `Active: ${removedLandlord?.darajaConfig?.isActive}`
    );
    logTest(
      'Configuration data preserved',
      removedLandlord?.darajaConfig?.businessShortCode === '123456',
      'Data retained for audit'
    );
    logTest(
      'Payment method reset to manual',
      removedLandlord?.paymentMethod === 'manual',
      `Payment method: ${removedLandlord?.paymentMethod}`
    );

    // Test 8: Multiple landlords have independent configs
    console.log(`\n${BLUE}Test 8: Multi-Tenant Independence${RESET}`);
    const landlord1Data = await Landlord.findById(landlord1._id);
    const landlord2Data = await Landlord.findById(landlord2._id);
    
    logTest(
      'Landlord 1 configuration independent',
      landlord1Data?.darajaConfig?.businessShortCode === '123456' &&
      landlord1Data?.darajaConfig?.isActive === false,
      `L1: ${landlord1Data?.darajaConfig?.businessShortCode} (inactive)`
    );
    logTest(
      'Landlord 2 configuration independent',
      landlord2Data?.darajaConfig?.businessShortCode === '556677' &&
      landlord2Data?.darajaConfig?.isActive === true,
      `L2: ${landlord2Data?.darajaConfig?.businessShortCode} (active)`
    );

    // Cleanup
    console.log(`\n${YELLOW}Cleaning up test data...${RESET}`);
    await Landlord.deleteMany({ _id: { $in: [landlord1._id, landlord2._id] } });
    console.log('Test landlords deleted\n');

    // Summary
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    const color = passed === total ? GREEN : (passed > 0 ? YELLOW : RED);

    console.log(`\n${color}=== Test Summary ===${RESET}`);
    console.log(`${color}Passed: ${passed}/${total}${RESET}`);
    
    if (passed === total) {
      console.log(`\n${GREEN}✓ All Phase 2 tests passed!${RESET}`);
      console.log(`${GREEN}✓ Landlord configuration API is working correctly${RESET}`);
      console.log(`${GREEN}✓ Multi-tenant architecture validated${RESET}`);
      console.log(`\n${BLUE}Ready to proceed to Phase 3: STK Push Implementation${RESET}\n`);
    } else {
      console.log(`\n${RED}✗ Some tests failed. Please review the errors above.${RESET}\n`);
    }

  } catch (error) {
    console.error(`${RED}✗ Test execution failed:${RESET}`, error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
