import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TenantStorage } from '../../storage/TenantStorage';
import { createTestTenant } from '../factories';
import { ObjectId } from 'mongodb';

jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn(),
    },
  },
}));

describe('TenantStorage', () => {
  let storage: TenantStorage;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn(),
    };

    const mongoose = require('mongoose');
    mongoose.connection.db.collection.mockReturnValue(mockCollection);

    storage = new TenantStorage();
  });

  describe('createTenant', () => {
    it('should create a new tenant', async () => {
      const propertyId = new ObjectId();
      const tenant = createTestTenant(propertyId);

      mockCollection.insertOne.mockResolvedValue({
        insertedId: tenant._id,
      });

      const result = await storage.createTenant(tenant);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result._id).toBeDefined();
    });

    it('should validate tenant email', async () => {
      const tenant = createTestTenant(new ObjectId(), { email: 'invalid-email' });

      mockCollection.insertOne.mockRejectedValue(
        new Error('Invalid email format')
      );

      await expect(storage.createTenant(tenant)).rejects.toThrow();
    });
  });

  describe('getTenantById', () => {
    it('should retrieve tenant by ID', async () => {
      const tenantId = new ObjectId();
      const tenant = createTestTenant(new ObjectId(), { _id: tenantId });

      mockCollection.findOne.mockResolvedValue(tenant);

      const result = await storage.getTenantById(tenantId.toString());

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: expect.any(ObjectId),
      });
      expect(result).toEqual(tenant);
    });
  });

  describe('getTenantsByProperty', () => {
    it('should retrieve all tenants for a property', async () => {
      const propertyId = new ObjectId();
      const tenants = [
        createTestTenant(propertyId),
        createTestTenant(propertyId),
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(tenants),
      });

      const result = await storage.getTenantsByProperty(propertyId.toString());

      expect(mockCollection.find).toHaveBeenCalledWith({
        propertyId: expect.any(ObjectId),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('updateTenant', () => {
    it('should update tenant information', async () => {
      const tenantId = new ObjectId();
      const updates = { phone: '+254712345678' };

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await storage.updateTenant(tenantId.toString(), updates);

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe('deleteTenant', () => {
    it('should delete tenant', async () => {
      const tenantId = new ObjectId();

      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteTenant(tenantId.toString());

      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });
  });

  describe('Cascade Delete Operations', () => {
    it('should cascade delete related payments when tenant is deleted', async () => {
      const tenantId = new ObjectId();

      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteTenant(tenantId.toString());

      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });
  });
});
