import { type Tenant, type InsertTenant } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel, ActivityLog as ActivityLogModel, TenantActivityLog as TenantActivityLogModel } from "../database";
import { ObjectId } from "mongodb";

// Helper function to validate ObjectId format
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * TenantStorage - Handles all tenant-related database operations
 * Scope: Tenant CRUD, tenant queries, cascade delete, landlord settings
 * Collections: Tenant, Landlord (for settings), Property (for associations), PaymentHistory, ActivityLogs
 * Dependencies: PropertyStorage, PaymentStorage, ActivityStorage (for cascade delete)
 */
export class TenantStorage {
  /**
   * Helper method - get rent cycle data for tenant
   * Used by getTenantsByProperty and getTenantsByLandlord
   * This is a temporary placeholder - will be moved to RentCycleStorage
   */
  private async getRentCycleForTenant(tenant: any, property: any) {
    // Placeholder - actual implementation in RentCycleStorage
    return null;
  }

  /**
   * Get tenant by ID
   */
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

      return {
        _id: tenant._id.toString(),
        fullName: tenant.fullName,
        email: tenant.email,
        phone: tenant.phone || undefined,
        password: tenant.password,
        role: 'tenant' as const,
        apartmentInfo: tenant.apartmentInfo ? {
          propertyId: tenant.apartmentInfo.propertyId?.toString(),
          propertyName: tenant.apartmentInfo.propertyName || undefined,
          propertyType: tenant.apartmentInfo.propertyType || undefined,
          unitNumber: tenant.apartmentInfo.unitNumber || undefined,
          rentAmount: tenant.apartmentInfo.rentAmount || undefined,
          landlordId: tenant.apartmentInfo.landlordId?.toString(),
        } : undefined,
        rentCycle: (tenant as any).rentCycle || {},
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };

      return tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      return undefined;
    }
  }

  /**
   * Update tenant profile
   * Whitelist specific fields for security
   */
  async updateTenant(tenantId: string, updates: any): Promise<any | undefined> {
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

  /**
   * Get all tenants for a property
   * Returns tenant info with rent cycle data
   */
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

  /**
   * Get all tenants for a landlord
   * Returns tenant info with rent cycle data, organized by property
   */
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
          leaseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          avatar: '',
          rentCycle
        };
      }));

      console.log(`✅ Returning ${tenantsWithRentCycle.length} tenants with rent cycle data`);
      return tenantsWithRentCycle;
    } catch (error) {
      console.error('Error getting tenants by landlord:', error);
      return [];
    }
  }

  /**
   * Cascade delete tenant
   * Removes: tenant record, payment history, activity logs, property associations
   * CRITICAL: No data should be recoverable after this operation
   */
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

  /**
   * Get landlord settings
   */
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

  /**
   * Update landlord settings
   * Handles profile, notification, and preference updates
   */
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
}

export const tenantStorage = new TenantStorage();
