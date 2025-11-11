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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", AuthController.register);
  app.post("/api/auth/login", AuthController.login);
  app.post("/api/auth/signin", AuthController.signin);
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
  app.post("/api/tenants/:tenantId/payment", TenantController.recordPayment); // Landlord creates bill
  app.post("/api/tenants/:tenantId/make-payment", TenantController.makePayment); // Tenant pays bill

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

  // Daraja payment routes (STK Push)
  app.post("/api/payments/initiate", PaymentController.initiatePayment);
  app.get("/api/payments/:paymentIntentId/status", PaymentController.getPaymentStatus);

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

  const httpServer = createServer(app);
  return httpServer;
}
