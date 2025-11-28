/**
 * Activity Log Routes
 * GET /api/activities/landlord/:landlordId, /api/activities/landlord/:landlordId/unread-count
 * PUT /api/activities/:activityId/read, /api/activities/landlord/:landlordId/read-all
 * GET /api/tenant-activities/tenant/:tenantId, /api/tenant-activities/tenant/:tenantId/unread-count
 * PUT /api/tenant-activities/:activityId/read, /api/tenant-activities/tenant/:tenantId/read-all
 */

import type { Express } from "express";
import { 
  getRecentActivities, 
  markActivityAsRead, 
  markAllActivitiesAsRead,
  getUnreadCount 
} from "../controllers/activityController";
import {
  getRecentTenantActivities,
  markTenantActivityAsRead,
  markAllTenantActivitiesAsRead,
  getTenantUnreadCount
} from "../controllers/tenantActivityController";

export function registerActivityRoutes(app: Express): void {
  // Landlord activity log routes
  app.get("/api/activities/landlord/:landlordId", getRecentActivities);
  app.get("/api/activities/landlord/:landlordId/unread-count", getUnreadCount);
  app.put("/api/activities/:activityId/read", markActivityAsRead);
  app.put("/api/activities/landlord/:landlordId/read-all", markAllActivitiesAsRead);

  // Tenant activity log routes
  app.get("/api/tenant-activities/tenant/:tenantId", getRecentTenantActivities);
  app.get("/api/tenant-activities/tenant/:tenantId/unread-count", getTenantUnreadCount);
  app.put("/api/tenant-activities/:activityId/read", markTenantActivityAsRead);
  app.put("/api/tenant-activities/tenant/:tenantId/read-all", markAllTenantActivitiesAsRead);
}
