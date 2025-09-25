/**
 * Billing Controller
 * Handles monthly billing operations for tenants
 */

import type { Request, Response } from "express";
import { storage } from "../storage";
import { BillingService } from "../services/billingService";

export class BillingController {
  /**
   * Get tenants that need to be billed for a specific month/year
   * GET /api/billing/landlord/:landlordId/to-bill?month=10&year=2025
   */
  static async getTenantsToBill(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ error: "Valid month (1-12) and year are required" });
      }

      const tenants = await storage.getTenantsToBill(landlordId, month, year);

      // For each tenant, get their property's billable utilities
      const tenantsWithUtilities = await Promise.all(
        tenants.map(async (tenant) => {
          try {
            const property = await storage.getProperty(tenant.propertyId);
            const allUtilities = property?.utilities || [];
            const billableUtilities = allUtilities.filter(utility => {
              const price = utility.price.toLowerCase();
              return price !== 'included' && price !== 'not included' && !isNaN(parseFloat(utility.price));
            });

            return {
              ...tenant,
              availableUtilities: billableUtilities,
              allUtilities: allUtilities
            };
          } catch (error) {
            console.error(`Error getting utilities for tenant ${tenant.id}:`, error);
            return {
              ...tenant,
              availableUtilities: []
            };
          }
        })
      );

      res.json({
        success: true,
        tenantsToBill: tenantsWithUtilities,
        month,
        year,
        totalTenants: tenantsWithUtilities.length
      });
    } catch (error) {
      console.error("Error getting tenants to bill:", error);
      res.status(500).json({ error: "Failed to get tenants to bill" });
    }
  }

  /**
   * Generate bill for a specific tenant with utility usage
   * POST /api/billing/generate
   * Body: { tenantId, month, year, utilityUsages: [{ utilityType, unitsUsed }] }
   */
  static async generateBill(req: Request, res: Response) {
    try {
      const { tenantId, month, year, utilityUsages } = req.body;

      if (!tenantId || !month || !year) {
        return res.status(400).json({ error: "Tenant ID, month, and year are required" });
      }

      // Check if bill already exists for this tenant/month/year
      const existingBill = await storage.getMonthlyBill(tenantId, month, year);
      if (existingBill) {
        return res.status(400).json({ error: "Bill already exists for this tenant and period" });
      }

      const bill = await BillingService.generateBillForTenant(tenantId, month, year, utilityUsages || []);

      res.json({
        success: true,
        bill,
        message: "Bill generated successfully"
      });
    } catch (error) {
      console.error("Error generating bill:", error);
      res.status(500).json({ error: (error as Error).message || "Failed to generate bill" });
    }
  }

  /**
   * Generate bills for all tenants of a landlord
   * POST /api/billing/landlord/:landlordId/generate-all
   * Body: { month, year, tenantUtilityUsages: { [tenantId]: [{ utilityType, unitsUsed }] } }
   */
  static async generateAllBills(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const { month, year, tenantUtilityUsages } = req.body;

      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }

      const results = await BillingService.generateBillsForLandlord(
        landlordId, 
        month, 
        year, 
        tenantUtilityUsages || {}
      );

      res.json({
        success: true,
        results,
        message: `Generated ${results.successful.length} bills successfully`
      });
    } catch (error) {
      console.error("Error generating all bills:", error);
      res.status(500).json({ error: "Failed to generate bills" });
    }
  }

  /**
   * Get bills for a landlord
   * GET /api/billing/landlord/:landlordId?month=10&year=2025
   */
  static async getLandlordBills(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const bills = await storage.getMonthlyBillsByLandlord(landlordId, month, year);

      res.json({
        success: true,
        bills,
        totalBills: bills.length
      });
    } catch (error) {
      console.error("Error getting landlord bills:", error);
      res.status(500).json({ error: "Failed to get bills" });
    }
  }

  /**
   * Get bills for a tenant
   * GET /api/billing/tenant/:tenantId
   */
  static async getTenantBills(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const bills = await storage.getMonthlyBillsByTenant(tenantId);

      res.json({
        success: true,
        bills,
        totalBills: bills.length
      });
    } catch (error) {
      console.error("Error getting tenant bills:", error);
      res.status(500).json({ error: "Failed to get bills" });
    }
  }

  /**
   * Update bill status (e.g., mark as paid)
   * PUT /api/billing/:billId/status
   * Body: { status: 'paid' | 'sent' | 'overdue' }
   */
  static async updateBillStatus(req: Request, res: Response) {
    try {
      const { billId } = req.params;
      const { status } = req.body;

      if (!status || !['generated', 'sent', 'paid', 'overdue'].includes(status)) {
        return res.status(400).json({ error: "Valid status is required" });
      }

      const success = await storage.updateMonthlyBillStatus(billId, status);

      if (!success) {
        return res.status(404).json({ error: "Bill not found or could not be updated" });
      }

      res.json({
        success: true,
        message: "Bill status updated successfully"
      });
    } catch (error) {
      console.error("Error updating bill status:", error);
      res.status(500).json({ error: "Failed to update bill status" });
    }
  }

  /**
   * Calculate bill preview without saving
   * POST /api/billing/calculate-preview
   * Body: { tenantId, month, year, utilityUsages: [{ utilityType, unitsUsed }] }
   */
  static async calculateBillPreview(req: Request, res: Response) {
    try {
      const { tenantId, month, year, utilityUsages } = req.body;

      if (!tenantId || !month || !year) {
        return res.status(400).json({ error: "Tenant ID, month, and year are required" });
      }

      const preview = await BillingService.calculateBillPreview(tenantId, month, year, utilityUsages || []);

      res.json(preview);
    } catch (error) {
      console.error("Error calculating bill preview:", error);
      res.status(500).json({ error: (error as Error).message || "Failed to calculate bill preview" });
    }
  }
}