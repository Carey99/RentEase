/**
 * Landlord Controller
 * Handles landlord-specific HTTP requests
 */

import type { Request, Response } from "express";
import { storage } from "../storage";

export class LandlordController {
  /**
   * Get landlord settings
   * GET /api/landlords/:landlordId/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await storage.getLandlordSettings(req.params.landlordId);
      if (!settings) {
        return res.status(404).json({ error: "Landlord settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error getting landlord settings:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  }

  /**
   * Update landlord settings
   * PUT /api/landlords/:landlordId/settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const updates = req.body;

      const updatedSettings = await storage.updateLandlordSettings(landlordId, updates);

      if (!updatedSettings) {
        return res.status(404).json({ error: "Landlord not found or settings could not be updated" });
      }

      res.json({
        success: true,
        settings: updatedSettings,
        message: "Settings updated successfully"
      });

    } catch (error) {
      console.error("Error updating landlord settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  }

  /**
   * Change landlord password
   * PUT /api/landlords/:landlordId/password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      const success = await storage.changeLandlordPassword(landlordId, currentPassword, newPassword);

      if (!success) {
        return res.status(400).json({ error: "Invalid current password or landlord not found" });
      }

      res.json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error("Error changing landlord password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }

  /**
   * Get tenants with outstanding debts (comprehensive debt tracking)
   * GET /api/landlords/:landlordId/debts
   * 
   * Captures ALL types of debt scenarios:
   * 1. Partial payments - tenants who paid something but not the full amount
   * 2. Overdue tenants - past due and beyond grace period (includes tenants who paid nothing)
   * 3. Grace period tenants - past due but within grace period (technically late)
   * 4. Accumulated debt - any tenant with explicit debt amount > 0
   * 5. Behind on payments - any tenant with months owed > 0
   * 6. Past due date - any tenant with negative days remaining
   */
  static async getTenantsWithDebts(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      
      // Get all tenants for this landlord
      const allTenants = await storage.getTenantsByLandlord(landlordId);
      
      // Filter tenants who have debts (partial payments, overdue, grace period, or any debt)
      const tenantsWithDebts = allTenants.filter(tenant => {
        if (!tenant.rentCycle) return false;
        
        const rentStatus = tenant.rentCycle.rentStatus;
        const debtAmount = tenant.rentCycle.debtAmount || 0;
        const monthsOwed = tenant.rentCycle.monthsOwed || 0;
        const daysRemaining = tenant.rentCycle.daysRemaining || 0;
        
        // Include tenants in these scenarios:
        // 1. Partial payment status (paid something but not full amount)
        // 2. Overdue status (past due and beyond grace period)
        // 3. Grace period status (past due but within grace period)
        // 4. Any tenant with debt amount > 0 (accumulated debt)
        // 5. Any tenant with months owed > 0 (behind on payments)
        // 6. Any tenant with negative days remaining (past due date)
        return (
          rentStatus === 'partial' ||
          rentStatus === 'overdue' ||
          rentStatus === 'grace_period' ||
          debtAmount > 0 ||
          monthsOwed > 0 ||
          daysRemaining < 0
        );
      });

      // Format the response with relevant debt information
      const debtsData = tenantsWithDebts.map(tenant => {
        const rentCycle = tenant.rentCycle;
        const rentStatus = rentCycle.rentStatus;
        const rentAmount = tenant.rentAmount || 0;
        const debtAmount = rentCycle.debtAmount || 0;
        const monthsOwed = rentCycle.monthsOwed || 0;
        const daysRemaining = rentCycle.daysRemaining || 0;
        
        // Calculate debt for overdue/grace period tenants who haven't made partial payments
        let calculatedDebtAmount = debtAmount;
        let calculatedMonthsOwed = monthsOwed;
        
        // If no explicit debt amount but tenant is overdue/grace_period, calculate based on rent amount
        if (calculatedDebtAmount === 0 && (rentStatus === 'overdue' || rentStatus === 'grace_period')) {
          if (daysRemaining < 0) {
            // Calculate how many months they're behind based on days overdue
            const daysOverdue = Math.abs(daysRemaining);
            calculatedMonthsOwed = Math.max(1, Math.floor(daysOverdue / 30)); // At least 1 month
            calculatedDebtAmount = calculatedMonthsOwed * rentAmount;
          } else {
            // At least current month's rent is owed
            calculatedMonthsOwed = 1;
            calculatedDebtAmount = rentAmount;
          }
        }
        
        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          propertyName: tenant.propertyName,
          unitNumber: tenant.unitNumber,
          rentAmount: rentAmount,
          rentStatus: rentStatus,
          debtAmount: calculatedDebtAmount,
          monthsOwed: calculatedMonthsOwed,
          daysOverdue: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
          nextDueDate: rentCycle.nextDueDate,
          lastPaymentDate: rentCycle.lastPaymentDate
        };
      });

      res.json({
        success: true,
        debts: debtsData,
        totalDebtAmount: debtsData.reduce((sum, tenant) => sum + tenant.debtAmount, 0),
        totalTenantsWithDebts: debtsData.length
      });

    } catch (error) {
      console.error("Error getting tenants with debts:", error);
      res.status(500).json({ error: "Failed to get debt information" });
    }
  }
}
