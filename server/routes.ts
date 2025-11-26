/**
 * Route Registration
 * Organized route setup using controllers
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { AuthController } from "./controllers/authController";
import { PropertyController } from "./controllers/propertyController";
import { TenantController } from "./controllers/tenantController";
import { LandlordController } from "./controllers/landlordController";
import { PaymentController } from "./controllers/paymentController";
import { DarajaConfigController } from "./controllers/darajaConfigController";
import { handleSTKCallback, handleSTKTimeout } from "./controllers/darajaCallbackController";
import { ReceiptController } from "./controllers/receiptController";
import { CashPaymentController } from "./controllers/cashPaymentController";
import { authLimiter, paymentLimiter, uploadLimiter } from "./middleware/security";
import { 
  getRecentActivities, 
  markActivityAsRead, 
  markAllActivitiesAsRead,
  getUnreadCount 
} from "./controllers/activityController";
import {
  getRecentTenantActivities,
  markTenantActivityAsRead,
  markAllTenantActivitiesAsRead,
  getTenantUnreadCount
} from "./controllers/tenantActivityController";
import {
  uploadMpesaStatement,
  getStatementDetails,
  getLandlordStatements,
  approveMatch,
  rejectMatch,
  deleteStatement,
  uploadMiddleware
} from "./controllers/mpesaStatementController";
import {
  sendManualReminder,
  sendBulkReminders,
  getEmailSettings,
  updateEmailSettings,
  getEmailHistory,
  sendTestEmailController
} from "./controllers/emailController";
import { triggerManualReminderCheck } from "./schedulers/emailReminderScheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (with strict rate limiting)
  app.post("/api/auth/register", authLimiter, AuthController.register);
  app.post("/api/auth/login", authLimiter, AuthController.login);
  app.post("/api/auth/signin", authLimiter, AuthController.signin);
  app.post("/api/auth/logout", AuthController.logout);
  app.get("/api/auth/session", AuthController.getSession);
  app.get("/api/users/:id", AuthController.getUserById);
  app.get("/api/auth/current/:id", AuthController.getUserById);

  // Property routes
  app.post("/api/properties", PropertyController.createProperty);
  app.get("/api/properties/search", PropertyController.searchProperties); // Must be before :id route
  app.get("/api/properties/landlord/:landlordId", PropertyController.getPropertiesByLandlord);
  app.get("/api/properties/:id", PropertyController.getProperty); // Get single property
  app.put("/api/properties/:propertyId", PropertyController.updateProperty);
  app.get("/api/properties/:propertyId/types", PropertyController.getPropertyTypes);
  app.get("/api/properties/:propertyId/tenants", PropertyController.getTenantsByProperty);
  app.get("/api/properties/:propertyId/utilities", PropertyController.getPropertyUtilities);
  app.put("/api/properties/:propertyId/rent-settings", PropertyController.updateRentSettings);

  // Tenant routes
  app.get("/api/tenants/landlord/:landlordId", TenantController.getTenantsByLandlord);
  app.get("/api/tenants/landlord/:landlordId/by-property", TenantController.getTenantsByLandlordGroupedByProperty);
  app.get("/api/tenants/property/:propertyId", TenantController.getTenantsByProperty);
  app.get("/api/tenants/:tenantId", TenantController.getTenant);
  app.put("/api/tenants/:tenantId", TenantController.updateTenant);
  app.delete("/api/tenants/:tenantId", TenantController.deleteTenant);
  app.put("/api/tenants/:tenantId/password", TenantController.changePassword);
  app.post("/api/tenants/:tenantId/payment", paymentLimiter, TenantController.recordPayment); // Landlord creates bill
  app.post("/api/tenants/:tenantId/make-payment", paymentLimiter, TenantController.makePayment); // Tenant pays bill

  // Tenant property relationships
  app.post("/api/tenant-properties", TenantController.createTenantProperty);
  app.get("/api/tenant-properties/tenant/:tenantId", TenantController.getTenantProperty);

  // Landlord routes
  app.get("/api/landlords/:landlordId/settings", LandlordController.getSettings);
  app.put("/api/landlords/:landlordId/settings", LandlordController.updateSettings);
  app.put("/api/landlords/:landlordId/password", LandlordController.changePassword);

  // Daraja M-Pesa configuration routes
  app.post("/api/landlords/:landlordId/daraja/configure", DarajaConfigController.configure);
  app.get("/api/landlords/:landlordId/daraja/status", DarajaConfigController.getStatus);
  app.post("/api/landlords/:landlordId/daraja/test", DarajaConfigController.testConfiguration);
  app.delete("/api/landlords/:landlordId/daraja/configure", DarajaConfigController.removeConfiguration);

  // Payment history routes
  app.get("/api/payment-history/tenant/:tenantId", PaymentController.getTenantPaymentHistory);
  app.get("/api/payment-history/landlord/:landlordId", PaymentController.getLandlordPaymentHistory);
  app.get("/api/payment-history/landlord/:landlordId/by-property", PaymentController.getLandlordPaymentHistoryByProperty);
  app.get("/api/payment-history/property/:propertyId", PaymentController.getPropertyPaymentHistory);
  app.get("/api/payment-history/tenant/:tenantId/recorded-months/:year", PaymentController.getRecordedMonths);
  app.delete("/api/payment-history/:paymentId", PaymentController.deletePaymentHistory);

  // Cash payment routes (with payment rate limiting)
  app.post("/api/payments/cash", paymentLimiter, CashPaymentController.recordCashPayment);

  // Daraja payment routes (STK Push with payment rate limiting)
  app.post("/api/payments/initiate", paymentLimiter, PaymentController.initiatePayment);
  app.get("/api/payments/:paymentIntentId/status", PaymentController.getPaymentStatus);
  
  // Receipt download route
  app.get("/api/payments/:paymentId/receipt", ReceiptController.downloadReceipt);

  // Daraja callback routes (webhooks from M-Pesa)
  app.post("/api/daraja/callback", handleSTKCallback);
  app.post("/api/daraja/timeout", handleSTKTimeout);

  // Activity log routes
  app.get("/api/activities/landlord/:landlordId", getRecentActivities);
  app.get("/api/activities/landlord/:landlordId/unread-count", getUnreadCount);
  app.put("/api/activities/:activityId/read", markActivityAsRead);
  app.put("/api/activities/landlord/:landlordId/read-all", markAllActivitiesAsRead);

  // Tenant activity log routes
  app.get("/api/tenant-activities/tenant/:tenantId", getRecentTenantActivities);
  app.get("/api/tenant-activities/tenant/:tenantId/unread-count", getTenantUnreadCount);
  app.put("/api/tenant-activities/:activityId/read", markTenantActivityAsRead);
  app.put("/api/tenant-activities/tenant/:tenantId/read-all", markAllTenantActivitiesAsRead);

  // M-Pesa statement upload routes (with upload rate limiting)
  app.post("/api/mpesa/upload-statement", uploadLimiter, uploadMiddleware, uploadMpesaStatement);
  app.get("/api/mpesa/statements", getLandlordStatements);
  app.get("/api/mpesa/statements/:statementId", getStatementDetails);
  app.delete("/api/mpesa/statements/:statementId", deleteStatement);
  app.post("/api/mpesa/matches/:matchId/approve", approveMatch);
  app.post("/api/mpesa/matches/:matchId/reject", rejectMatch);

  // Email notification routes
  app.post("/api/emails/send-reminder/:tenantId", sendManualReminder);
  app.post("/api/emails/send-bulk-reminders", sendBulkReminders);
  app.get("/api/emails/settings/:landlordId", getEmailSettings);
  app.put("/api/emails/settings/:landlordId", updateEmailSettings);
  app.get("/api/emails/history/:landlordId", getEmailHistory);
  app.post("/api/emails/test/:landlordId", sendTestEmailController);
  
  // Test endpoint for manual scheduler trigger (development/testing)
  app.post("/api/emails/trigger-scheduler", async (req, res) => {
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
  app.get("/api/emails/scheduler-status", async (req, res) => {
    try {
      const { Landlord, Tenant } = await import("./database");
      
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

  const httpServer = createServer(app);
  return httpServer;
}
