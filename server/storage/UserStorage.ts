import { type User, type InsertUser } from "@shared/schema";
import { Landlord as LandlordModel, Tenant as TenantModel } from "../database";
import bcrypt from 'bcryptjs';

// Helper function to validate ObjectId format
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * UserStorage - Handles all user-related database operations
 * Scope: User creation, authentication, password management
 * Collections: Landlord, Tenant
 */
export class UserStorage {
  /**
   * Get user by ID
   * Searches in both landlords and tenants collections
   */
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

  /**
   * Get user by email
   * Searches in both landlords and tenants collections
   */
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

  /**
   * Create new user (landlord or tenant)
   * Hashes password before saving
   */
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Hash password before saving
      const hashedPassword = await bcrypt.hash(insertUser.password, 10);
      
      if (insertUser.role === 'landlord') {
        const landlord = new LandlordModel({
          fullName: insertUser.fullName,
          email: insertUser.email,
          password: hashedPassword,
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
          password: hashedPassword,
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

  /**
   * Change landlord password
   * Verifies current password before updating
   */
  async changeLandlordPassword(
    landlordId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
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

  /**
   * Change tenant password
   * Verifies current password before updating
   */
  async changeTenantPassword(
    tenantId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
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
}

export const userStorage = new UserStorage();
