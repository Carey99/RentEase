import { type User, type InsertUser, type Property, type InsertProperty, type TenantProperty, type InsertTenantProperty, type Landlord, type Tenant, type InsertLandlord, type InsertTenant, type PaymentHistory, type InsertPaymentHistory } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel, ActivityLog as ActivityLogModel, TenantActivityLog as TenantActivityLogModel } from "./database";
import { ObjectId } from "mongodb";
import { logActivity, createActivityLog } from "./controllers/activityController";
import { logTenantActivity, createTenantActivityLog } from "./controllers/tenantActivityController";

// Helper function to validate ObjectId format
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByLandlord(landlordId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<Property>): Promise<Property | undefined>;
  searchPropertiesByName(name: string): Promise<Property[]>;

  // Tenant property relationships
  getTenantProperty(tenantId: string): Promise<TenantProperty | undefined>;
  createTenantProperty(tenantProperty: InsertTenantProperty): Promise<TenantProperty>;
  getTenantsByProperty(propertyId: string): Promise<TenantProperty[]>;
  getTenantsByLandlord(landlordId: string): Promise<any[]>;
  getTenant(tenantId: string): Promise<any | undefined>;
  updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant | undefined>; // Update tenant details from dashboard
  deleteTenant(tenantId: string): Promise<boolean>; // Cascade delete: removes tenant, credentials, payment history, activity logs, property associations
  changeTenantPassword(tenantId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Landlord settings operations
  getLandlordSettings(landlordId: string): Promise<any>;
  updateLandlordSettings(landlordId: string, updates: any): Promise<any>;
  
  // Password operations
  changeLandlordPassword(landlordId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Rent cycle operations
  recordTenantPayment(tenantId: string, paymentAmount: number, forMonth: number, forYear: number, paymentDate?: Date, utilityCharges?: Array<{ type: string; unitsUsed: number; pricePerUnit: number; total: number }>, totalUtilityCost?: number): Promise<boolean>;
  updatePropertyRentSettings(propertyId: string, paymentDay: number, gracePeriodDays?: number): Promise<boolean>;
  updateTenantRentStatus(tenantId: string): Promise<any>;
  
  // Payment History methods
  createPaymentHistory(paymentHistory: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(tenantId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByLandlord(landlordId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByProperty(propertyId: string): Promise<PaymentHistory[]>;
  getRecordedMonthsForTenant(tenantId: string, year: number): Promise<number[]>;
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        console.log('Invalid ObjectId format for user ID:', id);
        return undefined;
      }

      // Try to find in landlords collection first
      const landlord = await LandlordModel.findById(id).lean();
      if (landlord) {
        return {
          id: landlord._id.toString(),
          fullName: landlord.fullName,
          email: landlord.email,
          password: landlord.password,
          role: 'landlord' as const,
          createdAt: landlord.createdAt,
        };
      }

      // Try to find in tenants collection
      const tenant = await TenantModel.findById(id).lean();
      if (tenant) {
        return {
          id: tenant._id.toString(),
          fullName: tenant.fullName,
          email: tenant.email,
          password: tenant.password,
          role: 'tenant' as const,
          createdAt: tenant.createdAt,
        };
      }

      return undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Try to find in landlords collection first
      const landlord = await LandlordModel.findOne({ email }).lean();
      if (landlord) {
        return {
          id: landlord._id.toString(),
          fullName: landlord.fullName,
          email: landlord.email,
          password: landlord.password,
          role: 'landlord' as const,
          createdAt: landlord.createdAt,
        };
      }

      // Try to find in tenants collection
      const tenant = await TenantModel.findOne({ email }).lean();
      if (tenant) {
        return {
          id: tenant._id.toString(),
          fullName: tenant.fullName,
          email: tenant.email,
          password: tenant.password,
          role: 'tenant' as const,
          createdAt: tenant.createdAt,
        };
      }

      return undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      if (insertUser.role === 'landlord') {
        const landlord = new LandlordModel({
          fullName: insertUser.fullName,
          email: insertUser.email,
          password: insertUser.password,
          role: 'landlord',
        });
        const saved = await landlord.save();
        return {
          id: saved._id.toString(),
          fullName: saved.fullName,
          email: saved.email,
          password: saved.password,
          role: 'landlord' as const,
          createdAt: saved.createdAt,
        };
      } else {
        const tenant = new TenantModel({
          fullName: insertUser.fullName,
          email: insertUser.email,
          phone: insertUser.phone,
          password: insertUser.password,
          role: 'tenant',
        });
        const saved = await tenant.save();
        return {
          id: saved._id.toString(),
          fullName: saved.fullName,
          email: saved.email,
          password: saved.password,
          role: 'tenant' as const,
          createdAt: saved.createdAt,
        };
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getProperty(id: string): Promise<Property | undefined> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(id)) {
        console.log('Invalid ObjectId format for property ID:', id);
        return undefined;
      }

      const property = await PropertyModel.findById(id).lean();
      if (!property) return undefined;

      return {
        _id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        propertyTypes: property.propertyTypes,
        rentSettings: (property as any).rentSettings || { paymentDay: 1, gracePeriodDays: 3 },
        utilities: property.utilities,
        totalUnits: property.totalUnits || undefined,
        occupiedUnits: property.occupiedUnits,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
        tenants: property.tenants?.map(id => id.toString()) || [],
      };
    } catch (error) {
      console.error('Error getting property:', error);
      return undefined;
    }
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    try {
      // Check if landlordId is a valid ObjectId format
      if (!isValidObjectId(landlordId)) {
        console.log('Invalid ObjectId format for landlordId:', landlordId);
        return [];
      }

      const properties = await PropertyModel.find({ landlordId }).lean();
      return properties.map(property => ({
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        propertyTypes: property.propertyTypes || [],
        rentSettings: (property as any).rentSettings || { paymentDay: 1, gracePeriodDays: 3 },
        utilities: property.utilities || undefined,
        totalUnits: property.totalUnits || undefined,
        occupiedUnits: property.occupiedUnits || "0",
        createdAt: property.createdAt,
      }));
    } catch (error) {
      console.error('Error getting properties by landlord:', error);
      return [];
    }
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    try {
      const property = new PropertyModel({
        landlordId: insertProperty.landlordId,
        name: insertProperty.name,
        propertyTypes: insertProperty.propertyTypes,
        utilities: insertProperty.utilities,
        totalUnits: insertProperty.totalUnits,
        occupiedUnits: "0",
      });
      const saved = await property.save();

      // Add property to landlord's properties array
      await LandlordModel.findByIdAndUpdate(
        insertProperty.landlordId,
        { $push: { properties: saved._id } }
      );

      return {
        _id: saved._id.toString(),
        landlordId: saved.landlordId.toString(),
        name: saved.name,
        propertyTypes: saved.propertyTypes,
        rentSettings: (saved as any).rentSettings || { paymentDay: 1, gracePeriodDays: 3 },
        utilities: saved.utilities,
        totalUnits: saved.totalUnits || undefined,
        occupiedUnits: saved.occupiedUnits,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | undefined> {
    try {
      if (!isValidObjectId(id)) {
        console.log('Invalid ObjectId format for property ID:', id);
        return undefined;
      }

      // Get the old property to detect utility changes
      const oldProperty = await PropertyModel.findById(id).lean();
      
      const updatedProperty = await PropertyModel.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      ).populate('tenants').lean();

      if (!updatedProperty) {
        return undefined;
      }

      // Detect if utilities were changed
      if (updates.utilities && oldProperty) {
        const oldUtilities = oldProperty.utilities || [];
        const newUtilities = updates.utilities || [];
        
        // Check if utilities changed
        const utilitiesChanged = JSON.stringify(oldUtilities) !== JSON.stringify(newUtilities);
        
        if (utilitiesChanged && updatedProperty.tenants && Array.isArray(updatedProperty.tenants)) {
          console.log(`🔔 Utilities changed for property ${updatedProperty.name}, notifying ${updatedProperty.tenants.length} tenants`);
          
          // Notify all tenants in this property about utility changes
          for (const tenant of updatedProperty.tenants) {
            const tenantId = typeof tenant === 'object' && tenant._id ? tenant._id.toString() : tenant.toString();
            const tenantDoc = await TenantModel.findById(tenantId);
            
            if (tenantDoc) {
              // Create detailed utility change message
              const utilityChanges: string[] = [];
              
              // Check for new utilities
              newUtilities.forEach((newUtil: any) => {
                const oldUtil = oldUtilities.find((old: any) => old.type === newUtil.type);
                if (!oldUtil) {
                  utilityChanges.push(`New utility added: ${newUtil.type} at KSH ${newUtil.price}/unit`);
                } else if (oldUtil.price !== newUtil.price) {
                  utilityChanges.push(`${newUtil.type}: KSH ${oldUtil.price} → KSH ${newUtil.price} per unit`);
                }
              });
              
              // Check for removed utilities
              oldUtilities.forEach((oldUtil: any) => {
                const stillExists = newUtilities.find((newUtil: any) => newUtil.type === oldUtil.type);
                if (!stillExists) {
                  utilityChanges.push(`${oldUtil.type} utility removed`);
                }
              });
              
              const changesText = utilityChanges.length > 0 
                ? utilityChanges.join('; ') 
                : 'Utility rates have been updated';
              
              await logTenantActivity(createTenantActivityLog(
                tenantId,
                'system_alert',
                'Utility Rates Updated',
                `Your landlord has updated the utility rates for ${updatedProperty.name}. ${changesText}. Please check the "My Apartment" tab for current rates.`,
                {
                  landlordId: updatedProperty.landlordId.toString(),
                  propertyId: updatedProperty._id.toString(),
                  propertyName: updatedProperty.name,
                },
                'medium'
              ));
              
              console.log(`  ✓ Notified tenant ${tenantDoc.fullName} about utility changes`);
            }
          }
        }
      }

      return {
        _id: updatedProperty._id.toString(),
        landlordId: updatedProperty.landlordId.toString(),
        name: updatedProperty.name,
        propertyTypes: updatedProperty.propertyTypes,
        rentSettings: (updatedProperty as any).rentSettings || { paymentDay: 1, gracePeriodDays: 3 },
        utilities: updatedProperty.utilities,
        totalUnits: updatedProperty.totalUnits || undefined,
        occupiedUnits: updatedProperty.occupiedUnits,
        createdAt: updatedProperty.createdAt,
      };
    } catch (error) {
      console.error('Error updating property:', error);
      return undefined;
    }
  }

  async searchPropertiesByName(name: string): Promise<Property[]> {
    try {
      // If no search term provided, return all properties
      const query = name ? { name: { $regex: name, $options: 'i' } } : {};
      const properties = await PropertyModel.find(query).lean();

      return properties.map(property => ({
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        propertyTypes: property.propertyTypes || [],
        rentSettings: (property as any).rentSettings || { paymentDay: 1, gracePeriodDays: 3 },
        utilities: property.utilities || undefined,
        totalUnits: property.totalUnits || undefined,
        occupiedUnits: property.occupiedUnits || "0",
        createdAt: property.createdAt,
      }));
    } catch (error) {
      console.error('Error searching properties:', error);
      return [];
    }
  }

  async getTenantProperty(tenantId: string): Promise<TenantProperty | undefined> {
    try {
      console.log('Getting tenant property for tenant ID:', tenantId);

      // Validate ObjectId format
      if (!isValidObjectId(tenantId)) {
        console.log('Invalid ObjectId format for tenant ID:', tenantId);
        return undefined;
      }

      const tenant = await TenantModel.findById(tenantId).lean();
      console.log('Found tenant:', tenant);

      if (!tenant || !tenant.apartmentInfo) {
        console.log('No tenant or apartment info found');
        return undefined;
      }

      // Handle both cases: when propertyId is an ObjectId string or a populated object
      let propertyId: string;
      if (typeof tenant.apartmentInfo.propertyId === 'string') {
        propertyId = tenant.apartmentInfo.propertyId;
      } else if (tenant.apartmentInfo.propertyId && typeof tenant.apartmentInfo.propertyId === 'object') {
        propertyId = tenant.apartmentInfo.propertyId._id?.toString() || tenant.apartmentInfo.propertyId.toString();
      } else {
        console.log('No valid property ID found');
        return undefined;
      }

      console.log('Using property ID:', propertyId);

      const property = await PropertyModel.findById(propertyId).lean();
      console.log('Found property:', property);

      const result = {
        _id: tenantId,
        tenantId: tenantId,
        propertyId: propertyId,
        propertyType: tenant.apartmentInfo.propertyType || '',
        unitNumber: tenant.apartmentInfo.unitNumber || '',
        rentAmount: tenant.apartmentInfo.rentAmount || undefined,
        createdAt: tenant.createdAt,
        property: property ? {
          id: property._id.toString(),
          landlordId: property.landlordId.toString(),
          name: property.name,
          propertyTypes: property.propertyTypes || [],
          utilities: property.utilities,
          totalUnits: property.totalUnits || undefined,
          occupiedUnits: property.occupiedUnits || undefined,
          createdAt: property.createdAt,
        } : undefined,
        // Include rent cycle data
        rentCycle: await this.getRentCycleForTenant(tenant, property)
      }; console.log('Returning tenant property result:', result);
      return result as TenantProperty;
    } catch (error) {
      console.error('Error getting tenant property:', error);
      return undefined;
    }
  }

    // Helper method to get rent cycle data for a tenant
  private async getRentCycleForTenant(tenant: any, property: any) {
    try {
      console.log(`🔄 Calculating rent cycle for tenant: ${tenant.fullName} (${tenant._id})`);
      
      // Get rent settings from property or use defaults
      const rentSettings = {
        paymentDay: (property as any)?.rentSettings?.paymentDay || 1,
        gracePeriodDays: (property as any)?.rentSettings?.gracePeriodDays || 3
      };
      console.log(`  ⚙️  Rent settings:`, rentSettings);

      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();
      
      // Get tenant registration date to check if they're new
      const tenantCreatedAt = new Date(tenant.createdAt);
      const tenantRegistrationMonth = tenantCreatedAt.getMonth() + 1;
      const tenantRegistrationYear = tenantCreatedAt.getFullYear();
      
      // Check if tenant registered in the current month
      const registeredThisMonth = (tenantRegistrationMonth === currentMonth && tenantRegistrationYear === currentYear);
      
      console.log(`  🆕 Registration check: Registered ${tenantCreatedAt.toDateString()}, registeredThisMonth: ${registeredThisMonth}`);
      
      // Check if tenant has ANY payment history (to determine if they're still "new")
      const anyPayments = await PaymentHistoryModel.find({
        tenantId: tenant._id
      }).lean();
      
      const hasAnyPayments = anyPayments.length > 0;
      
      // Tenant is considered "new" ONLY if:
      // 1. Registered this month AND
      // 2. Has NO payments at all (not even pending/partial)
      const isNewTenant = registeredThisMonth && !hasAnyPayments;
      
      console.log(`  🆕 Has any payments: ${hasAnyPayments}, Is truly new tenant: ${isNewTenant}`);
      
      // Check for bills for current month (exclude transaction records)
      const currentMonthBills = await PaymentHistoryModel.find({
        tenantId: tenant._id,
        forMonth: currentMonth,
        forYear: currentYear,
        notes: { $not: /Payment transaction/ } // Only look at actual bills, not transaction receipts
      }).sort({ createdAt: -1 }).lean();
      
      // Get the most recent bill (in case of duplicates)
      const currentMonthBill = currentMonthBills.length > 0 ? currentMonthBills[0] : null;
      
      // Log if there are duplicates
      if (currentMonthBills.length > 1) {
        console.log(`  ⚠️  WARNING: Found ${currentMonthBills.length} bills for ${currentMonth}/${currentYear}, using most recent`);
      }
      
      // Check payment status from the bill itself
      const currentMonthPaid = currentMonthBill?.status === 'completed' || currentMonthBill?.status === 'overpaid';
      const hasPartialPayment = currentMonthBill?.status === 'partial';
      
      console.log(`  📋 Current month bill:`, {
        exists: !!currentMonthBill,
        billId: currentMonthBill?._id,
        status: currentMonthBill?.status,
        amount: currentMonthBill?.amount,
        monthlyRent: currentMonthBill?.monthlyRent,
        utilities: currentMonthBill?.totalUtilityCost,
      });
      
      // Get the actual LAST completed bill across ALL months
      const allCompletedBills = await PaymentHistoryModel.find({
        tenantId: tenant._id,
        status: { $in: ['completed', 'overpaid'] },
        notes: { $not: /Payment transaction/ }
      }).sort({ paymentDate: -1 }).limit(1).lean();
      
      const lastPayment = allCompletedBills.length > 0 ? allCompletedBills[0] : null;
      
      console.log(`  💰 Current month (${currentMonth}/${currentYear}) PAID: ${currentMonthPaid}`);
      console.log(`  ⚠️  Has PARTIAL payment: ${hasPartialPayment}`);
      if (lastPayment) {
        console.log(`  💵 Last completed payment: ${lastPayment.amount} on ${lastPayment.paymentDate} for ${lastPayment.forMonth}/${lastPayment.forYear}`);
      }
      if (hasPartialPayment && currentMonthBill) {
        const expectedAmount = currentMonthBill.monthlyRent + (currentMonthBill.totalUtilityCost || 0);
        const remainingBalance = expectedAmount - currentMonthBill.amount;
        console.log(`  💰 Partial payment: Paid ${currentMonthBill.amount} / ${expectedAmount}, Balance: ${remainingBalance}`);
      }

      // Calculate current month's due date
      const currentDueDate = new Date(currentYear, currentMonth - 1, rentSettings.paymentDay);
      
      // Calculate next month's due date
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const nextDueDate = new Date(nextYear, nextMonth - 1, rentSettings.paymentDay);
      
      let rentStatus: 'active' | 'overdue' | 'grace_period' | 'paid' | 'partial' = 'active';
      let daysRemaining: number;
      let daysOverdue: number = 0;
      
      // Determine rent status based on bills and payments
      if (!currentMonthBill) {
        // No bill for current month means tenant is current/ahead
        // This happens when:
        // - New tenant with no bills yet
        // - Tenant already paid and next month's bill not created yet
        rentStatus = 'active';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  ✨ No bill for current month - tenant is current: ${daysRemaining} days to next cycle`);
      } else if (currentMonthPaid) {
        // Current month bill exists AND is fully paid
        rentStatus = 'paid';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  ✅ PAID for ${currentMonth}/${currentYear}: Next due in ${daysRemaining} days (${nextDueDate.toDateString()})`);
      } else if (hasPartialPayment) {
        // Current month has partial payment - show as "partial" status
        rentStatus = 'partial';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  💰 PARTIAL PAYMENT for ${currentMonth}/${currentYear}: ${currentMonthBill.amount} paid`);
      } else {
        // Current month bill exists but NO PAYMENT - check if overdue based on due date
        if (now >= currentDueDate) {
          // OVERDUE - calculate days PAST the due date (counting UP)
          const timeDiff = now.getTime() - currentDueDate.getTime();
          daysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysOverdue <= rentSettings.gracePeriodDays) {
            rentStatus = 'grace_period';
            console.log(`  ⚠️  GRACE PERIOD for ${currentMonth}/${currentYear}: ${daysOverdue} days past due date`);
          } else {
            rentStatus = 'overdue';
            console.log(`  ❌ OVERDUE for ${currentMonth}/${currentYear}: ${daysOverdue} days past due date`);
          }
          
          // For overdue, daysRemaining is negative (to show "X days overdue")
          daysRemaining = -daysOverdue;
        } else {
          // Bill exists but not yet due
          rentStatus = 'active';
          const timeDiff = currentDueDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          console.log(`  ⏰ ACTIVE: Bill for ${currentMonth}/${currentYear} due in ${daysRemaining} days (${currentDueDate.toDateString()})`);
        }
      }

      console.log(`  📊 Final: status=${rentStatus}, daysRemaining=${daysRemaining}, nextDueDate=${nextDueDate.toISOString()}`);

      // Calculate partial payment details if exists
      let partialPaymentInfo = null;
      if (hasPartialPayment && currentMonthBill) {
        const expectedAmount = currentMonthBill.monthlyRent + (currentMonthBill.totalUtilityCost || 0);
        partialPaymentInfo = {
          amountPaid: currentMonthBill.amount,
          expectedAmount,
          remainingBalance: expectedAmount - currentMonthBill.amount,
          paymentDate: currentMonthBill.paymentDate
        };
      }

      const rentCycleResult = {
        lastPaymentDate: lastPayment?.paymentDate || null,
        lastPaymentAmount: lastPayment?.amount || null,
        currentMonthPaid,
        paidForMonth: lastPayment?.forMonth || null,
        paidForYear: lastPayment?.forYear || null,
        nextDueDate: isNewTenant ? nextDueDate : (currentMonthPaid ? nextDueDate : currentDueDate),
        daysRemaining,
        rentStatus,
        isNewTenant, // Flag for frontend to show welcome message
        hasPartialPayment,
        partialPaymentInfo
      };
      
      console.log(`  🎯 RETURNING RENT CYCLE:`, JSON.stringify(rentCycleResult, null, 2));
      
      return rentCycleResult;
    } catch (error) {
      console.error('Error calculating rent cycle:', error);
      return {
        lastPaymentDate: null,
        lastPaymentAmount: null,
        currentMonthPaid: false,
        paidForMonth: null,
        paidForYear: null,
        nextDueDate: new Date(),
        daysRemaining: -999,
        rentStatus: 'overdue' as const
      };
    }
  }

  async createTenantProperty(insertTenantProperty: InsertTenantProperty): Promise<TenantProperty> {
    try {
      console.log('Creating tenant property with data:', insertTenantProperty);
      
      // Validate ObjectId format for tenantId
      if (!isValidObjectId(insertTenantProperty.tenantId)) {
        throw new Error('Invalid tenant ID format');
      }

      // Validate ObjectId format for propertyId
      if (!isValidObjectId(insertTenantProperty.propertyId)) {
        throw new Error('Invalid property ID format');
      }

      // Get the property to find the landlordId
      const property = await PropertyModel.findById(insertTenantProperty.propertyId);
      console.log('Found property:', property);
      
      if (!property) {
        // Let's see what properties exist
        const allProperties = await PropertyModel.find({}).lean();
        console.log('All existing properties:', allProperties.map(p => ({ id: p._id, name: p.name })));
        throw new Error(`Property not found with ID: ${insertTenantProperty.propertyId}`);
      }

      // Update tenant with apartment info including landlordId
      const tenant = await TenantModel.findByIdAndUpdate(
        insertTenantProperty.tenantId,
        {
          apartmentInfo: {
            propertyId: insertTenantProperty.propertyId,
            propertyName: property.name,
            propertyType: insertTenantProperty.propertyType,
            unitNumber: insertTenantProperty.unitNumber,
            rentAmount: insertTenantProperty.rentAmount,
            landlordId: property.landlordId,
          }
        },
        { new: true }
      );

      // Add tenant to property's tenants array
      await PropertyModel.findByIdAndUpdate(
        insertTenantProperty.propertyId,
        { $push: { tenants: insertTenantProperty.tenantId } }
      );

      if (!tenant) throw new Error('Tenant not found');

      return {
        _id: tenant._id.toString(),
        tenantId: insertTenantProperty.tenantId,
        propertyId: insertTenantProperty.propertyId,
        propertyType: insertTenantProperty.propertyType,
        unitNumber: insertTenantProperty.unitNumber,
        rentAmount: insertTenantProperty.rentAmount,
        createdAt: tenant.createdAt,
      };
    } catch (error) {
      console.error('Error creating tenant property:', error);
      throw error;
    }
  }

  async getTenantsByProperty(propertyId: string): Promise<any[]> {
    try {
      // Get the property first to get rent settings
      const property = await PropertyModel.findById(propertyId).lean();

      const tenants = await TenantModel.find({
        'apartmentInfo.propertyId': propertyId
      }).lean();

      // Use the helper method for consistent rent cycle calculation
      const tenantsWithRentCycle = await Promise.all(tenants.map(async (tenant) => {
        const rentCycle = await this.getRentCycleForTenant(tenant, property);

        return {
          id: tenant._id.toString(),
          fullName: tenant.fullName,
          email: tenant.email,
          apartmentInfo: {
            unitNumber: tenant.apartmentInfo?.unitNumber || '',
            rentAmount: tenant.apartmentInfo?.rentAmount || '0',
          },
          rentCycle
        };
      }));

      return tenantsWithRentCycle;
    } catch (error) {
      console.error('Error getting tenants by property:', error);
      return [];
    }
  }

  async getTenantsByLandlord(landlordId: string): Promise<any[]> {
    try {
      // Validate ObjectId format
      if (!isValidObjectId(landlordId)) {
        console.log('Invalid ObjectId format for landlord ID:', landlordId);
        return [];
      }

      // Convert landlordId to ObjectId for proper comparison
      const landlordObjectId = new ObjectId(landlordId);

      // Find all tenants associated with this landlord
      const tenants = await TenantModel.find({
        'apartmentInfo.landlordId': landlordObjectId
      }).populate('apartmentInfo.propertyId').lean();

      console.log(`Finding tenants for landlordId: ${landlordObjectId}, found ${tenants.length} tenants`);
      console.log('📋 Tenant data structure:', tenants.map(t => ({
        id: t._id,
        name: t.fullName,
        hasApartmentInfo: !!t.apartmentInfo,
        apartmentInfo: t.apartmentInfo
      })));

      // Get rent cycle information for each tenant
      const tenantsWithRentCycle = await Promise.all(tenants.map(async (tenant) => {
        let rentCycle = null;
        
        console.log(`🔄 Processing rent cycle for tenant: ${tenant.fullName} (${tenant._id})`);
        
        try {
          // Get the property to access rent settings
          const propertyId = tenant.apartmentInfo?.propertyId;
          console.log(`  📍 Property ID: ${propertyId}`);
          
          if (propertyId) {
            // Convert propertyId to string if it's an ObjectId
            const propertyIdString = propertyId._id ? propertyId._id.toString() : propertyId.toString();
            console.log(`  🔗 Property ID string: ${propertyIdString}`);
            
            const property = await PropertyModel.findById(propertyIdString).lean();
            
            // Use the centralized helper method for rent cycle calculation
            rentCycle = await this.getRentCycleForTenant(tenant, property);
          }
        } catch (error) {
          console.error(`❌ Error calculating rent cycle for tenant: ${tenant._id}`, error);
        }

        return {
          id: tenant._id.toString(),
          name: tenant.fullName,
          email: tenant.email,
          phone: tenant.phone || '',
          propertyId: tenant.apartmentInfo?.propertyId?._id ? 
            tenant.apartmentInfo.propertyId._id.toString() : 
            tenant.apartmentInfo?.propertyId?.toString() || '',
          propertyName: tenant.apartmentInfo?.propertyName || '',
          unitType: tenant.apartmentInfo?.propertyType || '',
          unitNumber: tenant.apartmentInfo?.unitNumber || '',
          rentAmount: tenant.apartmentInfo?.rentAmount ? parseInt(tenant.apartmentInfo.rentAmount) : 0,
          status: tenant.status || 'active',
          leaseStart: tenant.createdAt?.toISOString().split('T')[0] || '',
          leaseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 year lease
          avatar: '',
          rentCycle // Add rent cycle information
        };
      }));

      console.log(`✅ Returning ${tenantsWithRentCycle.length} tenants with rent cycle data`);
      return tenantsWithRentCycle;
    } catch (error) {
      console.error('Error getting tenants by landlord:', error);
      return [];
    }
  }

  async getTenant(tenantId: string): Promise<any | undefined> {
    try {
      if (!isValidObjectId(tenantId)) {
        console.log('Invalid ObjectId format for tenant ID:', tenantId);
        return undefined;
      }

      const tenant = await TenantModel.findById(tenantId).lean();
      if (!tenant) {
        return undefined;
      }

      return tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      return undefined;
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    try {
      
      if (!isValidObjectId(tenantId)) {
        console.log('Invalid ObjectId format for tenant ID:', tenantId);
        return undefined;
      }

      const allowedUpdates: Partial<Tenant> = {};
      
      // Whitelist specific fields that can be updated for security
      if (updates.fullName) allowedUpdates.fullName = updates.fullName;
      if (updates.email) allowedUpdates.email = updates.email;
      if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
      if (updates.status) allowedUpdates.status = updates.status;

      // Gets current tenant data to preserve existing apartmentInfo
      const currentTenant = await TenantModel.findById(tenantId);
      if (!currentTenant) {
        return undefined;
      }

      const updateDoc: any = {
        ...allowedUpdates,
        updatedAt: new Date(),
      };

      // Update apartment-specific fields if apartmentInfo is provided
      if (updates.apartmentInfo) {
        updateDoc.apartmentInfo = {
          ...currentTenant.apartmentInfo,
          ...updates.apartmentInfo,
        };
      }

      const updatedTenant = await TenantModel.findByIdAndUpdate(
        tenantId,
        updateDoc,
        { new: true, runValidators: true }
      ).lean();

      if (!updatedTenant) {
        return undefined;
      }

      return {
        _id: updatedTenant._id.toString(),
        fullName: updatedTenant.fullName,
        email: updatedTenant.email,
        phone: updatedTenant.phone || undefined,
        password: updatedTenant.password,
        role: 'tenant' as const,
        apartmentInfo: updatedTenant.apartmentInfo ? {
          propertyId: updatedTenant.apartmentInfo.propertyId?.toString(),
          propertyName: updatedTenant.apartmentInfo.propertyName || undefined,
          propertyType: updatedTenant.apartmentInfo.propertyType || undefined,
          unitNumber: updatedTenant.apartmentInfo.unitNumber || undefined,
          rentAmount: updatedTenant.apartmentInfo.rentAmount || undefined,
          landlordId: updatedTenant.apartmentInfo.landlordId?.toString(),
        } : undefined,
        rentCycle: (updatedTenant as any).rentCycle || {},
        createdAt: updatedTenant.createdAt,
        updatedAt: updatedTenant.updatedAt,
      };
    } catch (error) {
      console.error('Error updating tenant:', error);
      return undefined;
    }
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      console.log(`🗑️  Starting cascade delete for tenant: ${tenantId}`);
      
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        console.log(`❌ Tenant ${tenantId} not found`);
        return false;
      }

      const tenantName = tenant.fullName || tenant.email;
      console.log(`👤 Deleting tenant: ${tenantName}`);

      // 1. Remove tenant from their property's tenant array
      if (tenant.apartmentInfo?.propertyId) {
        console.log(`📍 Removing tenant from property: ${tenant.apartmentInfo.propertyId}`);
        await PropertyModel.updateOne(
          { _id: tenant.apartmentInfo.propertyId },
          { $pull: { tenants: tenantId } }
        );
      }

      // 2. Delete ALL payment history records for this tenant (bills and transactions)
      const paymentDeleteResult = await PaymentHistoryModel.deleteMany({ tenantId: tenantId });
      console.log(`💰 Deleted ${paymentDeleteResult.deletedCount} payment history records`);

      // 3. Delete ALL tenant activity logs (tenant's personal activity feed)
      const tenantActivityDeleteResult = await TenantActivityLogModel.deleteMany({ tenantId: tenantId });
      console.log(`📋 Deleted ${tenantActivityDeleteResult.deletedCount} tenant activity logs`);

      // 4. Delete ALL landlord activity logs related to this tenant
      const landlordActivityDeleteResult = await ActivityLogModel.deleteMany({ 
        'metadata.tenantId': tenantId 
      });
      console.log(`📊 Deleted ${landlordActivityDeleteResult.deletedCount} landlord activity logs`);

      // 5. Delete the tenant document (includes login credentials: email/password)
      // This removes:
      // - Personal information (name, email, phone)
      // - Login credentials (email/password)
      // - Apartment info
      // - Rent cycle data
      // - All tenant metadata
      const tenantDeleteResult = await TenantModel.deleteOne({ _id: tenantId });
      console.log(`🏠 Deleted tenant record: ${tenantDeleteResult.deletedCount > 0 ? 'Success' : 'Failed'}`);

      const success = tenantDeleteResult.deletedCount === 1;
      
      if (success) {
        console.log(`✅ CASCADE DELETE COMPLETE for ${tenantName}:`);
        console.log(`   - Tenant record: DELETED`);
        console.log(`   - Login credentials: DELETED`);
        console.log(`   - Payment history (${paymentDeleteResult.deletedCount} records): DELETED`);
        console.log(`   - Tenant activity logs (${tenantActivityDeleteResult.deletedCount} records): DELETED`);
        console.log(`   - Landlord activity logs (${landlordActivityDeleteResult.deletedCount} records): DELETED`);
        console.log(`   - Property association: REMOVED`);
        console.log(`   🎯 Tenant completely removed from database - no trace left`);
      } else {
        console.log(`❌ Failed to delete tenant record`);
      }

      return success;

    } catch (error) {
      console.error('❌ Error during cascade delete of tenant:', error);
      return false;
    }
  }

  async getLandlordSettings(landlordId: string): Promise<any> {
    try {
      const landlord = await LandlordModel.findById(landlordId).lean();
      if (!landlord) throw new Error('Landlord not found');

      return {
        profile: {
          fullName: landlord.fullName,
          email: landlord.email,
          phone: landlord.phone || '',
          company: landlord.company || '',
          address: landlord.address || '',
        },
        notifications: {
          emailNotifications: landlord.settings?.emailNotifications ?? true,
          smsNotifications: landlord.settings?.smsNotifications ?? false,
          newTenantAlerts: landlord.settings?.newTenantAlerts ?? true,
          paymentReminders: landlord.settings?.paymentReminders ?? true,
        },
        preferences: {
          currency: landlord.settings?.currency || 'KSH',
          timezone: landlord.settings?.timezone || 'Africa/Nairobi',
          language: landlord.settings?.language || 'en',
        }
      };
    } catch (error) {
      console.error('Error fetching landlord settings:', error);
      throw error;
    }
  }

  async updateLandlordSettings(landlordId: string, updates: any): Promise<any> {
    try {
      console.log('📝 Updating landlord settings:', { landlordId, updates });
      
      const updateData: any = {};
      
      // Handle profile updates (root level fields)
      if (updates.profile) {
        if (updates.profile.fullName) updateData.fullName = updates.profile.fullName;
        if (updates.profile.email) updateData.email = updates.profile.email;
        if (updates.profile.phone) updateData.phone = updates.profile.phone;
        if (updates.profile.company) updateData.company = updates.profile.company;
        if (updates.profile.address) updateData.address = updates.profile.address;
      }
      
      // Handle notification and preference updates (nested in settings)
      if (updates.notifications) {
        updateData['settings.emailNotifications'] = updates.notifications.emailNotifications;
        updateData['settings.smsNotifications'] = updates.notifications.smsNotifications;
        updateData['settings.newTenantAlerts'] = updates.notifications.newTenantAlerts;
        updateData['settings.paymentReminders'] = updates.notifications.paymentReminders;
      }
      
      if (updates.preferences) {
        if (updates.preferences.currency) updateData['settings.currency'] = updates.preferences.currency;
        if (updates.preferences.timezone) updateData['settings.timezone'] = updates.preferences.timezone;
        if (updates.preferences.language) updateData['settings.language'] = updates.preferences.language;
      }

      console.log('📊 Update data prepared:', updateData);

      const updatedLandlord = await LandlordModel.findByIdAndUpdate(
        landlordId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedLandlord) {
        throw new Error('Landlord not found');
      }

      console.log('✅ Landlord settings updated successfully');
      return this.getLandlordSettings(landlordId);
    } catch (error) {
      console.error('❌ Error updating landlord settings:', error);
      throw error;
    }
  }

  async changeLandlordPassword(landlordId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      console.log('🔐 Attempting to change password for landlord:', landlordId);
      
      // Verify the current password
      const landlord = await LandlordModel.findById(landlordId);
      if (!landlord) {
        console.log('❌ Landlord not found');
        return false;
      }

      console.log('🔍 Verifying current password...');
      if (landlord.password !== currentPassword) {
        console.log('❌ Current password is incorrect');
        return false;
      }

      // Update with new password
      console.log('✅ Current password verified, updating to new password...');
      const result = await LandlordModel.findByIdAndUpdate(
        landlordId,
        { $set: { password: newPassword } },
        { new: true }
      );

      if (result) {
        console.log('✅ Password changed successfully');
        return true;
      }
      
      console.log('❌ Failed to update password');
      return false;
    } catch (error) {
      console.error('❌ Error changing landlord password:', error);
      return false;
    }
  }

  async changeTenantPassword(tenantId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      console.log('🔐 Attempting to change password for tenant:', tenantId);
      
      // Verify the current password
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        console.log('❌ Tenant not found');
        return false;
      }

      console.log('🔍 Verifying current password...');
      if (tenant.password !== currentPassword) {
        console.log('❌ Current password is incorrect');
        return false;
      }

      // Update with new password
      console.log('✅ Current password verified, updating to new password...');
      const result = await TenantModel.findByIdAndUpdate(
        tenantId,
        { $set: { password: newPassword } },
        { new: true }
      );

      if (result) {
        console.log('✅ Password changed successfully');
        return true;
      }
      
      console.log('❌ Failed to update password');
      return false;
    } catch (error) {
      console.error('❌ Error changing tenant password:', error);
      return false;
    }
  }

  async recordTenantPayment(
    tenantId: string, 
    paymentAmount: number, 
    forMonth: number, 
    forYear: number, 
    paymentDate: Date = new Date(),
    utilityCharges?: Array<{ type: string; unitsUsed: number; pricePerUnit: number; total: number }>,
    totalUtilityCost?: number
  ): Promise<boolean> {
    try {
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get property to find payment day and grace period
      const property = await PropertyModel.findById(tenant.apartmentInfo?.propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Check if bill/payment already exists for this tenant, month, and year
      const existingPayment = await PaymentHistoryModel.findOne({
        tenantId,
        forMonth,
        forYear
      });

      if (existingPayment) {
        console.log(`⚠️ Bill already exists for tenant ${tenantId} for ${forMonth}/${forYear}`);
        throw new Error(`Bill already recorded for ${forMonth}/${forYear}. Cannot create duplicate bill.`);
      }

      // Get monthly rent amount from tenant's apartment info
      const monthlyRentAmount = parseFloat(tenant.apartmentInfo?.rentAmount || '0');
      if (monthlyRentAmount <= 0) {
        throw new Error('Invalid rent amount for tenant');
      }

      // Calculate historical debt from previous unpaid months
      const historicalBills = await PaymentHistoryModel.find({
        tenantId,
        status: { $in: ['pending', 'partial'] },
        notes: { $not: /Payment transaction/ }, // Exclude transaction records
        $or: [
          { forYear: { $lt: forYear } }, // Previous years
          { forYear: forYear, forMonth: { $lt: forMonth } } // Previous months this year
        ]
      });

      let historicalDebt = 0;
      const historicalDebtDetails: string[] = [];
      
      historicalBills.forEach(bill => {
        const expected = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const paid = bill.amount || 0;
        const balance = expected - paid;
        
        if (balance > 0) {
          historicalDebt += balance;
          historicalDebtDetails.push(`${bill.forMonth}/${bill.forYear}: KSH ${balance}`);
        }
      });

      console.log(`📝 Creating BILL for tenant ${tenantId} for ${forMonth}/${forYear}`);
      if (historicalDebt > 0) {
        console.log(`  ⚠️  Including historical debt: KSH ${historicalDebt}`);
        console.log(`  Details: ${historicalDebtDetails.join(', ')}`);
      }

      // Current month charges
      const currentMonthCharges = monthlyRentAmount + (totalUtilityCost || 0);
      
      // Total bill = current month + historical debt
      const totalBillAmount = currentMonthCharges + historicalDebt;

      // Create notes including historical debt info
      let billNotes = `Bill for ${forMonth}/${forYear} - Rent: KSH ${monthlyRentAmount}, Utilities: KSH ${totalUtilityCost || 0}`;
      if (historicalDebt > 0) {
        billNotes += ` | Includes historical debt: KSH ${historicalDebt} (${historicalDebtDetails.join(', ')})`;
      }

      // Landlord is creating a BILL (not recording payment received)
      // Status is 'pending' until tenant actually pays
      // IMPORTANT: amount should be 0 initially (nothing paid yet)
      // monthlyRent field stores just the rent, but we track total in notes
      const newPayment = await this.createPaymentHistory({
        tenantId,
        landlordId: tenant.apartmentInfo?.landlordId?.toString() || '',
        propertyId: tenant.apartmentInfo?.propertyId?.toString() || '',
        amount: 0, // No payment received yet - this will be updated when tenant pays
        paymentDate,
        forMonth,
        forYear,
        monthlyRent: totalBillAmount, // Store TOTAL expected (rent + utilities + historical debt)
        paymentMethod: 'Not specified', // Tenant will specify when paying
        status: 'pending', // Bill is pending payment
        notes: billNotes,
        utilityCharges: utilityCharges || [],
        totalUtilityCost: totalUtilityCost || 0, // Keep utilities separate for display
      });

      // Log tenant activity - New bill created
      await logTenantActivity(createTenantActivityLog(
        tenantId,
        'bill_created',
        'New Bill Created',
        `Your bill for ${forMonth}/${forYear} is ready. Total amount: KSH ${totalBillAmount.toLocaleString()}`,
        {
          landlordId: tenant.apartmentInfo?.landlordId?.toString(),
          propertyId: tenant.apartmentInfo?.propertyId?.toString(),
          propertyName: tenant.apartmentInfo?.propertyName || undefined,
          paymentId: newPayment._id?.toString(),
          amount: totalBillAmount,
          dueDate: paymentDate.toISOString(),
        },
        'medium'
      ));

      // ⚠️ IMPORTANT: This creates a BILL/INVOICE - it does NOT mean the tenant paid!
      // Tenant's rent cycle will only update when they actually make the payment
      
      console.log(`✅ Bill created successfully. Tenant must now pay this bill.`);

      return true;
    } catch (error) {
      console.error('Error creating bill for tenant:', error);
      throw error;
    }
  }

  /**
   * Process tenant's payment - tenant pays a pending bill
   * This is called when the tenant actually makes a payment
   * Creates a separate receipt for each payment transaction
   */
  async processTenantPayment(
    paymentId: string,
    amountPaid: number,
    paymentMethod: string = 'M-Pesa',
    tenantId?: string
  ): Promise<boolean> {
    try {
      const payment = await PaymentHistoryModel.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment bill not found');
      }

      // Verify tenant if provided
      if (tenantId && payment.tenantId.toString() !== tenantId) {
        throw new Error('This bill does not belong to this tenant');
      }

      const tenantIdStr = payment.tenantId.toString();

      console.log(`\n💳 Processing payment: KSH ${amountPaid} for tenant ${tenantIdStr}`);

      // Check if this bill already includes historical debt (consolidated bill)
      const billIncludesHistoricalDebt = payment.notes?.includes('Includes historical debt');
      
      if (billIncludesHistoricalDebt) {
        console.log(`📝 This is a consolidated bill (includes historical debt)`);
        
        // For consolidated bills, payment goes to THIS bill only
        // Historical bills will be marked as resolved separately
        const expectedAmount = payment.monthlyRent; // Already includes everything
        const previousAmountPaid = payment.amount || 0;
        const totalPaidNow = previousAmountPaid + amountPaid;
        
        let paymentStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
        
        if (totalPaidNow < expectedAmount) {
          paymentStatus = 'partial';
        } else if (totalPaidNow === expectedAmount) {
          paymentStatus = 'completed';
        } else {
          paymentStatus = 'overpaid';
        }

        // Update this bill
        await PaymentHistoryModel.findByIdAndUpdate(payment._id, {
          $set: {
            amount: totalPaidNow,
            status: paymentStatus,
            notes: payment.notes 
              ? `${payment.notes} | Payment of ${amountPaid} received on ${new Date().toDateString()}`
              : `Payment of ${amountPaid} received on ${new Date().toDateString()}`
          }
        });

        // If fully paid or overpaid, mark ALL historical bills as completed (resolved by this payment)
        if (paymentStatus === 'completed' || paymentStatus === 'overpaid') {
          const historicalBills = await PaymentHistoryModel.find({
            tenantId: tenantIdStr,
            status: { $in: ['pending', 'partial'] },
            notes: { $not: /Payment transaction/ },
            $or: [
              { forYear: { $lt: payment.forYear } },
              { forYear: payment.forYear, forMonth: { $lt: payment.forMonth } }
            ]
          });

          for (const oldBill of historicalBills) {
            const oldExpected = oldBill.monthlyRent + (oldBill.totalUtilityCost || 0);
            await PaymentHistoryModel.findByIdAndUpdate(oldBill._id, {
              $set: {
                amount: oldExpected, // Mark as fully paid
                status: 'completed',
                notes: (oldBill.notes || '') + ` | Resolved by ${payment.forMonth}/${payment.forYear} consolidated payment`
              }
            });
            console.log(`  ✓ Marked historical bill ${oldBill.forMonth}/${oldBill.forYear} as completed`);
          }
        }

        // Create transaction record
        await this.createPaymentHistory({
          tenantId: payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: payment.propertyId.toString(),
          amount: amountPaid,
          paymentDate: new Date(),
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod,
          status: paymentStatus,
          notes: `Payment transaction for ${payment.forMonth}/${payment.forYear}`,
          utilityCharges: payment.utilityCharges,
          totalUtilityCost: payment.totalUtilityCost,
        });

        console.log(`✅ Consolidated payment processed: Status ${paymentStatus}`);
        
        // Skip the old smart allocation logic
        const tenant = await TenantModel.findById(payment.tenantId);
        const allPaid = paymentStatus === 'completed';
        
        if (tenant && tenant.apartmentInfo?.landlordId) {
          await logActivity(createActivityLog(
            tenant.apartmentInfo.landlordId.toString(),
            allPaid ? 'payment_received' : 'debt_created',
            allPaid ? 'Payment Received - All Clear' : 'Payment Received',
            `${tenant.fullName} paid KSH ${amountPaid.toLocaleString()}${allPaid ? ' - All bills cleared including historical debt' : ''}`,
            {
              tenantId: tenant._id?.toString(),
              tenantName: tenant.fullName,
              propertyId: tenant.apartmentInfo.propertyId?.toString() || undefined,
              propertyName: tenant.apartmentInfo.propertyName || undefined,
              paymentId: payment._id?.toString(),
              amount: amountPaid,
              unitNumber: tenant.apartmentInfo.unitNumber || undefined,
            },
            allPaid ? 'medium' : 'low'
          ));
        }

        await logTenantActivity(createTenantActivityLog(
          payment.tenantId.toString(),
          allPaid ? 'payment_processed' : 'partial_payment_received',
          allPaid ? 'Payment Confirmed - All Clear' : 'Payment Received',
          allPaid 
            ? `Your payment of KSH ${amountPaid.toLocaleString()} has been processed. All bills are now paid!`
            : `Payment of KSH ${amountPaid.toLocaleString()} received. Remaining balance: KSH ${(expectedAmount - totalPaidNow).toLocaleString()}`,
          {
            landlordId: payment.landlordId.toString(),
            propertyId: payment.propertyId.toString(),
            paymentId: payment._id?.toString(),
            amount: amountPaid,
          },
          allPaid ? 'medium' : 'low'
        ));

        return true;
      }

      // Old logic for non-consolidated bills (kept for backwards compatibility)
      // Get ALL unpaid/partial bills for this tenant (oldest first)
      const allBills = await PaymentHistoryModel.find({
        tenantId: tenantIdStr,
        status: { $in: ['pending', 'partial'] },
        notes: { $not: /Payment transaction/ } // Exclude transaction records
      }).sort({ forYear: 1, forMonth: 1 }); // Oldest first

      console.log(`📋 Found ${allBills.length} unpaid/partial bills for tenant`);
      allBills.forEach(bill => {
        const expected = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const paid = bill.amount || 0;
        console.log(`  - ${bill.forMonth}/${bill.forYear}: Expected ${expected}, Paid ${paid}, Balance ${expected - paid}`);
      });

      // Smart payment allocation: distribute payment across bills (oldest first)
      let remainingAmount = amountPaid;
      const updatedBills: Array<{ bill: any; amountApplied: number; newStatus: string }> = [];

      for (const bill of allBills) {
        if (remainingAmount <= 0) break;

        const expectedAmount = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const previousAmountPaid = bill.amount || 0;
        const billBalance = expectedAmount - previousAmountPaid;

        if (billBalance <= 0) continue; // Bill already paid, skip

        const amountToApply = Math.min(remainingAmount, billBalance);
        const newTotalPaid = previousAmountPaid + amountToApply;
        
        let newStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
        if (newTotalPaid < expectedAmount) {
          newStatus = 'partial';
        } else if (newTotalPaid === expectedAmount) {
          newStatus = 'completed';
        } else {
          newStatus = 'overpaid';
        }

        updatedBills.push({
          bill,
          amountApplied: amountToApply,
          newStatus
        });

        remainingAmount -= amountToApply;
        
        console.log(`  ✓ Applying KSH ${amountToApply} to ${bill.forMonth}/${bill.forYear} - New total: ${newTotalPaid}/${expectedAmount} (${newStatus})`);
      }

      // If there's still remaining amount, apply to the target bill (might create overpayment)
      if (remainingAmount > 0 && payment) {
        const expectedAmount = payment.monthlyRent + (payment.totalUtilityCost || 0);
        const previousAmountPaid = payment.amount || 0;
        const amountToApply = remainingAmount;
        const newTotalPaid = previousAmountPaid + amountToApply;
        
        let newStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
        if (newTotalPaid < expectedAmount) {
          newStatus = 'partial';
        } else if (newTotalPaid === expectedAmount) {
          newStatus = 'completed';
        } else {
          newStatus = 'overpaid';
        }

        // Check if this bill is already in updatedBills
        const existingUpdate = updatedBills.find(u => u.bill._id.toString() === payment._id.toString());
        if (existingUpdate) {
          existingUpdate.amountApplied += amountToApply;
          const totalApplied = (payment.amount || 0) + existingUpdate.amountApplied;
          existingUpdate.newStatus = totalApplied < expectedAmount ? 'partial' : totalApplied === expectedAmount ? 'completed' : 'overpaid';
        } else {
          updatedBills.push({
            bill: payment,
            amountApplied: amountToApply,
            newStatus
          });
        }

        console.log(`  ✓ Applying remaining KSH ${amountToApply} to ${payment.forMonth}/${payment.forYear}`);
        remainingAmount = 0;
      }

      // Determine overall payment status for the transaction record
      let paymentStatus: 'pending' | 'partial' | 'completed' | 'overpaid' = 'completed';
      const allBillsPaid = updatedBills.every(u => u.newStatus === 'completed' || u.newStatus === 'overpaid');
      if (!allBillsPaid) {
        paymentStatus = 'partial';
      }

      // Apply updates to all affected bills
      for (const update of updatedBills) {
        const newTotalPaid = (update.bill.amount || 0) + update.amountApplied;
        
        await PaymentHistoryModel.findByIdAndUpdate(update.bill._id, {
          $set: {
            amount: newTotalPaid,
            status: update.newStatus,
            notes: update.bill.notes 
              ? `${update.bill.notes} | Payment of ${update.amountApplied} received on ${new Date().toDateString()}`
              : `Payment of ${update.amountApplied} received on ${new Date().toDateString()}`
          }
        });

        console.log(`  📝 Updated bill ${update.bill.forMonth}/${update.bill.forYear}: Total now ${newTotalPaid}, Status: ${update.newStatus}`);
      }

      // Create a transaction record for this payment (for receipt purposes)
      const billsAffected = updatedBills.map(u => `${u.bill.forMonth}/${u.bill.forYear}`).join(', ');
      await this.createPaymentHistory({
        tenantId: payment.tenantId.toString(),
        landlordId: payment.landlordId.toString(),
        propertyId: payment.propertyId.toString(),
        amount: amountPaid,
        paymentDate: new Date(),
        forMonth: payment.forMonth,
        forYear: payment.forYear,
        monthlyRent: payment.monthlyRent,
        paymentMethod,
        status: paymentStatus,
        notes: `Payment transaction for ${payment.forMonth}/${payment.forYear} (Applied to: ${billsAffected})`,
        utilityCharges: payment.utilityCharges,
        totalUtilityCost: payment.totalUtilityCost,
      });

      console.log(`✅ Payment of KSH ${amountPaid} processed successfully`);
      console.log(`   Method: ${paymentMethod}, Applied to ${updatedBills.length} bill(s): ${billsAffected}`);

      // Get tenant info for activity log
      const tenant = await TenantModel.findById(payment.tenantId);
      
      // Calculate total remaining balance across all unpaid bills
      const remainingBills = await PaymentHistoryModel.find({
        tenantId: tenantIdStr,
        status: { $in: ['pending', 'partial'] },
        notes: { $not: /Payment transaction/ }
      });
      
      const totalRemainingBalance = remainingBills.reduce((sum, bill) => {
        const expected = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const paid = bill.amount || 0;
        return sum + (expected - paid);
      }, 0);
      
      // Log payment activity for LANDLORD
      if (tenant && tenant.apartmentInfo?.landlordId) {
        const allPaid = totalRemainingBalance === 0;
        await logActivity(createActivityLog(
          tenant.apartmentInfo.landlordId.toString(),
          allPaid ? 'payment_received' : 'debt_created',
          allPaid ? 'Payment Received' : 'Payment Received',
          `${tenant.fullName} paid KSH ${amountPaid.toLocaleString()}${allPaid ? ' - All bills cleared' : ` - ${updatedBills.length} bill(s) updated`}`,
          {
            tenantId: tenant._id?.toString(),
            tenantName: tenant.fullName,
            propertyId: tenant.apartmentInfo.propertyId?.toString() || undefined,
            propertyName: tenant.apartmentInfo.propertyName || undefined,
            paymentId: payment._id?.toString(),
            amount: amountPaid,
            unitNumber: tenant.apartmentInfo.unitNumber || undefined,
          },
          allPaid ? 'medium' : 'low'
        ));
      }

      // Log payment activity for TENANT
      const allPaid = totalRemainingBalance === 0;
      await logTenantActivity(createTenantActivityLog(
        payment.tenantId.toString(),
        allPaid ? 'payment_processed' : 'partial_payment_received',
        allPaid ? 'Payment Confirmed - All Clear' : 'Payment Received',
        allPaid 
          ? `Your payment of KSH ${amountPaid.toLocaleString()} has been processed. All bills are now paid!`
          : `Payment of KSH ${amountPaid.toLocaleString()} received and applied to ${updatedBills.length} bill(s). Remaining balance: KSH ${totalRemainingBalance.toLocaleString()}`,
        {
          landlordId: payment.landlordId.toString(),
          propertyId: payment.propertyId.toString(),
          paymentId: payment._id?.toString(),
          amount: amountPaid,
        },
        allPaid ? 'medium' : 'low'
      ));

      // Rent cycle will show this month as paid only if status is 'completed'
      return true;
    } catch (error) {
      console.error('Error processing tenant payment:', error);
      throw error;
    }
  }

  async updatePropertyRentSettings(propertyId: string, paymentDay: number, gracePeriodDays: number = 3): Promise<boolean> {
    try {
      const result = await PropertyModel.findByIdAndUpdate(
        propertyId,
        {
          $set: {
            'rentSettings.paymentDay': paymentDay,
            'rentSettings.gracePeriodDays': gracePeriodDays
          }
        },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Error updating property rent settings:', error);
      throw error;
    }
  }

  async updateTenantRentStatus(tenantId: string): Promise<any> {
    try {
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get property to find payment day and grace period
      const property = await PropertyModel.findById(tenant.apartmentInfo?.propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const paymentDay = 1; // Default payment day
      const gracePeriodDays = 3; // Default grace period

      // Provide default rent status since the functionality is incomplete
      const currentStatus = {
        rentStatus: 'active',
        daysRemaining: 30,
        nextDueDate: new Date(),
        lastPaymentDate: undefined
      };

      // Update tenant with current status
      await TenantModel.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            // Skip rentCycle update since it doesn't exist in schema
            status: 'active' // Default to active
          }
        }
      );

      return currentStatus;
    } catch (error) {
      console.error('Error updating tenant rent status:', error);
      throw error;
    }
  }

  // Payment History Methods
  async createPaymentHistory(paymentHistory: InsertPaymentHistory): Promise<PaymentHistory> {
    try {
      const payment = new PaymentHistoryModel(paymentHistory);
      const saved = await payment.save();
      
      console.log(`💾 Payment history saved:`, saved);
      
      return {
        _id: saved._id.toString(),
        tenantId: saved.tenantId.toString(),
        landlordId: saved.landlordId.toString(),
        propertyId: saved.propertyId.toString(),
        amount: saved.amount,
        paymentDate: saved.paymentDate,
        forMonth: saved.forMonth,
        forYear: saved.forYear,
        monthlyRent: saved.monthlyRent,
        paymentMethod: saved.paymentMethod || 'Not specified',
        status: saved.status || 'completed',
        notes: saved.notes || undefined,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      console.error('Error creating payment history:', error);
      throw error;
    }
  }

  async getPaymentHistory(tenantId: string): Promise<PaymentHistory[]> {
    try {
      // Get tenant information first
      const tenant = await TenantModel.findById(tenantId).lean();
      
      // Get ALL payment records including bills and transactions
      const payments = await PaymentHistoryModel.find({ tenantId })
        .populate('propertyId', 'name')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        // When using lean() with populate(), the populated data replaces the original ID
        const property = payment.propertyId as any;
        
        return {
          _id: payment._id.toString(),
          tenantId: payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: property._id ? property._id.toString() : payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: (payment as any).utilityCharges || [],
          totalUtilityCost: (payment as any).totalUtilityCost || 0,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenantId,
            id: tenantId,
            name: tenant?.fullName || 'Unknown Tenant'
          },
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(), // Add id field for consistency
            name: property.name || 'Unknown Property'
          },
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  async getPaymentHistoryByLandlord(landlordId: string): Promise<PaymentHistory[]> {
    try {
      const payments = await PaymentHistoryModel.find({ landlordId })
        .populate('tenantId', 'fullName email')
        .populate('propertyId', 'name')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        // When using lean() with populate(), the populated data replaces the original ID
        const tenant = payment.tenantId as any;
        const property = payment.propertyId as any;
        
        return {
          _id: payment._id.toString(),
          tenantId: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: property._id ? property._id.toString() : payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: payment.utilityCharges || [],
          totalUtilityCost: payment.totalUtilityCost || 0,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(), 
            name: tenant.fullName || 'Unknown Tenant'
          },
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(),
            name: property.name || 'Unknown Property'
          },
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting landlord payment history:', error);
      return [];
    }
  }

  async getPaymentHistoryByProperty(propertyId: string): Promise<PaymentHistory[]> {
    try {
      const payments = await PaymentHistoryModel.find({ propertyId })
        .populate('tenantId', 'fullName email')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        return {
          _id: payment._id.toString(),
          tenantId: payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: payment.utilityCharges || [],
          totalUtilityCost: payment.totalUtilityCost || 0,
          createdAt: payment.createdAt,
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting property payment history:', error);
      return [];
    }
  }

  // Monthly Billing Methods


  async createPaymentPlan(paymentPlan: any): Promise<string> {
    try {
    
      const tenantDoc = await TenantModel.findById(paymentPlan.tenantId);
      if (!tenantDoc) {
        throw new Error('Tenant not found');
      }

      const planId = new ObjectId().toString();
      
      // Add payment plan to tenant's record
      await TenantModel.updateOne(
        { _id: new ObjectId(paymentPlan.tenantId) },
        { 
          $push: { 
            paymentPlans: {
              ...paymentPlan,
              _id: planId,
              createdAt: new Date()
            }
          }
        }
      );

      return planId;
    } catch (error) {
      console.error('Error creating payment plan:', error);
      throw error;
    }
  }

  /**
   * Record collection action
   */
  async recordCollectionAction(collectionAction: any): Promise<string> {
    try {
      const actionId = new ObjectId().toString();
      
      // Store collection actions as part of tenant data
      await TenantModel.updateOne(
        { _id: new ObjectId(collectionAction.tenantId) },
        { 
          $push: { 
            collectionActions: {
              ...collectionAction,
              _id: actionId,
              recordedAt: new Date()
            }
          }
        }
      );

      return actionId;
    } catch (error) {
      console.error('Error recording collection action:', error);
      throw error;
    }
  }

  /**
   * Get recorded months for a tenant in a specific year
   * Returns an array of month numbers (1-12) that have payment records
   */
  async getRecordedMonthsForTenant(tenantId: string, year: number): Promise<number[]> {
    try {
      const payments = await PaymentHistoryModel.find({
        tenantId,
        forYear: year
      }).lean();

      // Extract unique months and sort them
      const monthsSet = new Set(payments.map(p => p.forMonth));
      const months = Array.from(monthsSet).sort((a, b) => a - b);
      return months;
    } catch (error) {
      console.error('Error getting recorded months for tenant:', error);
      return [];
    }
  }

  /**
   * Delete a payment history record
   * Used to remove corrupted or incorrect payment records
   */
  async deletePaymentHistory(paymentId: string): Promise<boolean> {
    try {
      if (!isValidObjectId(paymentId)) {
        console.log('Invalid ObjectId format for payment ID:', paymentId);
        return false;
      }

      const result = await PaymentHistoryModel.deleteOne({ _id: paymentId });
      console.log(`🗑️ Deleted payment record: ${paymentId}`);
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting payment history:', error);
      return false;
    }
  }
}

export const storage = new MongoStorage();
