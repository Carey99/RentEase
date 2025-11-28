/**
 * Landlord Routes
 * GET /api/landlords/:landlordId/settings
 * PUT /api/landlords/:landlordId/settings, /api/landlords/:landlordId/password
 */

import type { Express } from "express";
import { LandlordController } from "../controllers/landlordController";

export function registerLandlordRoutes(app: Express): void {
  // Landlord routes
  app.get("/api/landlords/:landlordId/settings", LandlordController.getSettings);
  app.put("/api/landlords/:landlordId/settings", LandlordController.updateSettings);
  app.put("/api/landlords/:landlordId/password", LandlordController.changePassword);
}
