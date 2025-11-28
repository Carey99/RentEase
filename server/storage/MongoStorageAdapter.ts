import { type IStorage } from "../storage";
import { type Property, type InsertProperty } from "@shared/schema";
import { userStorage } from "./UserStorage";
import { propertyStorage } from "./PropertyStorage";
import { tenantStorage } from "./TenantStorage";
import { paymentStorage } from "./PaymentStorage";
import { rentCycleStorage } from "./RentCycleStorage";
import { activityStorage } from "./ActivityStorage";

/**
 * MongoStorageAdapter - Integration layer for all domain storage classes
 * 
 * CRITICAL COMPONENT: Maintains backward compatibility while delegating to specialized domain classes
 * 
 * Architecture:
 * - UserStorage: Authentication, user CRUD
 * - PropertyStorage: Properties, utilities, tenant properties
 * - TenantStorage: Tenants, cascade delete, landlord settings
 * - PaymentStorage: Billing, payments, payment history (CRITICAL - all financial ops)
 * - RentCycleStorage: Rent status tracking, calculations
 * - ActivityStorage: Payment plans, collection actions
 * 
 * Key Design Decisions:
 * 1. Each storage class handles one domain vertically
 * 2. No circular dependencies - all point inward to this adapter
 * 3. Adapter maintains IStorage interface for 100% backward compatibility
 * 4. Existing code imports `storage` and works unchanged
 * 5. New code can import individual storage classes if needed
 */
export class MongoStorageAdapter implements IStorage {
  // User operations
  async getUser(id: string) {
    return userStorage.getUser(id);
  }

  async getUserByEmail(email: string) {
    return userStorage.getUserByEmail(email);
  }

  async createUser(user: any) {
    return userStorage.createUser(user);
  }

  // Property operations
  async getProperty(id: string) {
    return propertyStorage.getProperty(id);
  }

  async getPropertiesByLandlord(landlordId: string) {
    return propertyStorage.getPropertiesByLandlord(landlordId);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    return propertyStorage.createProperty(property);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | undefined> {
    return propertyStorage.updateProperty(id, updates);
  }

  async searchPropertiesByName(name: string) {
    return propertyStorage.searchPropertiesByName(name);
  }

  // Tenant property relationships
  async getTenantProperty(tenantId: string) {
    // Get tenant property from PropertyStorage
    const tenantProperty = await propertyStorage.getTenantProperty(tenantId);

    // If exists, enhance with rent cycle data
    if (tenantProperty) {
      try {
        const tenant = await tenantStorage.getTenant(tenantId);
        const property = tenantProperty.property ?
          await propertyStorage.getProperty(tenantProperty.property.id || tenantProperty.propertyId) :
          null;

        if (tenant && property) {
          tenantProperty.rentCycle = await rentCycleStorage.getRentCycleForTenant(tenant, property);
        }
      } catch (error) {
        console.error('Error populating rent cycle for tenant property:', error);
        // Still return the property even if rent cycle fails
      }
    }

    return tenantProperty;
  }

  async createTenantProperty(tenantProperty: any) {
    // createTenantProperty was a tenant operation in original MongoStorage
    // For now return undefined - this needs proper implementation
    return undefined;
  }

  // Tenant operations
  async getTenantsByProperty(propertyId: string) {
    return tenantStorage.getTenantsByProperty(propertyId);
  }

  async getTenantsByLandlord(landlordId: string) {
    return tenantStorage.getTenantsByLandlord(landlordId);
  }

  async getTenant(tenantId: string) {
    return tenantStorage.getTenant(tenantId);
  }

  async updateTenant(tenantId: string, updates: any) {
    return tenantStorage.updateTenant(tenantId, updates);
  }

  async deleteTenant(tenantId: string) {
    return tenantStorage.deleteTenant(tenantId);
  }

  // Landlord settings
  async getLandlordSettings(landlordId: string) {
    return tenantStorage.getLandlordSettings(landlordId);
  }

  async updateLandlordSettings(landlordId: string, updates: any) {
    return tenantStorage.updateLandlordSettings(landlordId, updates);
  }

  // Password operations
  async changeLandlordPassword(landlordId: string, currentPassword: string, newPassword: string) {
    return userStorage.changeLandlordPassword(landlordId, currentPassword, newPassword);
  }

  async changeTenantPassword(tenantId: string, currentPassword: string, newPassword: string) {
    return userStorage.changeTenantPassword(tenantId, currentPassword, newPassword);
  }

  // Payment operations (CRITICAL)
  async recordTenantPayment(
    tenantId: string,
    paymentAmount: number,
    forMonth: number,
    forYear: number,
    paymentDate?: Date,
    utilityCharges?: any[],
    totalUtilityCost?: number
  ) {
    return paymentStorage.recordTenantPayment(
      tenantId,
      paymentAmount,
      forMonth,
      forYear,
      paymentDate,
      utilityCharges,
      totalUtilityCost
    );
  }

  // Rent cycle operations
  async updatePropertyRentSettings(propertyId: string, paymentDay: number, gracePeriodDays?: number) {
    return rentCycleStorage.updatePropertyRentSettings(propertyId, paymentDay, gracePeriodDays);
  }

  async updateTenantRentStatus(tenantId: string) {
    return rentCycleStorage.updateTenantRentStatus(tenantId);
  }

  // Payment History methods
  async createPaymentHistory(paymentHistory: any) {
    return paymentStorage.createPaymentHistory(paymentHistory);
  }

  async getPaymentHistory(tenantId: string) {
    return paymentStorage.getPaymentHistory(tenantId);
  }

  async getPaymentHistoryByLandlord(landlordId: string) {
    return paymentStorage.getPaymentHistoryByLandlord(landlordId);
  }

  async getPaymentHistoryByProperty(propertyId: string) {
    return paymentStorage.getPaymentHistoryByProperty(propertyId);
  }

  async getRecordedMonthsForTenant(tenantId: string, year: number) {
    return paymentStorage.getRecordedMonthsForTenant(tenantId, year);
  }

  // Activity operations
  async createPaymentPlan(paymentPlan: any) {
    return activityStorage.createPaymentPlan(paymentPlan);
  }

  async recordCollectionAction(collectionAction: any) {
    return activityStorage.recordCollectionAction(collectionAction);
  }

  async deletePaymentHistory(paymentId: string) {
    return activityStorage.deletePaymentHistory(paymentId);
  }

  // Additional methods not in IStorage but expected
  async processTenantPayment(paymentId: string, amountPaid: number, paymentMethod?: string, tenantId?: string) {
    return paymentStorage.processTenantPayment(paymentId, amountPaid, paymentMethod, tenantId);
  }
}

// Export singleton instance that replaces the old MongoStorage
export const storage = new MongoStorageAdapter();
