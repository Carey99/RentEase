/**
 * Phase 2 Email Integration Test Script
 * Tests all email functionality: welcome, payment confirmation, manual reminders, settings
 */

import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase, Landlord, Tenant } from './database';
import { sendWelcomeEmail, sendPaymentReceivedEmail, sendRentReminderEmail } from './services/emailService';
import { format } from 'date-fns';

async function testPhase2() {
  console.log('\n🧪 Phase 2 Email Integration Tests\n');
  console.log('=' .repeat(50));

  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');

    // Get test landlord and tenant
    const landlord = await Landlord.findOne({ email: 'landlord@example.com' });
    const tenant = await Tenant.findOne({ email: 'tenant@example.com' });

    if (!landlord) {
      console.log('❌ Test landlord not found (landlord@example.com)');
      console.log('Please ensure test data is seeded\n');
      process.exit(1);
    }

    if (!tenant) {
      console.log('❌ Test tenant not found (tenant@example.com)');
      process.exit(1);
    }

    console.log(`✅ Found landlord: ${landlord.fullName} (${landlord.email})`);
    console.log(`✅ Found tenant: ${tenant.fullName} (${tenant.email})\n`);

    // Test 1: Enable email settings for landlord
    console.log('🧪 Test 1: Enabling email settings for landlord...');
    landlord.emailSettings = {
      enabled: true,
      autoRemindersEnabled: true,
      reminderDaysBefore: 3,
      fromName: 'RentEase Property Management',
      templates: {
        welcome: {
          subject: 'Welcome to Your New Home!',
          customMessage: 'We are delighted to have you as our tenant. If you have any questions, please don\'t hesitate to reach out.'
        },
        paymentReceived: {
          subject: 'Payment Confirmation - Rent Receipt',
          customMessage: 'Thank you for your prompt payment. We appreciate your timely payments!'
        },
        rentReminder: {
          subject: 'Upcoming Rent Payment Reminder',
          customMessage: 'This is a friendly reminder about your upcoming rent payment. Please ensure timely payment to avoid late fees.'
        }
      }
    };
    await landlord.save();
    console.log('✅ Email settings enabled and saved\n');

    // Test 2: Send Welcome Email
    console.log('🧪 Test 2: Sending welcome email...');
    const testEmail = 'edwinakidah1@gmail.com'; // Send to real email for testing
    try {
      await sendWelcomeEmail({
        tenantName: tenant.fullName,
        tenantEmail: testEmail,
        landlordName: landlord.fullName,
        landlordEmail: landlord.email,
        landlordPhone: landlord.phone ?? undefined,
        propertyName: tenant.apartmentInfo?.propertyName || 'Test Property',
        unitNumber: tenant.apartmentInfo?.unitNumber || 'A101',
        rentAmount: Number(tenant.apartmentInfo?.rentAmount) || 1200,
        moveInDate: format(new Date(), 'MMMM dd, yyyy'),
        customMessage: landlord.emailSettings?.templates?.welcome?.customMessage,
        landlordId: landlord.id,
        tenantId: tenant.id
      });
      console.log(`✅ Welcome email sent to ${testEmail}\n`);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
    }

    // Test 3: Send Payment Received Email
    console.log('🧪 Test 3: Sending payment confirmation email...');
    try {
      await sendPaymentReceivedEmail({
        tenantName: tenant.fullName,
        tenantEmail: testEmail,
        landlordName: landlord.fullName,
        amount: 1200,
        paymentDate: format(new Date(), 'MMMM dd, yyyy'),
        paymentMethod: 'Test Payment',
        receiptNumber: 'TEST-' + Date.now(),
        propertyName: tenant.apartmentInfo?.propertyName || 'Test Property',
        unitNumber: tenant.apartmentInfo?.unitNumber || 'A101',
        forMonth: format(new Date(), 'MMMM'),
        forYear: new Date().getFullYear(),
        landlordId: landlord.id,
        tenantId: tenant.id
      });
      console.log(`✅ Payment confirmation email sent to ${testEmail}\n`);
    } catch (error) {
      console.error('❌ Failed to send payment confirmation email:', error);
    }

    // Test 4: Send Rent Reminder Email
    console.log('🧪 Test 4: Sending rent reminder email...');
    try {
      await sendRentReminderEmail({
        tenantName: tenant.fullName,
        tenantEmail: testEmail,
        landlordName: landlord.fullName,
        landlordEmail: landlord.email,
        landlordPhone: landlord.phone ?? undefined,
        amountDue: 1200,
        dueDate: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy'), // 3 days from now
        daysRemaining: 3,
        propertyName: tenant.apartmentInfo?.propertyName || 'Test Property',
        unitNumber: tenant.apartmentInfo?.unitNumber || 'A101',
        customMessage: landlord.emailSettings?.templates?.rentReminder?.customMessage,
        mpesaPaybill: landlord.darajaConfig?.businessShortCode ?? undefined,
        mpesaAccountNumber: landlord.darajaConfig?.accountNumber ?? undefined,
        landlordId: landlord.id,
        tenantId: tenant.id
      });
      console.log(`✅ Rent reminder email sent to ${testEmail}\n`);
    } catch (error) {
      console.error('❌ Failed to send rent reminder email:', error);
    }

    // Test 5: Check notification logs
    console.log('🧪 Test 5: Checking notification logs...');
    const { NotificationLog } = await import('./database');
    const logs = await NotificationLog.find({ landlordId: landlord.id })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`✅ Found ${logs.length} notification logs:`);
    logs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.type} - ${log.status} - ${log.recipientEmail} - ${format(log.createdAt, 'MMM dd, yyyy HH:mm')}`);
    });
    console.log('');

    // Summary
    console.log('=' .repeat(50));
    console.log('\n✅ Phase 2 Testing Complete!\n');
    console.log('📧 Check your email inbox (edwinakidah1@gmail.com) for:');
    console.log(`   - Welcome email`);
    console.log(`   - Payment confirmation email`);
    console.log(`   - Rent reminder email`);
    console.log('\n📊 Email settings are now enabled for automatic reminders');
    console.log('⏰ Scheduler will run daily at 8:00 AM EAT\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testPhase2();
