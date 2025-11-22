/**
 * Tenant Controller
 * Handles all tenant-related HTTP requests
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertTenantPropertySchema } from "@shared/schema";
import { ZodError } from "zod";
import { logActivity, createActivityLog } from "./activityController";
import { sendWelcomeEmail } from "../services/emailService";
import { format } from "date-fns";

export class TenantController {
  /**
   * Get all tenants for a specific landlord
   * GET /api/tenants/landlord/:landlordId
   */
  static async getTenantsByLandlord(req: Request, res: Response) {
    try {
      console.log(`🔍 Frontend requesting tenants for landlord ID: ${req.params.landlordId}`);
      const tenants = await storage.getTenantsByLandlord(req.params.landlordId);
      console.log(`📊 Found tenants: ${tenants.length}`);
      res.json(tenants);
    } catch (error) {
      console.error("Error getting tenants by landlord:", error);
      res.status(500).json({ error: "Failed to get tenants" });
    }
  }

  /**
   * Get all tenants for a landlord organized by property
   * GET /api/tenants/landlord/:landlordId/by-property
   */
  static async getTenantsByLandlordGroupedByProperty(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      console.log(`🔍 Frontend requesting tenants grouped by property for landlord ID: ${landlordId}`);
      
      const tenants = await storage.getTenantsByLandlord(landlordId);
      
      // Group tenants by property
      const groupedTenants = tenants.reduce((acc: any, tenant: any) => {
        const propertyId = tenant.propertyId || 'unassigned';
        const propertyName = tenant.propertyName || 'Unassigned';
        
        if (!acc[propertyId]) {
          acc[propertyId] = {
            propertyId,
            propertyName,
            tenants: []
          };
        }
        
        acc[propertyId].tenants.push(tenant);
        return acc;
      }, {});
      
      // Convert to array format
      const result = Object.values(groupedTenants);
      console.log(`📊 Found ${result.length} properties with tenants`);
      
      res.json(result);
    } catch (error) {
      console.error("Error getting tenants by landlord grouped by property:", error);
      res.status(500).json({ error: "Failed to get tenants grouped by property" });
    }
  }

  /**
   * Get all tenants for a specific property
   * GET /api/tenants/property/:propertyId
   */
  static async getTenantsByProperty(req: Request, res: Response) {
    try {
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      res.json(tenants);
    } catch (error) {
      console.error("Error getting tenants by property:", error);
      res.status(500).json({ error: "Failed to get tenants" });
    }
  }

  /**
   * Get a single tenant by ID
   * GET /api/tenants/:tenantId
   */
  static async getTenant(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId;
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
      res.status(500).json({ error: error.message || "Failed to fetch tenant" });
    }
  }

  /**
   * Update tenant information
   * PUT /api/tenants/:tenantId
   */
  static async updateTenant(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId;
      const updates = req.body;

      // Validate required fields
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      // Check if this is a new tenant completing onboarding (apartmentInfo being added)
      const existingTenant = await storage.getTenant(tenantId);
      const isCompletingOnboarding = !existingTenant?.apartmentInfo && updates.apartmentInfo;

      const updatedTenant = await storage.updateTenant(tenantId, updates);

      if (!updatedTenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Send welcome email if tenant just completed onboarding
      if (isCompletingOnboarding && updatedTenant.apartmentInfo?.landlordId) {
        const landlord = await storage.getLandlord(updatedTenant.apartmentInfo.landlordId);
        
        if (landlord?.emailSettings?.enabled) {
          try {
            await sendWelcomeEmail({
              tenantName: updatedTenant.fullName,
              tenantEmail: updatedTenant.email,
              landlordName: landlord.fullName,
              landlordEmail: landlord.email,
              landlordPhone: landlord.phone ?? undefined,
              propertyName: updatedTenant.apartmentInfo.propertyName || 'Property',
              unitNumber: updatedTenant.apartmentInfo.unitNumber || 'N/A',
              rentAmount: Number(updatedTenant.apartmentInfo.rentAmount) || 0,
              moveInDate: updatedTenant.apartmentInfo.moveInDate 
                ? format(new Date(updatedTenant.apartmentInfo.moveInDate), 'MMMM dd, yyyy')
                : format(new Date(), 'MMMM dd, yyyy'),
              customMessage: landlord.emailSettings?.templates?.welcome?.customMessage,
              landlordId: landlord.id,
              tenantId: updatedTenant.id
            });
            console.log(`✅ Welcome email sent to ${updatedTenant.email}`);
          } catch (emailError) {
            console.error('⚠️ Failed to send welcome email:', emailError);
            // Don't fail the request if email fails
          }
        }
      }

      res.json({
        success: true,
        tenant: updatedTenant,
        message: "Tenant updated successfully"
      });

    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  }

  /**
   * Delete tenant
   * DELETE /api/tenants/:tenantId
   */
  static async deleteTenant(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      // Get tenant info before deletion for activity log
      const tenant = await storage.getTenant(tenantId);
      
      const success = await storage.deleteTenant(tenantId);

      if (!success) {
        return res.status(404).json({ error: "Tenant not found or could not be deleted" });
      }

      // Log tenant removal activity
      if (tenant && tenant.apartmentInfo?.landlordId) {
        await logActivity(createActivityLog(
          tenant.apartmentInfo.landlordId,
          'tenant_removed',
          'Tenant Removed',
          `${tenant.fullName} has been removed from ${tenant.apartmentInfo.propertyName || 'the property'}`,
          {
            tenantName: tenant.fullName,
            propertyId: tenant.apartmentInfo.propertyId,
            propertyName: tenant.apartmentInfo.propertyName,
            unitNumber: tenant.apartmentInfo.unitNumber,
          },
          'medium'
        ));
      }

      res.json({
        success: true,
        message: "Tenant deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  }

  /**
   * Change tenant password
   * PUT /api/tenants/:tenantId/password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      const success = await storage.changeTenantPassword(tenantId, currentPassword, newPassword);

      if (!success) {
        return res.status(400).json({ error: "Invalid current password or tenant not found" });
      }

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error("Error changing tenant password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }

  /**
   * Create tenant property relationship
   * POST /api/tenant-properties
   */
  static async createTenantProperty(req: Request, res: Response) {
    try {
      const validatedData = insertTenantPropertySchema.parse(req.body);
      const tenantProperty = await storage.createTenantProperty(validatedData);
      res.json(tenantProperty);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid tenant property data", details: error.errors });
      }
      console.error("Error creating tenant property:", error);
      res.status(500).json({ error: "Failed to create tenant property" });
    }
  }

  /**
   * Get tenant property information
   * GET /api/tenant-properties/tenant/:tenantId
   */
  static async getTenantProperty(req: Request, res: Response) {
    try {
      const tenantProperty = await storage.getTenantProperty(req.params.tenantId);
      if (!tenantProperty) {
        return res.status(404).json({ error: "Tenant property not found" });
      }

      res.json(tenantProperty);
    } catch (error) {
      console.error("Error getting tenant property:", error);
      res.status(500).json({ error: "Failed to get tenant property" });
    }
  }

  /**
   * Record tenant payment
   * POST /api/tenants/:tenantId/payment
   */
  static async recordPayment(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { paymentAmount, forMonth, forYear, paymentDate, utilityCharges, totalUtilityCost } = req.body;

      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({ error: "Valid payment amount is required" });
      }

      if (!forMonth || forMonth < 1 || forMonth > 12) {
        return res.status(400).json({ error: "Valid month (1-12) is required" });
      }

      if (!forYear || forYear < 2020) {
        return res.status(400).json({ error: "Valid year is required" });
      }

      const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();
      const success = await storage.recordTenantPayment(
        tenantId, 
        paymentAmount, 
        forMonth, 
        forYear, 
        paymentDateObj,
        utilityCharges,
        totalUtilityCost
      );

      if (!success) {
        return res.status(404).json({ error: "Tenant not found or payment could not be recorded" });
      }

      res.json({
        success: true,
        message: `Payment recorded successfully for ${forMonth}/${forYear}`,
        paymentAmount,
        forMonth,
        forYear,
        paymentDate: paymentDateObj,
        utilityCharges,
        totalUtilityCost
      });

    } catch (error) {
      console.error("Error recording tenant payment:", error);
      res.status(500).json({ error: "Failed to record payment" });
    }
  }

  /**
   * Tenant makes a payment on their bill
   * POST /api/tenants/:tenantId/make-payment
   */
  static async makePayment(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { paymentId, amount, paymentMethod } = req.body;

      if (!paymentId) {
        return res.status(400).json({ error: "Payment ID is required" });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid payment amount is required" });
      }

      if (!paymentMethod) {
        return res.status(400).json({ error: "Payment method is required" });
      }

      const success = await storage.processTenantPayment(
        paymentId,
        amount,
        paymentMethod,
        tenantId
      );

      if (!success) {
        return res.status(404).json({ error: "Payment not found or could not be processed" });
      }

      res.json({
        success: true,
        message: "Payment processed successfully",
        amount,
        paymentMethod
      });

    } catch (error: any) {
      console.error("Error processing tenant payment:", error);
      res.status(500).json({ error: error.message || "Failed to process payment" });
    }
  }
}
