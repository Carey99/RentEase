/**
 * Email Routes
 * POST /api/emails/send-reminder/:tenantId, /api/emails/send-bulk-reminders, /api/emails/test/:landlordId
 * GET /api/emails/settings/:landlordId, /api/emails/history/:landlordId
 * PUT /api/emails/settings/:landlordId
 * POST /api/emails/trigger-scheduler (dev/testing)
 * GET /api/emails/scheduler-status
 */

import type { Express, Request, Response } from "express";
import { 
  sendManualReminder,
  sendBulkReminders,
  getEmailSettings,
  updateEmailSettings,
  getEmailHistory,
  sendTestEmailController
} from "../controllers/emailController";
import { triggerManualReminderCheck } from "../schedulers/emailReminderScheduler";
import { Landlord, Tenant } from "../database";

export function registerEmailRoutes(app: Express): void {
  // Email notification routes
  app.post("/api/emails/send-reminder/:tenantId", sendManualReminder);
  app.post("/api/emails/send-bulk-reminders", sendBulkReminders);
  app.get("/api/emails/settings/:landlordId", getEmailSettings);
  app.put("/api/emails/settings/:landlordId", updateEmailSettings);
  app.get("/api/emails/history/:landlordId", getEmailHistory);
  app.post("/api/emails/test/:landlordId", sendTestEmailController);
  
  // Test endpoint for manual scheduler trigger (development/testing)
  app.post("/api/emails/trigger-scheduler", async (req: Request, res: Response) => {
    try {
      console.log('🧪 Manual scheduler trigger requested');
      await triggerManualReminderCheck();
      res.json({ 
        success: true, 
        message: 'Scheduler triggered successfully. Check server logs for details.' 
      });
    } catch (error: any) {
      console.error('❌ Error triggering scheduler:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoint to check scheduler configuration
  app.get("/api/emails/scheduler-status", async (req: Request, res: Response) => {
    try {
      // Get landlords with auto-reminders enabled
      const landlords = await Landlord.find({
        'emailSettings.enabled': true,
        'emailSettings.autoRemindersEnabled': true
      }).select('fullName email emailSettings').lean();

      const landlordDetails = await Promise.all(landlords.map(async (landlord) => {
        const tenantCount = await Tenant.countDocuments({
          'apartmentInfo.landlordId': landlord._id
        });
        
        return {
          landlordId: landlord._id,
          landlordName: landlord.fullName,
          landlordEmail: landlord.email,
          reminderDaysBefore: landlord.emailSettings?.reminderDaysBefore || 3,
          tenantCount: tenantCount
        };
      }));

      res.json({
        success: true,
        schedulerActive: true,
        scheduleCron: '0 8 * * *',
        scheduleTime: 'Daily at 8:00 AM EAT',
        currentTime: new Date().toISOString(),
        landlordsWithAutoReminders: landlordDetails.length,
        details: landlordDetails
      });
    } catch (error: any) {
      console.error('❌ Error getting scheduler status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
