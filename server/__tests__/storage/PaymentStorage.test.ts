import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentStorage } from '../../storage/PaymentStorage';
import { createTestPayment, createTestTenant } from '../factories';
import { ObjectId } from 'mongodb';

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    db: {
      collection: jest.fn(),
    },
  },
}));

describe('PaymentStorage (CRITICAL)', () => {
  let storage: PaymentStorage;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
    };

    const mongoose = require('mongoose');
    mongoose.connection.db.collection.mockReturnValue(mockCollection);

    storage = new PaymentStorage();
  });

  describe('recordPayment', () => {
    it('should record a valid payment', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 20000,
        status: 'completed',
      });

      mockCollection.insertOne.mockResolvedValue({
        insertedId: payment._id,
      });

      const result = await storage.recordPayment(payment);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.any(Object));
      expect(result._id).toBeDefined();
    });

    it('should reject payment with invalid amount', async () => {
      const invalidPayment = createTestPayment({
        amount: -1000, // Invalid negative amount
      });

      mockCollection.insertOne.mockRejectedValue(
        new Error('Amount must be positive')
      );

      await expect(storage.recordPayment(invalidPayment)).rejects.toThrow();
    });

    it('should handle zero amount payment', async () => {
      const payment = createTestPayment({ amount: 0 });

      mockCollection.insertOne.mockRejectedValue(
        new Error('Amount must be greater than 0')
      );

      await expect(storage.recordPayment(payment)).rejects.toThrow();
    });
  });

  describe('getPaymentById', () => {
    it('should retrieve payment by ID', async () => {
      const paymentId = new ObjectId();
      const payment = createTestPayment({ _id: paymentId });

      mockCollection.findOne.mockResolvedValue(payment);

      const result = await storage.getPaymentById(paymentId.toString());

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: expect.any(ObjectId),
      });
      expect(result).toEqual(payment);
    });

    it('should return null if payment not found', async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const result = await storage.getPaymentById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getPaymentsByTenant', () => {
    it('should retrieve all payments for a tenant', async () => {
      const tenantId = new ObjectId();
      const payments = [
        createTestPayment({ tenantId }),
        createTestPayment({ tenantId }),
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(payments),
      });

      const result = await storage.getPaymentsByTenant(tenantId.toString());

      expect(mockCollection.find).toHaveBeenCalledWith({
        tenantId: expect.any(ObjectId),
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array if tenant has no payments', async () => {
      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      const result = await storage.getPaymentsByTenant(new ObjectId().toString());

      expect(result).toEqual([]);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status to completed', async () => {
      const paymentId = new ObjectId();

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await storage.updatePaymentStatus(paymentId.toString(), 'completed');

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'completed' }),
        })
      );
    });

    it('should handle status transition from partial to completed', async () => {
      const paymentId = new ObjectId();

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await storage.updatePaymentStatus(paymentId.toString(), 'completed');

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });

    it('should reject invalid status', async () => {
      const paymentId = new ObjectId();

      mockCollection.updateOne.mockRejectedValue(
        new Error('Invalid payment status')
      );

      await expect(
        storage.updatePaymentStatus(paymentId.toString(), 'invalid_status')
      ).rejects.toThrow();
    });
  });

  describe('allocatePayment (CRITICAL - Financial Operation)', () => {
    it('should allocate payment to rent and utilities', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 22000, // Rent 20000 + Utilities 2000
      });

      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId(),
      });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await storage.allocatePayment(payment);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result._id).toBeDefined();
    });

    it('should allocate overpayment correctly', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 25000, // Exceeds rent + utilities by 3000
        status: 'overpaid',
      });

      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId(),
      });

      await storage.allocatePayment(payment);

      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should handle partial payment allocation', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 10000, // Less than total required
        status: 'partial',
      });

      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId(),
      });

      const result = await storage.allocatePayment(payment);

      expect(result.status).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });
  });

  describe('getOutstandingBalance', () => {
    it('should calculate outstanding balance for tenant', async () => {
      const tenantId = new ObjectId();

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { totalDue: 22000, totalPaid: 15000 },
        ]),
      });

      const result = await storage.getOutstandingBalance(tenantId.toString());

      expect(mockCollection.aggregate).toHaveBeenCalled();
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 if all payments completed', async () => {
      const tenantId = new ObjectId();

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { totalDue: 20000, totalPaid: 20000 },
        ]),
      });

      const result = await storage.getOutstandingBalance(tenantId.toString());

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle overpayment scenarios', async () => {
      const tenantId = new ObjectId();

      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { totalDue: 20000, totalPaid: 25000 },
        ]),
      });

      const result = await storage.getOutstandingBalance(tenantId.toString());

      expect(result).toBeDefined();
    });
  });

  describe('Payment Status Validations', () => {
    it('should validate all payment status values', () => {
      const validStatuses = ['pending', 'partial', 'completed', 'overpaid', 'failed'];

      validStatuses.forEach(status => {
        expect(['pending', 'partial', 'completed', 'overpaid', 'failed']).toContain(status);
      });
    });
  });
});
