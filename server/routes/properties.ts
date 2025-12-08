/**
 * Property Routes
 * POST /api/properties, GET /api/properties/:id, PUT /api/properties/:propertyId
 * GET /api/properties/search, /api/properties/landlord/:landlordId, /api/properties/:propertyId/types
 * GET /api/properties/:propertyId/tenants, /api/properties/:propertyId/utilities
 * PUT /api/properties/:propertyId/rent-settings
 */

import type { Express } from "express";
import { PropertyController } from "../controllers/propertyController";

export function registerPropertyRoutes(app: Express): void {
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
}
