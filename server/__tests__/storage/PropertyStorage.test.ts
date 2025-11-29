import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PropertyStorage } from '../../storage/PropertyStorage';
import { createTestProperty } from '../factories';
import { ObjectId } from 'mongodb';

jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn(),
    },
  },
}));

describe('PropertyStorage', () => {
  let storage: PropertyStorage;
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

    storage = new PropertyStorage();
  });

  describe('createProperty', () => {
    it('should create a new property', async () => {
      const landlordId = new ObjectId();
      const property = createTestProperty(landlordId);

      mockCollection.insertOne.mockResolvedValue({
        insertedId: property._id,
      });

      const result = await storage.createProperty(property);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result._id).toBeDefined();
    });

    it('should require landlord ID', async () => {
      const property = createTestProperty(undefined);

      mockCollection.insertOne.mockRejectedValue(
        new Error('Landlord ID is required')
      );

      await expect(storage.createProperty(property)).rejects.toThrow();
    });
  });

  describe('getPropertyById', () => {
    it('should retrieve property by ID', async () => {
      const propertyId = new ObjectId();
      const property = createTestProperty(new ObjectId(), { _id: propertyId });

      mockCollection.findOne.mockResolvedValue(property);

      const result = await storage.getPropertyById(propertyId.toString());

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: expect.any(ObjectId),
      });
      expect(result).toEqual(property);
    });
  });

  describe('getPropertiesByLandlord', () => {
    it('should retrieve all properties for a landlord', async () => {
      const landlordId = new ObjectId();
      const properties = [
        createTestProperty(landlordId),
        createTestProperty(landlordId),
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(properties),
      });

      const result = await storage.getPropertiesByLandlord(landlordId.toString());

      expect(mockCollection.find).toHaveBeenCalledWith({
        landlordId: expect.any(ObjectId),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('updateProperty', () => {
    it('should update property details', async () => {
      const propertyId = new ObjectId();
      const updates = { name: 'Updated Property Name' };

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await storage.updateProperty(propertyId.toString(), updates);

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe('deleteProperty', () => {
    it('should delete property', async () => {
      const propertyId = new ObjectId();

      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await storage.deleteProperty(propertyId.toString());

      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });
  });
});
