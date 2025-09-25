/**
 * Billing Service
 * Handles bill generation logic and calculations
 */

import { storage } from "../storage";
import { InsertMonthlyBill, BillLineItem, UtilityUsage } from "@shared/schema";

interface UtilityUsageInput {
  utilityType: string;
  unitsUsed: number;
}

export class BillingService {
  /**
   * Generate a bill for a specific tenant
   */
  static async generateBillForTenant(
    tenantId: string,
    month: number,
    year: number,
    utilityUsages: UtilityUsageInput[]
  ) {
    // Get tenant and property information
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.apartmentInfo?.propertyId) {
      throw new Error("Tenant has no property assignment");
    }

    const property = await storage.getProperty(tenant.apartmentInfo.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    const rentAmount = parseFloat(tenant.apartmentInfo.rentAmount || '0');
    if (rentAmount <= 0) {
      throw new Error("Invalid rent amount for tenant");
    }

    // Start building line items
    const lineItems: BillLineItem[] = [];

    // Add rent line item
    lineItems.push({
      description: "Monthly Rent",
      type: "rent",
      amount: rentAmount
    });

    // Process utility charges
    let totalUtilityCost = 0;
    
    if (property.utilities && utilityUsages.length > 0) {
      for (const usageInput of utilityUsages) {
        // Find matching utility in property utilities
        const propertyUtility = property.utilities.find(
          u => u.type.toLowerCase() === usageInput.utilityType.toLowerCase()
        );

        if (!propertyUtility) {
          console.warn(`Utility type ${usageInput.utilityType} not found in property utilities`);
          continue;
        }

        // Skip utilities marked as "Included" or "Not Included"
        const priceStr = propertyUtility.price.toLowerCase();
        if (priceStr === 'included' || priceStr === 'not included') {
          continue;
        }

        // Parse price per unit
        const pricePerUnit = parseFloat(propertyUtility.price);
        if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
          console.warn(`Invalid price for utility ${usageInput.utilityType}: ${propertyUtility.price}`);
          continue;
        }

        // Calculate utility cost
        const totalAmount = usageInput.unitsUsed * pricePerUnit;
        totalUtilityCost += totalAmount;

        // Create utility usage details
        const utilityUsage: UtilityUsage = {
          utilityType: usageInput.utilityType,
          unitsUsed: usageInput.unitsUsed,
          pricePerUnit: pricePerUnit,
          totalAmount: totalAmount
        };

        // Add utility line item
        lineItems.push({
          description: `${this.capitalizeFirst(usageInput.utilityType)} (${usageInput.unitsUsed} units @ KSH ${pricePerUnit}/unit)`,
          type: "utility",
          amount: totalAmount,
          utilityUsage: utilityUsage
        });
      }
    }

    // Calculate total amount
    const totalAmount = rentAmount + totalUtilityCost;

    // Set due date (e.g., end of current month)
    const dueDate = new Date(year, month, 0); // Last day of the month

    // Create utility usage data with proper structure
    const utilityUsageData: UtilityUsage[] = utilityUsages.map(usage => {
      const propertyUtility = property.utilities?.find(
        u => u.type.toLowerCase() === usage.utilityType.toLowerCase()
      );
      const pricePerUnit = propertyUtility ? parseFloat(propertyUtility.price) : 0;
      
      return {
        utilityType: usage.utilityType,
        unitsUsed: usage.unitsUsed,
        pricePerUnit: isNaN(pricePerUnit) ? 0 : pricePerUnit,
        totalAmount: usage.unitsUsed * (isNaN(pricePerUnit) ? 0 : pricePerUnit)
      };
    });

    // Create bill object
    const billData: InsertMonthlyBill = {
      tenantId,
      landlordId: property.landlordId,
      propertyId: tenant.apartmentInfo.propertyId,
      billMonth: month,
      billYear: year,
      rentAmount,
      lineItems,
      totalAmount,
      status: 'generated' as const,
      generatedDate: new Date(),
      dueDate
    };

    // Save to database
    const savedBill = await storage.createMonthlyBill(billData);
    return savedBill;
  }

  /**
   * Generate bills for all tenants of a landlord
   */
  static async generateBillsForLandlord(
    landlordId: string,
    month: number,
    year: number,
    tenantUtilityUsages: { [tenantId: string]: UtilityUsageInput[] }
  ) {
    const results = {
      successful: [] as any[],
      failed: [] as any[]
    };

    // Get tenants that need to be billed
    const tenantsToBill = await storage.getTenantsToBill(landlordId, month, year);

    for (const tenant of tenantsToBill) {
      try {
        const utilityUsages = tenantUtilityUsages[tenant.id] || [];
        
        const bill = await this.generateBillForTenant(
          tenant.id,
          month,
          year,
          utilityUsages
        );

        results.successful.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          billId: bill._id,
          totalAmount: bill.totalAmount
        });
      } catch (error) {
        results.failed.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Calculate bill preview without saving
   */
  static async calculateBillPreview(
    tenantId: string,
    month: number,
    year: number,
    utilityUsages: UtilityUsageInput[]
  ) {
    // Get tenant and property information
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.apartmentInfo?.propertyId) {
      throw new Error("Tenant has no property assignment");
    }

    const property = await storage.getProperty(tenant.apartmentInfo.propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    const rentAmount = parseFloat(tenant.apartmentInfo.rentAmount || '0');
    
    // Calculate utilities
    let totalUtilityCost = 0;
    const utilityBreakdown: any[] = [];

    if (property.utilities && utilityUsages.length > 0) {
      for (const usageInput of utilityUsages) {
        const propertyUtility = property.utilities.find(
          u => u.type.toLowerCase() === usageInput.utilityType.toLowerCase()
        );

        if (propertyUtility) {
          const priceStr = propertyUtility.price.toLowerCase();
          if (priceStr !== 'included' && priceStr !== 'not included') {
            const pricePerUnit = parseFloat(propertyUtility.price);
            if (!isNaN(pricePerUnit) && pricePerUnit > 0) {
              const totalAmount = usageInput.unitsUsed * pricePerUnit;
              totalUtilityCost += totalAmount;
              
              utilityBreakdown.push({
                utilityType: usageInput.utilityType,
                unitsUsed: usageInput.unitsUsed,
                pricePerUnit: pricePerUnit,
                totalAmount: totalAmount
              });
            }
          }
        }
      }
    }

    return {
      tenantName: tenant.fullName,
      propertyName: tenant.apartmentInfo.propertyName,
      rentAmount,
      utilityBreakdown,
      totalUtilityCost,
      totalAmount: rentAmount + totalUtilityCost
    };
  }

  /**
   * Helper function to capitalize first letter
   */
  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}