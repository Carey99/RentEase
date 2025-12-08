/**
 * Route Registration - Main Entry Point
 * Imports and registers all modular routes
 * 
 * Route modules are organized by domain:
 * - auth.ts: Authentication endpoints
 * - properties.ts: Property management endpoints
 * - tenants.ts: Tenant management endpoints
 * - landlords.ts: Landlord settings endpoints
 * - payments.ts: Payment and payment history endpoints
 * - activities.ts: Activity log endpoints
 * - emails.ts: Email notification endpoints
 * - daraja.ts: Daraja M-Pesa configuration endpoints
 * - mpesa.ts: M-Pesa statement upload endpoints
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  registerAuthRoutes,
  registerPropertyRoutes,
  registerTenantRoutes,
  registerLandlordRoutes,
  registerPaymentRoutes,
  registerActivityRoutes,
  registerEmailRoutes,
  registerDarajaRoutes,
  registerMpesaRoutes
} from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  registerAuthRoutes(app);
  registerPropertyRoutes(app);
  registerTenantRoutes(app);
  registerLandlordRoutes(app);
  registerPaymentRoutes(app);
  registerActivityRoutes(app);
  registerEmailRoutes(app);
  registerDarajaRoutes(app);
  registerMpesaRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
