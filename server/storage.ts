import { type User, type InsertUser, type Property, type InsertProperty, type TenantProperty, type InsertTenantProperty, type Landlord, type Tenant, type InsertLandlord, type InsertTenant, type PaymentHistory, type InsertPaymentHistory, type MonthlyBalance, type InsertMonthlyBalance, type MonthlyBill, type InsertMonthlyBill, type UtilityUsage } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel, MonthlyBalance as MonthlyBalanceModel, MonthlyBill as MonthlyBillModel } from "./database";
import { ObjectId } from "mongodb";

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
  deleteTenant(tenantId: string): Promise<boolean>; // Remove tenant and their credentials
  
  // Landlord settings operations
  getLandlordSettings(landlordId: string): Promise<any>;
  updateLandlordSettings(landlordId: string, updates: any): Promise<any>;
  
  // Password operations
  changeLandlordPassword(landlordId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  // Rent cycle operations
  recordTenantPayment(tenantId: string, paymentAmount: number, paymentDate?: Date): Promise<boolean>;
  updatePropertyRentSettings(propertyId: string, paymentDay: number, gracePeriodDays?: number): Promise<boolean>;
  updateTenantRentStatus(tenantId: string): Promise<any>;
  
  // Payment History methods
  createPaymentHistory(paymentHistory: InsertPaymentHistory): Promise<PaymentHistory>;
  getPaymentHistory(tenantId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByLandlord(landlordId: string): Promise<PaymentHistory[]>;
  getPaymentHistoryByProperty(propertyId: string): Promise<PaymentHistory[]>;
  
  // Monthly Billing methods
  createMonthlyBill(bill: InsertMonthlyBill): Promise<MonthlyBill>;
  getMonthlyBill(tenantId: string, month: number, year: number): Promise<MonthlyBill | undefined>;
  getMonthlyBillsByLandlord(landlordId: string, month?: number, year?: number): Promise<MonthlyBill[]>;
  getMonthlyBillsByTenant(tenantId: string): Promise<MonthlyBill[]>;
  updateMonthlyBillStatus(billId: string, status: string): Promise<boolean>;
  getTenantsToBill(landlordId: string, month: number, year: number): Promise<any[]>;
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

      const updatedProperty = await PropertyModel.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      ).lean();

      if (!updatedProperty) {
        return undefined;
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
          totalUnits: property.totalUnits,
          occupiedUnits: property.occupiedUnits,
          createdAt: property.createdAt,
        } : undefined,
        // Include rent cycle data
        rentCycle: await this.getRentCycleForTenant(tenant, property)
      }; console.log('Returning tenant property result:', result);
      return result;
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

      // Get tenant's stored rent cycle data for last payment date
      const tenantRentCycle = (tenant as any).rentCycle || {};
      const lastPaymentDate = tenantRentCycle.lastPaymentDate;
      const rentAmount = tenant.apartmentInfo?.rentAmount ? parseInt(tenant.apartmentInfo.rentAmount) : 0;
      console.log(`  💰 Last payment date: ${lastPaymentDate}, Rent amount: ${rentAmount}`);

      // Always recalculate with advance payment logic - get total amount paid by tenant
      let totalAmountPaid = 0;
      try {
        const tenantPayments = await PaymentHistoryModel.find({ 
          tenantId: tenant._id,
          status: { $in: ['completed', 'partial', 'overpaid'] }
        }).lean();
        totalAmountPaid = tenantPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        console.log(`  💳 Total amount paid: ${totalAmountPaid}`);
      } catch (error) {
        console.error(`❌ Error getting payment history for tenant: ${tenant._id}`, error);
      }

      // Always use RentCycleService for proper advance payment calculations
      const { RentCycleService } = await import('./services/rentCycleService');
      const cycleData = RentCycleService.getCurrentRentCycleStatus(
        lastPaymentDate,
        rentSettings.paymentDay,
        rentSettings.gracePeriodDays,
        rentAmount,
        totalAmountPaid
      );
      console.log(`  📊 Calculated cycle data:`, cycleData);

      return {
        lastPaymentDate: cycleData.lastPaymentDate?.toISOString(),
        nextDueDate: cycleData.nextDueDate.toISOString(),
        daysRemaining: cycleData.daysRemaining,
        rentStatus: cycleData.rentStatus,
        advancePaymentDays: cycleData.advancePaymentDays,
        advancePaymentMonths: cycleData.advancePaymentMonths,
        debtAmount: cycleData.debtAmount,
        monthsOwed: cycleData.monthsOwed,
      };
    } catch (error) {
      console.error('Error calculating rent cycle:', error);
      return {
        lastPaymentDate: null,
        nextDueDate: new Date().toISOString(),
        daysRemaining: -999,
        rentStatus: 'overdue'
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
  } async getTenantsByProperty(propertyId: string): Promise<any[]> {
    try {
      // Get the property first to get rent settings
      const property = await PropertyModel.findById(propertyId).lean();
      const rentSettings = { 
        paymentDay: (property as any)?.rentSettings?.paymentDay || 1, 
        gracePeriodDays: (property as any)?.rentSettings?.gracePeriodDays || 3 
      };

      const tenants = await TenantModel.find({
        'apartmentInfo.propertyId': propertyId
      }).lean();

      // Import RentCycleService for calculations
      const { RentCycleService } = await import('./services/rentCycleService');

      return tenants.map(tenant => {
        // Calculate rent cycle status using tenant's actual data
        const tenantRentCycle = (tenant as any).rentCycle || {};
        const lastPaymentDate = tenantRentCycle.lastPaymentDate;
        
        const cycleData = RentCycleService.getCurrentRentCycleStatus(
          lastPaymentDate,
          rentSettings.paymentDay,
          rentSettings.gracePeriodDays
        );

        return {
          id: tenant._id.toString(),
          fullName: tenant.fullName,
          email: tenant.email,
          apartmentInfo: {
            unitNumber: tenant.apartmentInfo?.unitNumber || '',
            rentAmount: tenant.apartmentInfo?.rentAmount || '0',
          },
          rentCycle: {
            rentStatus: cycleData.rentStatus,
            daysRemaining: cycleData.daysRemaining,
            nextDueDate: cycleData.nextDueDate,
            lastPaymentDate: cycleData.lastPaymentDate,
          }
        };
      });
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
            const rentSettings = { 
              paymentDay: (property as any)?.rentSettings?.paymentDay || 1, 
              gracePeriodDays: (property as any)?.rentSettings?.gracePeriodDays || 3 
            };
            console.log(`  ⚙️  Rent settings:`, rentSettings);
            
            // Get tenant's rent cycle data or use defaults
            const tenantRentCycle = (tenant as any).rentCycle || {};
            const lastPaymentDate = tenantRentCycle.lastPaymentDate;
            const rentAmount = tenant.apartmentInfo?.rentAmount ? parseInt(tenant.apartmentInfo.rentAmount) : 0;
            console.log(`  💰 Last payment date: ${lastPaymentDate}, Rent amount: ${rentAmount}`);
            
            // Get total amount paid by tenant to calculate advance payments
            let totalAmountPaid = 0;
            try {
              const tenantPayments = await PaymentHistoryModel.find({ 
                tenantId: tenant._id,
                status: { $in: ['completed', 'partial', 'overpaid'] }
              }).lean();
              totalAmountPaid = tenantPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
              console.log(`  💳 Total amount paid: ${totalAmountPaid}`);
            } catch (error) {
              console.error(`❌ Error getting payment history for tenant: ${tenant._id}`, error);
            }
            
            // Import and use RentCycleService for proper calculations
            const { RentCycleService } = await import('./services/rentCycleService');
            const cycleData = RentCycleService.getCurrentRentCycleStatus(
              lastPaymentDate,
              rentSettings.paymentDay,
              rentSettings.gracePeriodDays,
              rentAmount,
              totalAmountPaid
            );
            console.log(`  📊 Calculated cycle data:`, cycleData);
            
            rentCycle = {
              rentStatus: cycleData.rentStatus,
              daysRemaining: cycleData.daysRemaining,
              nextDueDate: cycleData.nextDueDate,
              lastPaymentDate: cycleData.lastPaymentDate,
              advancePaymentDays: cycleData.advancePaymentDays,
              advancePaymentMonths: cycleData.advancePaymentMonths,
              debtAmount: cycleData.debtAmount,
              monthsOwed: cycleData.monthsOwed,
            };
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
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) return false;

      // Removes the tenant from their property's tenant array if they have apartmentInfo
      if (tenant.apartmentInfo?.propertyId) {
        await PropertyModel.updateOne(
          { _id: tenant.apartmentInfo.propertyId },
          { $pull: { tenants: tenantId } }
        );
      }

      // Delete the tenant document
      const result = await TenantModel.deleteOne({ _id: tenantId });
      return result.deletedCount === 1;

    } catch (error) {
      console.error('Error deleting tenant:', error);
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
      const updateData: any = {};
      
      if (updates.profile) {
        Object.assign(updateData, updates.profile);
      }
      
      if (updates.notifications || updates.preferences) {
        updateData.settings = {
          ...updates.notifications,
          ...updates.preferences
        };
      }

      const updatedLandlord = await LandlordModel.findByIdAndUpdate(
        landlordId,
        { $set: updateData },
        { new: true }
      ).lean();

      return this.getLandlordSettings(landlordId);
    } catch (error) {
      console.error('Error updating landlord settings:', error);
      throw error;
    }
  }

  async changeLandlordPassword(landlordId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // verifies the current password
      const landlord = await LandlordModel.findById(landlordId).lean();
      if (!landlord) {
        throw new Error('Landlord not found');
      }

      if (landlord.password !== currentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update with new password
      const result = await LandlordModel.findByIdAndUpdate(
        landlordId,
        { $set: { password: newPassword } },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Error changing landlord password:', error);
      throw error;
    }
  }

  async recordTenantPayment(tenantId: string, paymentAmount: number, paymentDate: Date = new Date()): Promise<boolean> {
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

      // Get monthly rent amount from tenant's apartment info
      const monthlyRentAmount = parseFloat(tenant.apartmentInfo?.rentAmount || '0');
      if (monthlyRentAmount <= 0) {
        throw new Error('Invalid rent amount for tenant');
      }

      // Use PaymentBalanceService to process the payment
      const { PaymentBalanceService } = await import('./services/paymentBalanceService');
      const paymentResult = await PaymentBalanceService.processPayment(
        tenantId,
        tenant.apartmentInfo?.landlordId?.toString() || '',
        tenant.apartmentInfo?.propertyId?.toString() || '',
        paymentAmount,
        paymentDate,
        monthlyRentAmount
      );

      console.log(`💰 Recording payment for tenant ${tenantId}: $${paymentAmount} on ${paymentDate.toDateString()}`);
      console.log('📊 Payment result:', paymentResult.paymentDetails);

      // Create payment history record with intelligent status
      await this.createPaymentHistory({
        ...paymentResult.paymentDetails,
        paymentMethod: 'Manual Payment',
        notes: `Rent payment of $${paymentAmount}${paymentResult.paymentDetails.status === 'overpaid' ? ' (includes credit for future months)' : paymentResult.paymentDetails.status === 'partial' ? ' (partial payment)' : ''}`
      } as any);

      // Update tenant rent cycle based on payment status  
      // Use property rent settings or defaults
      const paymentDay = (property as any).rentSettings?.paymentDay || 1;
      const gracePeriodDays = (property as any).rentSettings?.gracePeriodDays || 3;

      // Import and use RentCycleService to calculate proper rent cycle
      const { RentCycleService } = await import('./services/rentCycleService');
      const newRentCycle = RentCycleService.processPayment(paymentDay, gracePeriodDays, paymentDate);

      // Update tenant with new rent cycle data and set status based on payment completeness
      const tenantStatus = paymentResult.paymentDetails.status === 'completed' ? 'active' : 
                          paymentResult.paymentDetails.status === 'overpaid' ? 'active' : 'active'; // Keep active, rent cycle status will handle overdue

      const result = await TenantModel.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            'rentCycle.lastPaymentDate': newRentCycle.lastPaymentDate,
            'rentCycle.nextDueDate': newRentCycle.nextDueDate,
            'rentCycle.daysRemaining': newRentCycle.daysRemaining,
            'rentCycle.rentStatus': newRentCycle.rentStatus,
            status: tenantStatus
          }
        },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Error recording tenant payment:', error);
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
        paymentMethod: saved.paymentMethod || 'Not specified',
        status: saved.status || 'completed',
        notes: saved.notes || undefined,
        forMonth: saved.forMonth,
        forYear: saved.forYear,
        monthlyRentAmount: saved.monthlyRentAmount,
        appliedAmount: saved.appliedAmount,
        creditAmount: saved.creditAmount || 0,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      console.error('Error creating payment history:', error);
      throw error;
    }
  }

  async getPaymentHistory(tenantId: string): Promise<PaymentHistory[]> {
    try {
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
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes,
          createdAt: payment.createdAt,
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(), // Add id field for consistency
            name: property.name || 'Unknown Property'
          },
        };
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
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(), // Add id field for consistency
            name: tenant.fullName || 'Unknown Tenant'
          },
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(), // Add id field for consistency
            name: property.name || 'Unknown Property'
          },
        };
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

      return payments.map(payment => ({
        _id: payment._id.toString(),
        tenantId: payment.tenantId.toString(),
        landlordId: payment.landlordId.toString(),
        propertyId: payment.propertyId.toString(),
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Not specified',
        notes: payment.notes,
        createdAt: payment.createdAt,
      }));
    } catch (error) {
      console.error('Error getting property payment history:', error);
      return [];
    }
  }

  // Monthly Billing Methods
  async createMonthlyBill(bill: InsertMonthlyBill): Promise<MonthlyBill> {
    try {
      const monthlyBill = new MonthlyBillModel(bill);
      const saved = await monthlyBill.save();
      
      return {
        _id: saved._id.toString(),
        tenantId: saved.tenantId.toString(),
        landlordId: saved.landlordId.toString(),
        propertyId: saved.propertyId.toString(),
        billMonth: saved.billMonth,
        billYear: saved.billYear,
        rentAmount: saved.rentAmount,
        lineItems: saved.lineItems.map(item => ({
          description: item.description,
          type: item.type as 'rent' | 'utility' | 'fee' | 'other',
          amount: item.amount,
          utilityUsage: item.utilityUsage ? {
            utilityType: item.utilityUsage.utilityType,
            unitsUsed: item.utilityUsage.unitsUsed,
            pricePerUnit: item.utilityUsage.pricePerUnit,
            totalAmount: item.utilityUsage.totalAmount
          } : undefined
        })),
        totalAmount: saved.totalAmount,
        status: saved.status as 'generated' | 'sent' | 'paid' | 'overdue',
        generatedDate: saved.generatedDate,
        dueDate: saved.dueDate,
        paidDate: saved.paidDate,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      console.error('Error creating monthly bill:', error);
      throw error;
    }
  }

  async getMonthlyBill(tenantId: string, month: number, year: number): Promise<MonthlyBill | undefined> {
    try {
      const bill = await MonthlyBillModel.findOne({
        tenantId,
        billMonth: month,
        billYear: year
      }).lean();
      
      if (!bill) return undefined;
      
      return {
        _id: bill._id.toString(),
        tenantId: bill.tenantId.toString(),
        landlordId: bill.landlordId.toString(),
        propertyId: bill.propertyId.toString(),
        billMonth: bill.billMonth,
        billYear: bill.billYear,
        rentAmount: bill.rentAmount,
        lineItems: bill.lineItems.map(item => ({
          description: item.description,
          type: item.type as 'rent' | 'utility' | 'fee' | 'other',
          amount: item.amount,
          utilityUsage: item.utilityUsage ? {
            utilityType: item.utilityUsage.utilityType,
            unitsUsed: item.utilityUsage.unitsUsed,
            pricePerUnit: item.utilityUsage.pricePerUnit,
            totalAmount: item.utilityUsage.totalAmount
          } : undefined
        })),
        totalAmount: bill.totalAmount,
        status: bill.status as 'generated' | 'sent' | 'paid' | 'overdue',
        generatedDate: bill.generatedDate,
        dueDate: bill.dueDate,
        paidDate: bill.paidDate,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };
    } catch (error) {
      console.error('Error getting monthly bill:', error);
      return undefined;
    }
  }

  async getMonthlyBillsByLandlord(landlordId: string, month?: number, year?: number): Promise<MonthlyBill[]> {
    try {
      const query: any = { landlordId };
      if (month) query.billMonth = month;
      if (year) query.billYear = year;
      
      const bills = await MonthlyBillModel.find(query)
        .populate('tenantId', 'fullName email')
        .populate('propertyId', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return bills.map(bill => ({
        _id: bill._id.toString(),
        tenantId: bill.tenantId.toString(),
        landlordId: bill.landlordId.toString(),
        propertyId: bill.propertyId.toString(),
        billMonth: bill.billMonth,
        billYear: bill.billYear,
        rentAmount: bill.rentAmount,
        lineItems: bill.lineItems.map(item => ({
          description: item.description,
          type: item.type as 'rent' | 'utility' | 'fee' | 'other',
          amount: item.amount,
          utilityUsage: item.utilityUsage ? {
            utilityType: item.utilityUsage.utilityType,
            unitsUsed: item.utilityUsage.unitsUsed,
            pricePerUnit: item.utilityUsage.pricePerUnit,
            totalAmount: item.utilityUsage.totalAmount
          } : undefined
        })),
        totalAmount: bill.totalAmount,
        status: bill.status as 'generated' | 'sent' | 'paid' | 'overdue',
        generatedDate: bill.generatedDate,
        dueDate: bill.dueDate,
        paidDate: bill.paidDate,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting monthly bills by landlord:', error);
      return [];
    }
  }

  async getMonthlyBillsByTenant(tenantId: string): Promise<MonthlyBill[]> {
    try {
      const bills = await MonthlyBillModel.find({ tenantId })
        .populate('propertyId', 'name')
        .sort({ billYear: -1, billMonth: -1 })
        .lean();

      return bills.map(bill => ({
        _id: bill._id.toString(),
        tenantId: bill.tenantId.toString(),
        landlordId: bill.landlordId.toString(),
        propertyId: bill.propertyId.toString(),
        billMonth: bill.billMonth,
        billYear: bill.billYear,
        rentAmount: bill.rentAmount,
        lineItems: bill.lineItems.map(item => ({
          description: item.description,
          type: item.type as 'rent' | 'utility' | 'fee' | 'other',
          amount: item.amount,
          utilityUsage: item.utilityUsage ? {
            utilityType: item.utilityUsage.utilityType,
            unitsUsed: item.utilityUsage.unitsUsed,
            pricePerUnit: item.utilityUsage.pricePerUnit,
            totalAmount: item.utilityUsage.totalAmount
          } : undefined
        })),
        totalAmount: bill.totalAmount,
        status: bill.status as 'generated' | 'sent' | 'paid' | 'overdue',
        generatedDate: bill.generatedDate,
        dueDate: bill.dueDate,
        paidDate: bill.paidDate,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting monthly bills by tenant:', error);
      return [];
    }
  }

  async updateMonthlyBillStatus(billId: string, status: string): Promise<boolean> {
    try {
      const result = await MonthlyBillModel.findByIdAndUpdate(
        billId,
        { 
          status,
          ...(status === 'paid' && { paidDate: new Date() })
        },
        { new: true }
      );
      return !!result;
    } catch (error) {
      console.error('Error updating monthly bill status:', error);
      return false;
    }
  }

  async getTenantsToBill(landlordId: string, month: number, year: number): Promise<any[]> {
    try {
      // Get all tenants for this landlord
      const allTenants = await this.getTenantsByLandlord(landlordId);
      
      // Filter out tenants who already have bills for this month/year
      const existingBills = await MonthlyBillModel.find({
        landlordId,
        billMonth: month,
        billYear: year
      }).lean();
      
      const billedTenantIds = existingBills.map(bill => bill.tenantId.toString());
      
      return allTenants.filter(tenant => !billedTenantIds.includes(tenant.id));
    } catch (error) {
      console.error('Error getting tenants to bill:', error);
      return [];
    }
  }
}

export const storage = new MongoStorage();
