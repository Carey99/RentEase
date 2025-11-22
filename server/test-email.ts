/**
 * Test Script for Email Service
 * Run: npx tsx server/test-email.ts
 */

import dotenv from 'dotenv';
import { sendTestEmail } from './services/emailService';

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...\n');
  
  console.log('Environment Variables:');
  console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set (using default)\n');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ ERROR: RESEND_API_KEY is not set in .env file');
    console.log('\n📝 To fix this:');
    console.log('1. Sign up at https://resend.com');
    console.log('2. Get your API key from the dashboard');
    console.log('3. Add it to your .env file: RESEND_API_KEY=re_...');
    process.exit(1);
  }
  
  // Prompt for email address
  const { createInterface } = await import('readline');
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Enter your email address to receive test email: ', async (email: string) => {
    readline.close();
    
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }
    
    console.log(`\n📧 Sending test email to: ${email}\n`);
    
    const result = await sendTestEmail({
      recipientEmail: email.trim(),
      landlordName: 'Test Landlord'
    });
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Test email sent successfully!');
      console.log(`📬 Email ID: ${result.emailId}`);
      console.log(`\n📥 Check your inbox at ${email}`);
      console.log('   (Check spam folder if you don\'t see it in a few seconds)');
    } else {
      console.error('\n❌ FAILED to send test email');
      console.error('Error:', result.error);
      console.log('\n💡 Common issues:');
      console.log('- Invalid Resend API key');
      console.log('- Email domain not verified (use onboarding@resend.dev for testing)');
      console.log('- Network connectivity issues');
    }
    
    process.exit(result.success ? 0 : 1);
  });
}

testEmailService().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
