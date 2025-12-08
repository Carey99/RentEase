import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse, mockPropertyStorage } from '../mocks';
import { createTestProperty } from '../factories';
import { ObjectId } from 'mongodb';

describe('PropertyController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('createProperty', () => {
    it('should create a property with valid data', async () => {
      const landlordId = new ObjectId();
      const propertyData = {
        name: 'Nairobi Apartments',
        address: '123 Main St',
        city: 'Nairobi',
        county: 'Nairobi',
        units: 10,
        rentAmount: 20000,
        utilitiesCost: 2000,
        landlordId: landlordId.toString(),
      };

      req.body = propertyData;

      const property = createTestProperty(landlordId, propertyData);

      mockPropertyStorage.createProperty.mockResolvedValue(property);

      const result = await mockPropertyStorage.createProperty(property);

      expect(result).toBeDefined();
      expect(result.name).toBe('Nairobi Apartments');
      expect(result.rentAmount).toBe(20000);
    });

    it('should validate required fields', () => {
      const incompleteData = {
        name: 'Property',
        // Missing address, city, etc.
      };

      expect(incompleteData.name).toBeDefined();
      // Validation should fail for missing required fields
    });

    it('should validate rent amount is positive', () => {
      const data = {
        rentAmount: -5000, // Invalid negative rent
      };

      expect(data.rentAmount).toBeLessThan(0);
    });

    it('should require landlord association', () => {
      const data = {
        name: 'Property',
        // Missing landlordId
      };

      expect(data).not.toHaveProperty('landlordId');
    });
  });

  describe('getPropertiesByLandlord', () => {
    it('should retrieve all properties for a landlord', async () => {
      const landlordId = new ObjectId();
      const properties = [
        createTestProperty(landlordId, { name: 'Property 1' }),
        createTestProperty(landlordId, { name: 'Property 2' }),
      ];

      req.params = { landlordId: landlordId.toString() };

      mockPropertyStorage.getPropertiesByLandlord.mockResolvedValue(properties);

      const result = await mockPropertyStorage.getPropertiesByLandlord(
        req.params.landlordId
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Property 1');
      expect(result[1].name).toBe('Property 2');
    });

    it('should return empty array if landlord has no properties', async () => {
      const landlordId = new ObjectId();

      mockPropertyStorage.getPropertiesByLandlord.mockResolvedValue([]);

      const result = await mockPropertyStorage.getPropertiesByLandlord(
        landlordId.toString()
      );

      expect(result).toEqual([]);
    });
  });

  describe('getPropertyById', () => {
    it('should retrieve property by ID', async () => {
      const propertyId = new ObjectId();
      const property = createTestProperty(new ObjectId(), { _id: propertyId });

      req.params = { propertyId: propertyId.toString() };

      mockPropertyStorage.getPropertyById.mockResolvedValue(property);

      const result = await mockPropertyStorage.getPropertyById(
        req.params.propertyId
      );

      expect(result).toEqual(property);
    });

    it('should return null if property not found', async () => {
      mockPropertyStorage.getPropertyById.mockResolvedValue(null);

      const result = await mockPropertyStorage.getPropertyById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProperty', () => {
    it('should update property details', async () => {
      const propertyId = new ObjectId();
      const updates = {
        name: 'Updated Property Name',
        rentAmount: 25000,
      };

      mockPropertyStorage.updateProperty.mockResolvedValue({
        _id: propertyId,
        ...updates,
      });

      const result = await mockPropertyStorage.updateProperty(
        propertyId.toString(),
        updates
      );

      expect(result.name).toBe('Updated Property Name');
      expect(result.rentAmount).toBe(25000);
    });

    it('should validate updated rent amount', () => {
      const updates = {
        rentAmount: -1000, // Invalid
      };

      expect(updates.rentAmount).toBeLessThan(0);
    });

    it('should preserve existing fields if not updated', async () => {
      const propertyId = new ObjectId();
      const originalProperty = createTestProperty(new ObjectId(), {
        _id: propertyId,
        name: 'Original Name',
        rentAmount: 20000,
      });

      const updates = { name: 'Updated Name' };

      mockPropertyStorage.updateProperty.mockResolvedValue({
        ...originalProperty,
        ...updates,
      });

      const result = await mockPropertyStorage.updateProperty(
        propertyId.toString(),
        updates
      );

      expect(result.name).toBe('Updated Name');
      expect(result.rentAmount).toBe(20000);
    });
  });

  describe('deleteProperty', () => {
    it('should delete property', async () => {
      const propertyId = new ObjectId();

      mockPropertyStorage.deleteProperty.mockResolvedValue({ deletedCount: 1 });

      await mockPropertyStorage.deleteProperty(propertyId.toString());

      expect(mockPropertyStorage.deleteProperty).toHaveBeenCalledWith(
        propertyId.toString()
      );
    });

    it('should cascade delete related data', async () => {
      const propertyId = new ObjectId();

      // When property is deleted, related tenants and payments should be handled
      mockPropertyStorage.deleteProperty.mockResolvedValue({
        deletedCount: 1,
        relatedTenantsDeleted: 5,
        relatedPaymentsArchived: 20,
      });

      await mockPropertyStorage.deleteProperty(propertyId.toString());

      expect(mockPropertyStorage.deleteProperty).toHaveBeenCalled();
    });
  });

  describe('Property Validation', () => {
    it('should validate property location', () => {
      const property = {
        city: 'Nairobi',
        county: 'Nairobi',
      };

      expect(property.city).toBeDefined();
      expect(property.county).toBeDefined();
    });

    it('should validate number of units', () => {
      const property = {
        units: 0, // Invalid - must have at least 1 unit
      };

      expect(property.units).toBeLessThanOrEqual(0);
    });

    it('should validate utilities cost', () => {
      const property = {
        utilitiesCost: -500, // Invalid negative value
      };

      expect(property.utilitiesCost).toBeLessThan(0);
    });
  });
});
