import { type Property, type InsertProperty, type TenantProperty } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel } from "../database";
import { logTenantActivity, createTenantActivityLog } from "../controllers/tenantActivityController";

// Helper function to validate ObjectId format
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * PropertyStorage - Handles all property-related database operations
 * Scope: Property CRUD, property search, property utilities management
 * Collections: Property, Landlord (for properties array)
 * Dependencies: TenantModel (for utility change notifications)
 */
export class PropertyStorage {
  /**
   * Get property by ID
   */
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

  /**
   * Get all properties for a landlord
   */
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

  /**
   * Create new property
   * Also adds property to landlord's properties array
   */
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

  /**
   * Update property
   * Notifies tenants if utilities change
   */
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

  /**
   * Search properties by name
   * Case-insensitive regex search
   */
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

  /**
   * Get tenant property details
   * Returns both property and tenant apartment info
   */
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

      // Get landlord information
      const landlordId = tenant.apartmentInfo.landlordId || property?.landlordId;
      let landlordInfo = null;
      if (landlordId) {
        const landlord = await LandlordModel.findById(landlordId).select('fullName email phone company').lean();
        if (landlord) {
          landlordInfo = {
            id: landlord._id.toString(),
            fullName: landlord.fullName,
            email: landlord.email,
            phone: landlord.phone,
            company: landlord.company,
          };
        }
        console.log('Found landlord info:', landlordInfo);
      }

      // Note: rentCycle would be populated by RentCycleStorage
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
        landlord: landlordInfo,
        // rentCycle is populated by caller (RentCycleStorage)
      };

      console.log('Returning tenant property result:', result);
      return result as TenantProperty;
    } catch (error) {
      console.error('Error getting tenant property:', error);
      return undefined;
    }
  }
}

export const propertyStorage = new PropertyStorage();
