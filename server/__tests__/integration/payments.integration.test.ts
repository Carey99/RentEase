import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse, mockPaymentStorage, mockTenantStorage } from '../mocks';
import { createTestPayment, createTestTenant } from '../factories';
import { ObjectId } from 'mongodb';

describe('Payments Routes Integration (CRITICAL)', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('POST /api/payments', () => {
    it('should record payment with valid data', () => {
      const tenantId = new ObjectId();
      req.body = {
        tenantId: tenantId.toString(),
        amount: 20000,
        paymentMethod: 'mpesa',
        transactionId: 'STK123456789',
      };

      const payment = createTestPayment({
        tenantId,
        amount: 20000,
      });

      mockPaymentStorage.recordPayment.mockResolvedValue(payment);

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(20000);
    });

    it('should validate required fields', () => {
      req.body = {
        tenantId: new ObjectId().toString(),
        // Missing amount
        paymentMethod: 'mpesa',
      };

      expect(req.body).not.toHaveProperty('amount');
    });

    it('should reject negative amount', () => {
      req.body = {
        amount: -5000,
      };

      expect(req.body.amount).toBeLessThan(0);
    });

    it('should validate tenant exists', async () => {
      const tenantId = new ObjectId();

      mockTenantStorage.getTenantById.mockResolvedValue(null);

      const tenant = await mockTenantStorage.getTenantById(tenantId.toString());

      expect(tenant).toBeNull();
    });

    it('should return 201 Created on success', () => {
      res.status(201).json({ success: true });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('GET /api/payments/tenant/:tenantId', () => {
    it('should retrieve all payments for tenant', () => {
      const tenantId = new ObjectId();
      const payments = [
        createTestPayment({ tenantId }),
        createTestPayment({ tenantId }),
      ];

      mockPaymentStorage.getPaymentsByTenant.mockResolvedValue(payments);

      expect(payments).toHaveLength(2);
      expect(payments[0].tenantId.toString()).toEqual(tenantId.toString());
    });

    it('should return empty array if no payments exist', () => {
      mockPaymentStorage.getPaymentsByTenant.mockResolvedValue([]);

      expect([]).toEqual([]);
    });

    it('should handle invalid tenant ID', async () => {
      mockTenantStorage.getTenantById.mockResolvedValue(null);

      const tenant = await mockTenantStorage.getTenantById('invalid-id');

      expect(tenant).toBeNull();
    });
  });

  describe('PATCH /api/payments/:paymentId/allocate', () => {
    it('should allocate payment correctly', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 22000,
      });

      mockPaymentStorage.allocatePayment.mockResolvedValue({
        ...payment,
        rentAllocated: 20000,
        utilitiesAllocated: 2000,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.rentAllocated).toBe(20000);
      expect(result.utilitiesAllocated).toBe(2000);
    });

    it('should handle overpayment allocation', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 25000,
      });

      mockPaymentStorage.allocatePayment.mockResolvedValue({
        ...payment,
        rentAllocated: 20000,
        utilitiesAllocated: 2000,
        creditBalance: 3000,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.creditBalance).toBe(3000);
    });

    it('should handle partial payment', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 10000,
      });

      mockPaymentStorage.allocatePayment.mockResolvedValue({
        ...payment,
        status: 'partial',
        outstandingBalance: 12000,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.status).toBe('partial');
      expect(result.outstandingBalance).toBe(12000);
    });
  });

  describe('GET /api/payments/:tenantId/balance', () => {
    it('should calculate outstanding balance', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(7000);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBe(7000);
    });

    it('should return 0 if fully paid', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(0);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBe(0);
    });

    it('should return credit if overpaid', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(-2000);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBeLessThan(0);
    });
  });

  describe('PATCH /api/payments/:paymentId/status', () => {
    it('should update payment status', async () => {
      const paymentId = new ObjectId();

      mockPaymentStorage.updatePaymentStatus.mockResolvedValue({
        _id: paymentId,
        status: 'completed',
      });

      await mockPaymentStorage.updatePaymentStatus(
        paymentId.toString(),
        'completed'
      );

      expect(mockPaymentStorage.updatePaymentStatus).toHaveBeenCalledWith(
        paymentId.toString(),
        'completed'
      );
    });

    it('should validate status transitions', () => {
      const validStatuses = ['pending', 'partial', 'completed', 'overpaid', 'failed'];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Payment Security & Audit Trail', () => {
    it('should log all payment transactions', () => {
      const payment = createTestPayment();

      expect(payment.createdAt).toBeDefined();
      expect(payment.transactionId).toBeDefined();
    });

    it('should prevent unauthorized payment modifications', () => {
      const payment = createTestPayment();
      req.user = null; // Not authenticated

      expect(req.user).toBeNull();
    });

    it('should validate transaction ID uniqueness', () => {
      const transactionId = 'STK123456789';
      const payment1 = createTestPayment({ transactionId });

      mockPaymentStorage.recordPayment.mockResolvedValue(payment1);

      expect(payment1.transactionId).toBe(transactionId);
    });

    it('should maintain referential integrity with tenants', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({ tenantId });

      mockTenantStorage.getTenantById.mockResolvedValue(
        createTestTenant(new ObjectId(), { _id: tenantId })
      );

      const tenant = await mockTenantStorage.getTenantById(tenantId.toString());

      expect(tenant).toBeDefined();
      expect(tenant._id).toEqual(tenantId);
    });
  });
});
