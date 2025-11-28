/**
 * Daraja M-Pesa Configuration Routes
 * POST /api/landlords/:landlordId/daraja/configure, /api/landlords/:landlordId/daraja/test
 * GET /api/landlords/:landlordId/daraja/status
 * DELETE /api/landlords/:landlordId/daraja/configure
 * Daraja callback webhooks: POST /api/daraja/callback, /api/daraja/timeout
 */

import type { Express } from "express";
import { DarajaConfigController } from "../controllers/darajaConfigController";
import { handleSTKCallback, handleSTKTimeout } from "../controllers/darajaCallbackController";

export function registerDarajaRoutes(app: Express): void {
  // Daraja M-Pesa configuration routes
  app.post("/api/landlords/:landlordId/daraja/configure", DarajaConfigController.configure);
  app.get("/api/landlords/:landlordId/daraja/status", DarajaConfigController.getStatus);
  app.post("/api/landlords/:landlordId/daraja/test", DarajaConfigController.testConfiguration);
  app.delete("/api/landlords/:landlordId/daraja/configure", DarajaConfigController.removeConfiguration);

  // Daraja callback routes (webhooks from M-Pesa)
  app.post("/api/daraja/callback", handleSTKCallback);
  app.post("/api/daraja/timeout", handleSTKTimeout);
}
