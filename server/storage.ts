import { type User, type InsertUser, type Property, type InsertProperty, type TenantProperty, type InsertTenantProperty, type Landlord, type Tenant, type InsertLandlord, type InsertTenant } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel } from "./database";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getPropertiesByLandlord(landlordId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  searchPropertiesByName(name: string): Promise<Property[]>;
  
  // Tenant property relationships
  getTenantProperty(tenantId: string): Promise<TenantProperty | undefined>;
  createTenantProperty(tenantProperty: InsertTenantProperty): Promise<TenantProperty>;
  getTenantsByProperty(propertyId: string): Promise<TenantProperty[]>;
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
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
      const property = await PropertyModel.findById(id).lean();
      if (!property) return undefined;

      return {
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        type: property.type,
        utilities: property.utilities || undefined,
        totalUnits: property.totalUnits || undefined,
        occupiedUnits: property.occupiedUnits || "0",
        createdAt: property.createdAt,
      };
    } catch (error) {
      console.error('Error getting property:', error);
      return undefined;
    }
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    try {
      const properties = await PropertyModel.find({ landlordId }).lean();
      return properties.map(property => ({
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        type: property.type,
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
        type: insertProperty.type,
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
        id: saved._id.toString(),
        landlordId: saved.landlordId.toString(),
        name: saved.name,
        type: saved.type,
        utilities: saved.utilities,
        totalUnits: saved.totalUnits,
        occupiedUnits: saved.occupiedUnits,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  async searchPropertiesByName(name: string): Promise<Property[]> {
    try {
      const properties = await PropertyModel.find({
        name: { $regex: name, $options: 'i' }
      }).lean();

      return properties.map(property => ({
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        type: property.type,
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
      const tenant = await TenantModel.findById(tenantId).populate('apartmentInfo.propertyId').lean();
      if (!tenant || !tenant.apartmentInfo) return undefined;

      const property = await PropertyModel.findById(tenant.apartmentInfo.propertyId).lean();

      return {
        _id: tenantId,
        tenantId: tenantId,
        propertyId: tenant.apartmentInfo.propertyId?.toString() || '',
        unitNumber: tenant.apartmentInfo.unitNumber || '',
        rentAmount: tenant.apartmentInfo.rentAmount,
        createdAt: tenant.createdAt,
        property: property ? {
          id: property._id.toString(),
          landlordId: property.landlordId.toString(),
          name: property.name,
          type: property.type,
          utilities: property.utilities,
          totalUnits: property.totalUnits,
          occupiedUnits: property.occupiedUnits,
          createdAt: property.createdAt,
        } : undefined,
      };
    } catch (error) {
      console.error('Error getting tenant property:', error);
      return undefined;
    }
  }

  async createTenantProperty(insertTenantProperty: InsertTenantProperty): Promise<TenantProperty> {
    try {
      // Update tenant with apartment info
      const tenant = await TenantModel.findByIdAndUpdate(
        insertTenantProperty.tenantId,
        {
          apartmentInfo: {
            propertyId: insertTenantProperty.propertyId,
            unitNumber: insertTenantProperty.unitNumber,
            rentAmount: insertTenantProperty.rentAmount,
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
        unitNumber: insertTenantProperty.unitNumber,
        rentAmount: insertTenantProperty.rentAmount,
        createdAt: tenant.createdAt,
      };
    } catch (error) {
      console.error('Error creating tenant property:', error);
      throw error;
    }
  }

  async getTenantsByProperty(propertyId: string): Promise<TenantProperty[]> {
    try {
      const tenants = await TenantModel.find({
        'apartmentInfo.propertyId': propertyId
      }).lean();

      return tenants.map(tenant => ({
        _id: tenant._id.toString(),
        tenantId: tenant._id.toString(),
        propertyId: propertyId,
        unitNumber: tenant.apartmentInfo?.unitNumber || '',
        rentAmount: tenant.apartmentInfo?.rentAmount,
        createdAt: tenant.createdAt,
      }));
    } catch (error) {
      console.error('Error getting tenants by property:', error);
      return [];
    }
  }
}

export const storage = new MongoStorage();
