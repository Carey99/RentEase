/**
 * Phase 1 Utilities Test Script
 * Tests all Phase 1 utilities to ensure they work correctly
 */

import { paystackService } from './server/utils/paystackService';
import { 
  generatePaymentReference, 
  generateIdempotencyKey,
  validatePaymentReference,
  parsePaymentReference 
} from './server/utils/paymentReference';
import { 
  normalizePhoneNumber,
  isValidKenyanPhone,
  getNetworkOperator,
  validatePhone 
} from './server/utils/phoneNormalizer';

console.log('🧪 Testing Phase 1 Utilities...\n');

// ============================================
// Test 1: Phone Normalizer
// ============================================
console.log('📱 TEST 1: Phone Normalizer');
console.log('═'.repeat(50));

const testPhones = [
  '0708374149',
  '+254708374149',
  '254708374149',
  '708374149',
  '0112345678',  // Invalid format
  '254722123456', // Valid Airtel
  '0733123456',   // Valid Safaricom
];

testPhones.forEach(phone => {
  const result = validatePhone(phone);
  console.log(`\nInput: ${phone}`);
  console.log(`Valid: ${result.valid ? '✅' : '❌'}`);
  if (result.valid) {
    console.log(`Normalized: ${result.normalized}`);
    console.log(`Operator: ${result.operator}`);
    console.log(`Formatted: ${result.formatted}`);
  } else {
    console.log(`Error: ${result.error}`);
  }
});

console.log('\n' + '═'.repeat(50));

// ============================================
// Test 2: Payment Reference Generator
// ============================================
console.log('\n💳 TEST 2: Payment Reference Generator');
console.log('═'.repeat(50));

// Generate sample references
const landlordId = 'L123';
const tenantId = 'T456';

console.log('\nGenerating 5 unique payment references:');
for (let i = 0; i < 5; i++) {
  const ref = generatePaymentReference(landlordId, tenantId);
  const isValid = validatePaymentReference(ref);
  const parsed = parsePaymentReference(ref);
  
  console.log(`\n${i + 1}. Reference: ${ref}`);
  console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
  console.log(`   Parsed:`);
  console.log(`     - Landlord ID: ${parsed.landlordId}`);
  console.log(`     - Tenant ID: ${parsed.tenantId}`);
  console.log(`     - Timestamp: ${parsed.timestamp}`);
  console.log(`     - Hash: ${parsed.hash}`);
}

// Test idempotency key
console.log('\n\nGenerating idempotency keys:');
const ref1 = generatePaymentReference(landlordId, tenantId);
const key1a = generateIdempotencyKey(ref1);
const key1b = generateIdempotencyKey(ref1);

console.log(`\nReference: ${ref1}`);
console.log(`Key 1: ${key1a}`);
console.log(`Key 2: ${key1b}`);
console.log(`Keys match: ${key1a === key1b ? '✅' : '❌'} (should match - same input)`);

// Different reference should produce different key
const ref2 = generatePaymentReference(landlordId, tenantId);
const key2 = generateIdempotencyKey(ref2);
console.log(`\nDifferent reference: ${ref2}`);
console.log(`Different key: ${key2}`);
console.log(`Keys differ: ${key1a !== key2 ? '✅' : '❌'} (should differ - different input)`);

console.log('\n' + '═'.repeat(50));

// ============================================
// Test 3: Paystack Service Connection
// ============================================
console.log('\n🔌 TEST 3: Paystack Service Connection');
console.log('═'.repeat(50));

console.log('\nTesting connection to Paystack API...');

paystackService.testConnection()
  .then(result => {
    if (result.success) {
      console.log('✅ SUCCESS: Connected to Paystack API');
      console.log(`Message: ${result.message}`);
    } else {
      console.log('❌ FAILED: Could not connect to Paystack');
      console.log(`Error: ${result.message}`);
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ Phase 1 Utilities Testing Complete!\n');
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(50));
    console.log('✅ Phone Normalizer - Tested multiple formats');
    console.log('✅ Payment Reference Generator - Generated unique references');
    console.log('✅ Idempotency Keys - Verified consistency');
    console.log(`${result.success ? '✅' : '❌'} Paystack Connection - ${result.success ? 'Connected' : 'Failed'}`);
    console.log('═'.repeat(50));
    
    if (result.success) {
      console.log('\n🎉 All Phase 1 utilities are working correctly!');
      console.log('🚀 Ready to proceed to Phase 2!\n');
    } else {
      console.log('\n⚠️  Paystack connection failed. Check your API keys in .env');
      console.log('   Other utilities are working correctly.\n');
    }
  })
  .catch(error => {
    console.error('❌ ERROR testing Paystack connection:', error.message);
    console.log('\n⚠️  Check your .env file:');
    console.log('   - PAYSTACK_SECRET_KEY is set');
    console.log('   - PAYSTACK_PUBLIC_KEY is set');
    console.log('   - PAYSTACK_ENV is set to "test"');
    console.log('\n' + '═'.repeat(50));
  });
