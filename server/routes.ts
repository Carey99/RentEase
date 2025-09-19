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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", AuthController.register);
  app.post("/api/auth/login", AuthController.login);
  app.post("/api/auth/signin", AuthController.signin);
  app.get("/api/users/:id", AuthController.getUserById);
  app.get("/api/auth/current/:id", AuthController.getUserById);

  // Property routes
  app.post("/api/properties", PropertyController.createProperty);
  app.get("/api/properties/landlord/:landlordId", PropertyController.getPropertiesByLandlord);
  app.put("/api/properties/:propertyId", PropertyController.updateProperty);
  app.get("/api/properties/search", PropertyController.searchProperties);
  app.get("/api/properties/:propertyId/types", PropertyController.getPropertyTypes);
  app.get("/api/properties/:propertyId/tenants", PropertyController.getTenantsByProperty);
  app.put("/api/properties/:propertyId/rent-settings", PropertyController.updateRentSettings);

  // Tenant routes
  app.get("/api/tenants/landlord/:landlordId", TenantController.getTenantsByLandlord);
  app.get("/api/tenants/property/:propertyId", TenantController.getTenantsByProperty);
  app.get("/api/tenants/:tenantId", TenantController.getTenant);
  app.put("/api/tenants/:tenantId", TenantController.updateTenant);
  app.delete("/api/tenants/:tenantId", TenantController.deleteTenant);
  app.post("/api/tenants/:tenantId/payment", TenantController.recordPayment);

  // Tenant property relationships
  app.post("/api/tenant-properties", TenantController.createTenantProperty);
  app.get("/api/tenant-properties/tenant/:tenantId", TenantController.getTenantProperty);

  // Landlord routes
  app.get("/api/landlords/:landlordId/settings", LandlordController.getSettings);
  app.put("/api/landlords/:landlordId/settings", LandlordController.updateSettings);
  app.put("/api/landlords/:landlordId/password", LandlordController.changePassword);

  const httpServer = createServer(app);
  return httpServer;
}
