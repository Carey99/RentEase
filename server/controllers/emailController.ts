/**
 * Email Controller
 * Handles email notification operations
 */

import type { Request, Response } from 'express';
import { Landlord, Tenant, NotificationLog, PaymentHistory } from '../database';
import {
  sendWelcomeEmail,
  sendPaymentReceivedEmail,
  sendRentReminderEmail,
  sendTestEmail,
} from '../services/emailService';
import { format } from 'date-fns';

/**
 * Send manual rent reminder to a single tenant
 * POST /api/emails/send-reminder/:tenantId
 */
export async function sendManualReminder(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { customMessage } = req.body;
    const landlordId = req.session?.userId;

    if (!landlordId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📧 Manual reminder request for tenant ${tenantId} from landlord ${landlordId}`);

    // Get tenant with populated property info
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify tenant belongs to this landlord
    if (tenant.apartmentInfo?.landlordId?.toString() !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get landlord details
    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Use the tenant's actual rent cycle data (already calculated correctly)
    const nextDueDate = tenant.rentCycle?.nextDueDate || new Date();
    const daysRemaining = tenant.rentCycle?.daysRemaining ?? 0;
    const today = new Date();

    // Fetch payment history for detailed breakdown
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const paymentRecords = await PaymentHistory.find({
      tenantId: tenant._id,
    }).sort({ forYear: -1, forMonth: -1 }).lean();

    // Filter out transaction records (only bills)
    const allBills = paymentRecords.filter(p => !(p as any).notes?.includes('Payment transaction'));
    
    // Get current month's bill
    const currentMonthBill = allBills.find(
      p => p.forMonth === currentMonth && p.forYear === currentYear
    );

    // Calculate breakdown
    const baseRent = Number(tenant.apartmentInfo?.rentAmount) || 0;
    const utilitiesCharges = currentMonthBill?.totalUtilityCost || 0;

    // Calculate historical debt (previous unpaid balances)
    let historicalDebt = 0;
    const previousBills = allBills.filter(b => {
      return (b.forYear < currentYear) || (b.forYear === currentYear && b.forMonth < currentMonth);
    });
    
    for (const bill of previousBills) {
      const expectedAmount = Number(bill.monthlyRent || 0) + Number(bill.totalUtilityCost || 0);
      const paidAmount = Number(bill.amount || 0);
      const balance = expectedAmount - paidAmount;
      
      if (balance > 0) {
        historicalDebt += balance;
      }
    }

    // Total amount due: ONLY sum if there's a current month bill
    // Otherwise, just show the historical debt
    let totalAmountDue = historicalDebt;
    if (currentMonthBill) {
      totalAmountDue = baseRent + utilitiesCharges + historicalDebt;
    }

    // Send reminder email with tenant's actual days remaining (can be negative for overdue)
    const result = await sendRentReminderEmail({
      tenantId: tenant._id.toString(),
      tenantName: tenant.fullName,
      tenantEmail: tenant.email,
      landlordId: landlord._id.toString(),
      landlordName: landlord.fullName,
      landlordEmail: landlord.email,
      landlordPhone: landlord.phone ?? undefined,
      amountDue: totalAmountDue,
      dueDate: format(nextDueDate, 'MMMM dd, yyyy'),
      daysRemaining: daysRemaining, // Use actual value, can be negative for overdue
      propertyName: tenant.apartmentInfo?.propertyName || 'Property',
      unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
      customMessage: customMessage || landlord.emailSettings?.templates?.rentReminder?.customMessage,
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Reminder sent successfully',
        emailId: result.emailId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email',
      });
    }
  } catch (error: any) {
    console.error('❌ Error sending manual reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
}

/**
 * Send bulk rent reminders to multiple tenants
 * POST /api/emails/send-bulk-reminders
 */
export async function sendBulkReminders(req: Request, res: Response) {
  try {
    const { tenantIds, customMessage } = req.body;
    const landlordId = req.session?.userId;

    if (!landlordId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!tenantIds || !Array.isArray(tenantIds) || tenantIds.length === 0) {
      return res.status(400).json({ error: 'Tenant IDs are required' });
    }

    console.log(`📧 Bulk reminder request for ${tenantIds.length} tenants from landlord ${landlordId}`);

    // Get landlord details - this landlord's info will be used in all emails
    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Get all tenants - ONLY tenants that belong to this landlord
    const tenants = await Tenant.find({
      _id: { $in: tenantIds },
      'apartmentInfo.landlordId': landlordId,
    }).lean();

    if (tenants.length === 0) {
      return res.status(404).json({ error: 'No valid tenants found for this landlord' });
    }

    console.log(`✅ Found ${tenants.length} valid tenant(s) belonging to landlord ${landlord.fullName}`);

    // Send reminders to all tenants using their actual rent cycle data
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        // Verify tenant's landlordId matches (double-check for security)
        if (tenant.apartmentInfo?.landlordId?.toString() !== landlordId) {
          console.warn(`⚠️  Skipping tenant ${tenant._id} - landlord mismatch`);
          return { success: false, error: 'Landlord mismatch' };
        }

        console.log(`  📤 Sending reminder to ${tenant.fullName} from landlord ${landlord.fullName}`);

        // Use tenant's actual rent cycle data (already correctly calculated)
        const nextDueDate = tenant.rentCycle?.nextDueDate || new Date();
        const daysRemaining = tenant.rentCycle?.daysRemaining ?? 0;

        // Fetch payment history for breakdown
        const paymentRecords = await PaymentHistory.find({
          tenantId: tenant._id,
        }).sort({ forYear: -1, forMonth: -1 }).lean();

        // Filter out transaction records (only bills)
        const allBills = paymentRecords.filter(p => !(p as any).notes?.includes('Payment transaction'));
        
        // Get current month's bill
        const currentMonthBill = allBills.find(
          p => p.forMonth === currentMonth && p.forYear === currentYear
        );

        const baseRent = Number(tenant.apartmentInfo?.rentAmount) || 0;
        const utilitiesCharges = currentMonthBill?.totalUtilityCost || 0;

        // Calculate historical debt
        let historicalDebt = 0;
        const previousBills = allBills.filter(b => {
          return (b.forYear < currentYear) || (b.forYear === currentYear && b.forMonth < currentMonth);
        });
        
        for (const bill of previousBills) {
          const expectedAmount = Number(bill.monthlyRent || 0) + Number(bill.totalUtilityCost || 0);
          const paidAmount = Number(bill.amount || 0);
          const balance = expectedAmount - paidAmount;
          
          if (balance > 0) {
            historicalDebt += balance;
          }
        }

        // Total amount due
        let totalAmountDue = historicalDebt;
        if (currentMonthBill) {
          totalAmountDue = baseRent + utilitiesCharges + historicalDebt;
        }

        return sendRentReminderEmail({
          tenantId: tenant._id.toString(),
          tenantName: tenant.fullName,
          tenantEmail: tenant.email,
          landlordId: landlord._id.toString(),
          landlordName: landlord.fullName,
          landlordEmail: landlord.email,
          landlordPhone: landlord.phone ?? undefined,
          amountDue: totalAmountDue,
          dueDate: format(nextDueDate, 'MMMM dd, yyyy'),
          daysRemaining: daysRemaining, // Use actual value, can be negative for overdue
          propertyName: tenant.apartmentInfo?.propertyName || 'Property',
          unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
          customMessage: customMessage || landlord.emailSettings?.templates?.rentReminder?.customMessage,
        });
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`✅ Bulk reminders: ${successful} sent, ${failed} failed`);

    res.json({
      success: true,
      message: `Reminders sent to ${successful} tenant(s)`,
      total: results.length,
      successful,
      failed,
    });
  } catch (error: any) {
    console.error('❌ Error sending bulk reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
}

/**
 * Get email notification settings for landlord
 * GET /api/emails/settings/:landlordId
 */
export async function getEmailSettings(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;
    const sessionLandlordId = req.session?.userId;

    if (!sessionLandlordId || sessionLandlordId !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    res.json({
      emailSettings: landlord.emailSettings || {
        enabled: true,
        autoRemindersEnabled: false,
        reminderDaysBefore: 3,
        fromName: 'RentEase',
        templates: {
          rentReminder: { subject: 'Rent Payment Reminder', customMessage: '' },
          paymentReceived: { subject: 'Payment Received - Thank You!', customMessage: '' },
          welcome: { subject: 'Welcome to Your New Home!', customMessage: '' },
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Error getting email settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
}

/**
 * Update email notification settings
 * PUT /api/emails/settings/:landlordId
 */
export async function updateEmailSettings(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;
    const sessionLandlordId = req.session?.userId;

    if (!sessionLandlordId || sessionLandlordId !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { emailSettings } = req.body;

    if (!emailSettings) {
      return res.status(400).json({ error: 'Email settings are required' });
    }

    const landlord = await Landlord.findByIdAndUpdate(
      landlordId,
      { $set: { emailSettings } },
      { new: true, runValidators: true }
    ).lean();

    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    console.log(`✅ Email settings updated for landlord ${landlordId}`);

    res.json({
      success: true,
      message: 'Email settings updated successfully',
      emailSettings: landlord.emailSettings,
    });
  } catch (error: any) {
    console.error('❌ Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

/**
 * Get email notification history
 * GET /api/emails/history/:landlordId
 */
export async function getEmailHistory(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;
    const sessionLandlordId = req.session?.userId;

    if (!sessionLandlordId || sessionLandlordId !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { type, status, limit = 50, page = 1 } = req.query;

    const query: any = { landlordId };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      NotificationLog.find(query)
        .populate('tenantId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(skip)
        .lean(),
      NotificationLog.countDocuments(query),
    ]);

    res.json({
      history,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('❌ Error getting email history:', error);
    res.status(500).json({ error: 'Failed to get email history' });
  }
}

/**
 * Send test email
 * POST /api/emails/test/:landlordId
 */
export async function sendTestEmailController(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;
    const { testEmail } = req.body;
    const sessionLandlordId = req.session?.userId;

    if (!sessionLandlordId || sessionLandlordId !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Always use verified email for test (Resend free tier restriction)
    const recipientEmail = process.env.TEST_EMAIL || 'edwinakidah1@gmail.com';
    
    console.log(`📧 Sending test email to ${recipientEmail} (verified address)`);

    const result = await sendTestEmail({
      recipientEmail,
      landlordName: landlord.fullName,
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${recipientEmail}`,
        emailId: result.emailId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test email',
      });
    }
  } catch (error: any) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
}
