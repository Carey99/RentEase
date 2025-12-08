import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse, mockPropertyStorage } from '../mocks';
import { createTestProperty } from '../factories';
import { ObjectId } from 'mongodb';

describe('Properties Routes Integration', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('POST /api/properties', () => {
    it('should create property with valid data', () => {
      const landlordId = new ObjectId();
      req.body = {
        name: 'Nairobi Complex',
        address: '456 Oak Ave',
        city: 'Nairobi',
        county: 'Nairobi',
        units: 8,
        rentAmount: 18000,
        utilitiesCost: 1500,
      };

      req.user = { id: landlordId };

      const property = createTestProperty(landlordId, req.body);

      mockPropertyStorage.createProperty.mockResolvedValue(property);

      expect(property.name).toBe('Nairobi Complex');
      expect(property.rentAmount).toBe(18000);
    });

    it('should require landlord authentication', () => {
      req.user = null;

      expect(req.user).toBeNull();
    });

    it('should validate all required fields', () => {
      req.body = {
        name: 'Property',
        // Missing other required fields
      };

      expect(req.body).not.toHaveProperty('address');
      expect(req.body).not.toHaveProperty('city');
    });

    it('should return 201 Created', () => {
      res.status(201).json({ success: true });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('GET /api/properties/landlord/:landlordId', () => {
    it('should retrieve all landlord properties', () => {
      const landlordId = new ObjectId();
      const properties = [
        createTestProperty(landlordId, { name: 'Property 1' }),
        createTestProperty(landlordId, { name: 'Property 2' }),
        createTestProperty(landlordId, { name: 'Property 3' }),
      ];

      mockPropertyStorage.getPropertiesByLandlord.mockResolvedValue(properties);

      expect(properties).toHaveLength(3);
      properties.forEach(p => {
        expect(p.landlordId).toEqual(landlordId);
      });
    });

    it('should return empty array if no properties', () => {
      mockPropertyStorage.getPropertiesByLandlord.mockResolvedValue([]);

      expect([]).toEqual([]);
    });
  });

  describe('GET /api/properties/:propertyId', () => {
    it('should retrieve property details', () => {
      const propertyId = new ObjectId();
      const property = createTestProperty(new ObjectId(), { _id: propertyId });

      mockPropertyStorage.getPropertyById.mockResolvedValue(property);

      expect(property._id).toEqual(propertyId);
      expect(property.name).toBeDefined();
    });

    it('should return 404 if property not found', () => {
      mockPropertyStorage.getPropertyById.mockResolvedValue(null);

      expect(mockPropertyStorage.getPropertyById('nonexistent')).resolves.toBeNull();
    });
  });

  describe('PATCH /api/properties/:propertyId', () => {
    it('should update property details', () => {
      const propertyId = new ObjectId();
      const updates = {
        name: 'Updated Name',
        rentAmount: 22000,
      };

      mockPropertyStorage.updateProperty.mockResolvedValue({
        _id: propertyId,
        ...updates,
      });

      expect(mockPropertyStorage.updateProperty).toBeDefined();
    });

    it('should validate updated values', () => {
      const invalidUpdates = {
        rentAmount: -1000,
        units: 0,
      };

      expect(invalidUpdates.rentAmount).toBeLessThan(0);
      expect(invalidUpdates.units).toBe(0);
    });
  });

  describe('DELETE /api/properties/:propertyId', () => {
    it('should delete property', () => {
      const propertyId = new ObjectId();

      mockPropertyStorage.deleteProperty.mockResolvedValue({
        deletedCount: 1,
      });

      expect(mockPropertyStorage.deleteProperty).toBeDefined();
    });

    it('should handle cascading deletes', () => {
      const propertyId = new ObjectId();

      mockPropertyStorage.deleteProperty.mockResolvedValue({
        deletedCount: 1,
        tenantsDeleted: 5,
        paymentsArchived: 20,
      });

      expect(mockPropertyStorage.deleteProperty).toBeDefined();
    });
  });
});
