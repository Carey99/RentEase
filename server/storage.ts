import { type User, type InsertUser, type Property, type InsertProperty, type TenantProperty, type InsertTenantProperty, type Landlord, type Tenant, type InsertLandlord, type InsertTenant } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel } from "./database";
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
        id: property._id.toString(),
        landlordId: property.landlordId.toString(),
        name: property.name,
        propertyTypes: property.propertyTypes || [],
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
        id: saved._id.toString(),
        landlordId: saved.landlordId.toString(),
        name: saved.name,
        propertyTypes: saved.propertyTypes,
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
        id: updatedProperty._id.toString(),
        landlordId: updatedProperty.landlordId.toString(),
        name: updatedProperty.name,
        propertyTypes: updatedProperty.propertyTypes,
        utilities: updatedProperty.utilities,
        totalUnits: updatedProperty.totalUnits,
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
        rentAmount: tenant.apartmentInfo.rentAmount,
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
      }; console.log('Returning tenant property result:', result);
      return result;
    } catch (error) {
      console.error('Error getting tenant property:', error);
      return undefined;
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
  } async getTenantsByProperty(propertyId: string): Promise<TenantProperty[]> {
    try {
      const tenants = await TenantModel.find({
        'apartmentInfo.propertyId': propertyId
      }).lean();

      return tenants.map(tenant => ({
        _id: tenant._id.toString(),
        tenantId: tenant._id.toString(),
        propertyId: propertyId,
        propertyType: tenant.apartmentInfo?.propertyType || '',
        unitNumber: tenant.apartmentInfo?.unitNumber || '',
        rentAmount: tenant.apartmentInfo?.rentAmount,
        createdAt: tenant.createdAt,
      }));
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

      return tenants.map(tenant => ({
        id: tenant._id.toString(),
        name: tenant.fullName,
        email: tenant.email,
        phone: tenant.apartmentInfo?.unitNumber || '', // For now, using unitNumber as phone placeholder
        propertyId: tenant.apartmentInfo?.propertyId?.toString() || '',
        propertyName: tenant.apartmentInfo?.propertyName || '',
        unitType: tenant.apartmentInfo?.propertyType || '',
        rentAmount: tenant.apartmentInfo?.rentAmount ? parseInt(tenant.apartmentInfo.rentAmount) : 0,
        status: 'active' as const, // Default to active, you can add status field to schema later
        leaseStart: tenant.createdAt?.toISOString().split('T')[0] || '',
        leaseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 year lease
        avatar: '', // Can be added to schema later
      }));
    } catch (error) {
      console.error('Error getting tenants by landlord:', error);
      return [];
    }
  }
}

export const storage = new MongoStorage();
