/**
 * Landlord Routes
 * GET /api/landlords/:landlordId - Get complete landlord details
 * GET /api/landlords/:landlordId/settings
 * PUT /api/landlords/:landlordId/settings, /api/landlords/:landlordId/password
 * GET /api/landlords/:landlordId/payment-details - Get manual payment details
 * PUT /api/landlords/:landlordId/payment-details - Update manual payment details
 * GET /api/landlords/:landlordId/payment-details/public - Get public payment details for tenants
 */

import type { Express } from "express";
import { LandlordController } from "../controllers/landlordController";
import { PaymentDetailsController } from "../controllers/paymentDetailsController";

export function registerLandlordRoutes(app: Express): void {
  // Landlord routes
  app.get("/api/landlords/:landlordId", LandlordController.getDetails);
  app.get("/api/landlords/:landlordId/settings", LandlordController.getSettings);
  app.put("/api/landlords/:landlordId/settings", LandlordController.updateSettings);
  app.put("/api/landlords/:landlordId/password", LandlordController.changePassword);
  
  // Manual payment details routes
  app.get("/api/landlords/:landlordId/payment-details", PaymentDetailsController.getPaymentDetails);
  app.put("/api/landlords/:landlordId/payment-details", PaymentDetailsController.updatePaymentDetails);
  app.get("/api/landlords/:landlordId/payment-details/public", PaymentDetailsController.getPublicPaymentDetails);
}
