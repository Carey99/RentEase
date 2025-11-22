/**
 * Email Controller
 * Handles email notification operations
 */

import type { Request, Response } from 'express';
import { Landlord, Tenant, NotificationLog } from '../database';
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

    // Calculate days remaining
    const nextDueDate = tenant.rentCycle?.nextDueDate || new Date();
    const today = new Date();
    const daysRemaining = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Send reminder email
    const result = await sendRentReminderEmail({
      tenantId: tenant._id.toString(),
      tenantName: tenant.fullName,
      tenantEmail: tenant.email,
      landlordId: landlord._id.toString(),
      landlordName: landlord.fullName,
      landlordEmail: landlord.email,
      landlordPhone: landlord.phone ?? undefined,
      amountDue: Number(tenant.apartmentInfo?.rentAmount) || 0,
      dueDate: format(nextDueDate, 'MMMM dd, yyyy'),
      daysRemaining: Math.max(0, daysRemaining),
      propertyName: tenant.apartmentInfo?.propertyName || 'Property',
      unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
      customMessage: customMessage || landlord.emailSettings?.templates?.rentReminder?.customMessage,
      mpesaPaybill: landlord.darajaConfig?.businessShortCode ?? undefined,
      mpesaAccountNumber: landlord.darajaConfig?.accountNumber ?? undefined,
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

    // Get landlord details
    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Get all tenants
    const tenants = await Tenant.find({
      _id: { $in: tenantIds },
      'apartmentInfo.landlordId': landlordId,
    }).lean();

    if (tenants.length === 0) {
      return res.status(404).json({ error: 'No valid tenants found' });
    }

    // Send reminders to all tenants
    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        const nextDueDate = tenant.rentCycle?.nextDueDate || new Date();
        const today = new Date();
        const daysRemaining = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return sendRentReminderEmail({
          tenantId: tenant._id.toString(),
          tenantName: tenant.fullName,
          tenantEmail: tenant.email,
          landlordId: landlord._id.toString(),
        landlordName: landlord.fullName,
        landlordEmail: landlord.email,
        landlordPhone: landlord.phone ?? undefined,
        amountDue: Number(tenant.apartmentInfo?.rentAmount) || 0,
        dueDate: format(nextDueDate, 'MMMM dd, yyyy'),
        daysRemaining: Math.max(0, daysRemaining),
        propertyName: tenant.apartmentInfo?.propertyName || 'Property',
        unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
        customMessage: customMessage || landlord.emailSettings?.templates?.rentReminder?.customMessage,
        mpesaPaybill: landlord.darajaConfig?.businessShortCode ?? undefined,
        mpesaAccountNumber: landlord.darajaConfig?.accountNumber ?? undefined,
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
    const sessionLandlordId = req.session?.userId;

    if (!sessionLandlordId || sessionLandlordId !== landlordId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const landlord = await Landlord.findById(landlordId).lean();
    if (!landlord) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    console.log(`📧 Sending test email to ${landlord.email}`);

    const result = await sendTestEmail({
      recipientEmail: landlord.email,
      landlordName: landlord.fullName,
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${landlord.email}`,
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
