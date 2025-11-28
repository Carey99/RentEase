/**
 * Tenant Routes
 * GET /api/tenants/:tenantId, PUT /api/tenants/:tenantId, DELETE /api/tenants/:tenantId
 * GET /api/tenants/landlord/:landlordId, /api/tenants/property/:propertyId
 * PUT /api/tenants/:tenantId/password
 * POST /api/tenants/:tenantId/payment, /api/tenants/:tenantId/make-payment
 * Tenant property relationships: POST /api/tenant-properties, GET /api/tenant-properties/tenant/:tenantId
 */

import type { Express } from "express";
import { TenantController } from "../controllers/tenantController";
import { paymentLimiter } from "../middleware/security";

export function registerTenantRoutes(app: Express): void {
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
}
