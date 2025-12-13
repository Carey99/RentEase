/**
 * Email Service using Resend
 * Handles all email sending operations with React Email templates
 */

import { Resend } from 'resend';
import { render } from '@react-email/render';
import WelcomeEmail from '../emails/templates/WelcomeEmail';
import PaymentReceivedEmail from '../emails/templates/PaymentReceivedEmail';
import RentReminderEmail from '../emails/templates/RentReminderEmail';
import { NotificationLog } from '../database';
import { generateReceiptBuffer } from '../utils/receiptGenerator';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Log email notification to database
 */
async function logEmail(data: {
  landlordId: string;
  tenantId: string;
  type: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed';
  resendEmailId?: string;
  failureReason?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await NotificationLog.create({
      ...data,
      sentAt: data.status === 'sent' ? new Date() : undefined,
    });
  } catch (error) {
    console.error('❌ Error logging email:', error);
  }
}

/**
 * Send Welcome Email to new tenant
 */
export async function sendWelcomeEmail(params: {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  landlordId: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  moveInDate?: string;
  customMessage?: string;
}): Promise<EmailResult> {
  try {
    console.log(`📧 Sending welcome email to ${params.tenantName} (${params.tenantEmail})`);

    const emailHtml = await render(
      WelcomeEmail({
        tenantName: params.tenantName,
        landlordName: params.landlordName,
        landlordEmail: params.landlordEmail,
        landlordPhone: params.landlordPhone,
        propertyName: params.propertyName,
        unitNumber: params.unitNumber,
        rentAmount: params.rentAmount,
        moveInDate: params.moveInDate,
        customMessage: params.customMessage,
      })
    );

    const { data, error } = await resend.emails.send({
      from: `RentEase <${FROM_EMAIL}>`,
      to: params.tenantEmail,
      subject: `Welcome to ${params.propertyName}!`,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      await logEmail({
        landlordId: params.landlordId,
        tenantId: params.tenantId,
        type: 'welcome',
        recipientEmail: params.tenantEmail,
        subject: `Welcome to ${params.propertyName}!`,
        status: 'failed',
        failureReason: error.message,
        metadata: { propertyName: params.propertyName, unitNumber: params.unitNumber },
      });
      return { success: false, error: error.message };
    }

    console.log(`✅ Welcome email sent successfully! Email ID: ${data?.id}`);
    await logEmail({
      landlordId: params.landlordId,
      tenantId: params.tenantId,
      type: 'welcome',
      recipientEmail: params.tenantEmail,
      subject: `Welcome to ${params.propertyName}!`,
      status: 'sent',
      resendEmailId: data?.id,
      metadata: { propertyName: params.propertyName, unitNumber: params.unitNumber },
    });

    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('❌ Error in sendWelcomeEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Payment Received Email
 */
export async function sendPaymentReceivedEmail(params: {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  landlordId: string;
  landlordName: string;
  landlordEmail?: string;
  landlordPhone?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receiptNumber: string;
  mpesaReceiptNumber?: string;
  propertyName: string;
  propertyType?: string;
  unitNumber: string;
  forMonth: string;
  forYear: number;
  receiptUrl?: string;
  customMessage?: string;
  // Receipt data for PDF attachment
  receiptData?: {
    monthlyRent: number;
    utilityCharges?: Array<{
      type: string;
      units: number;
      pricePerUnit: number;
      total: number;
    }>;
    historicalDebt?: number;
    historicalDebtDetails?: string;
    tenantPhone: string;
    transactionId: string;
    paymentPeriod: string;
  };
}): Promise<EmailResult> {
  try {
    console.log(`📧 Sending payment confirmation to ${params.tenantName} (${params.tenantEmail})`);

    const emailHtml = await render(
      PaymentReceivedEmail({
        tenantName: params.tenantName,
        landlordName: params.landlordName,
        amount: params.amount,
        paymentDate: params.paymentDate,
        paymentMethod: params.paymentMethod,
        receiptNumber: params.receiptNumber,
        propertyName: params.propertyName,
        unitNumber: params.unitNumber,
        forMonth: params.forMonth,
        forYear: params.forYear,
        receiptUrl: params.receiptUrl,
        customMessage: params.customMessage,
      })
    );

    // Generate PDF receipt if receipt data is provided
    let pdfBuffer: Buffer | undefined;
    if (params.receiptData) {
      try {
        pdfBuffer = await generateReceiptBuffer({
          receiptNumber: params.receiptNumber,
          transactionId: params.receiptData.transactionId,
          mpesaReceiptNumber: params.mpesaReceiptNumber,
          amount: params.amount,
          paymentDate: new Date(params.paymentDate),
          paymentMethod: params.paymentMethod,
          monthlyRent: params.receiptData.monthlyRent,
          utilityCharges: params.receiptData.utilityCharges,
          historicalDebt: params.receiptData.historicalDebt,
          historicalDebtDetails: params.receiptData.historicalDebtDetails,
          tenantName: params.tenantName,
          tenantEmail: params.tenantEmail,
          tenantPhone: params.receiptData.tenantPhone,
          propertyName: params.propertyName,
          propertyType: params.propertyType || 'Apartment',
          unitNumber: params.unitNumber,
          landlordName: params.landlordName,
          landlordEmail: params.landlordEmail,
          landlordPhone: params.landlordPhone,
          paymentPeriod: params.receiptData.paymentPeriod,
        });
        console.log('✅ PDF receipt generated for attachment');
      } catch (pdfError) {
        console.warn('⚠️  Failed to generate PDF attachment:', pdfError);
        // Continue sending email without attachment
      }
    }

    const { data, error } = await resend.emails.send({
      from: `${params.landlordName} <${FROM_EMAIL}>`,
      to: params.tenantEmail,
      subject: `Payment Received - KES ${params.amount.toLocaleString()}`,
      html: emailHtml,
      ...(pdfBuffer && {
        attachments: [
          {
            filename: `receipt-${params.receiptNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      }),
    });

    if (error) {
      console.error('❌ Failed to send payment email:', error);
      await logEmail({
        landlordId: params.landlordId,
        tenantId: params.tenantId,
        type: 'payment_received',
        recipientEmail: params.tenantEmail,
        subject: `Payment Received - KES ${params.amount.toLocaleString()}`,
        status: 'failed',
        failureReason: error.message,
        metadata: { 
          paymentAmount: params.amount,
          propertyName: params.propertyName,
          unitNumber: params.unitNumber,
        },
      });
      return { success: false, error: error.message };
    }

    console.log(`✅ Payment email sent successfully! Email ID: ${data?.id}`);
    await logEmail({
      landlordId: params.landlordId,
      tenantId: params.tenantId,
      type: 'payment_received',
      recipientEmail: params.tenantEmail,
      subject: `Payment Received - KES ${params.amount.toLocaleString()}`,
      status: 'sent',
      resendEmailId: data?.id,
      metadata: { 
        paymentAmount: params.amount,
        propertyName: params.propertyName,
        unitNumber: params.unitNumber,
      },
    });

    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('❌ Error in sendPaymentReceivedEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Rent Reminder Email
 */
export async function sendRentReminderEmail(params: {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  landlordId: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone?: string;
  amountDue: number;
  dueDate: string;
  daysRemaining: number;
  propertyName: string;
  unitNumber: string;
  customMessage?: string;
  paymentUrl?: string;
}): Promise<EmailResult> {
  try {
    console.log(`📧 Sending rent reminder to ${params.tenantName} (${params.tenantEmail})`);

    const emailHtml = await render(
      RentReminderEmail({
        tenantName: params.tenantName,
        landlordName: params.landlordName,
        landlordEmail: params.landlordEmail,
        landlordPhone: params.landlordPhone,
        amountDue: params.amountDue,
        dueDate: params.dueDate,
        daysRemaining: params.daysRemaining,
        propertyName: params.propertyName,
        unitNumber: params.unitNumber,
        customMessage: params.customMessage,
        paymentUrl: params.paymentUrl,
      })
    );

    const subject = params.daysRemaining === 0 
      ? 'Rent Payment Due Today'
      : `Rent Reminder - Due in ${params.daysRemaining} ${params.daysRemaining === 1 ? 'Day' : 'Days'}`;

    const { data, error } = await resend.emails.send({
      from: `${params.landlordName} <${FROM_EMAIL}>`,
      to: params.tenantEmail,
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Failed to send reminder email:', error);
      await logEmail({
        landlordId: params.landlordId,
        tenantId: params.tenantId,
        type: 'rent_reminder',
        recipientEmail: params.tenantEmail,
        subject,
        status: 'failed',
        failureReason: error.message,
        metadata: {
          paymentAmount: params.amountDue,
          propertyName: params.propertyName,
          unitNumber: params.unitNumber,
          dueDate: params.dueDate,
        },
      });
      return { success: false, error: error.message };
    }

    console.log(`✅ Reminder email sent successfully! Email ID: ${data?.id}`);
    await logEmail({
      landlordId: params.landlordId,
      tenantId: params.tenantId,
      type: 'rent_reminder',
      recipientEmail: params.tenantEmail,
      subject,
      status: 'sent',
      resendEmailId: data?.id,
      metadata: {
        paymentAmount: params.amountDue,
        propertyName: params.propertyName,
        unitNumber: params.unitNumber,
        dueDate: params.dueDate,
      },
    });

    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('❌ Error in sendRentReminderEmail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(params: {
  recipientEmail: string;
  landlordName: string;
}): Promise<EmailResult> {
  try {
    console.log(`📧 Sending test email to ${params.recipientEmail}`);

    const { data, error } = await resend.emails.send({
      from: `${params.landlordName} <${FROM_EMAIL}>`,
      to: params.recipientEmail,
      subject: 'RentEase Email Test - Configuration Successful! ✅',
      html: `
        <h1>Email Configuration Test</h1>
        <p>Congratulations ${params.landlordName}!</p>
        <p>Your RentEase email notifications are configured correctly and working! 🎉</p>
        <p>You can now:</p>
        <ul>
          <li>✅ Send rent reminders to tenants</li>
          <li>✅ Automatically send payment confirmations</li>
          <li>✅ Welcome new tenants with onboarding emails</li>
        </ul>
        <p><em>This is a test email from RentEase Property Management System</em></p>
      `,
    });

    if (error) {
      console.error('❌ Failed to send test email:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Test email sent successfully! Email ID: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (error: any) {
    console.error('❌ Error in sendTestEmail:', error);
    return { success: false, error: error.message };
  }
}
