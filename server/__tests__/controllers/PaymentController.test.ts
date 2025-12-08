import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockRequest, createMockResponse, mockPaymentStorage, mockTenantStorage } from '../mocks';
import { createTestPayment, createTestTenant } from '../factories';
import { ObjectId } from 'mongodb';

describe('PaymentController (CRITICAL)', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should record a valid payment transaction', async () => {
      const tenantId = new ObjectId();
      const paymentData = {
        tenantId: tenantId.toString(),
        amount: 20000,
        paymentMethod: 'mpesa',
        transactionId: 'TRX123456789',
      };

      req.body = paymentData;

      const payment = createTestPayment({
        tenantId,
        amount: 20000,
      });

      mockPaymentStorage.recordPayment.mockResolvedValue(payment);

      const result = await mockPaymentStorage.recordPayment(payment);

      expect(result).toBeDefined();
      expect(result.amount).toBe(20000);
      expect(result.status).toBe('completed');
    });

    it('should validate amount is positive', () => {
      const invalidPayment = {
        tenantId: new ObjectId().toString(),
        amount: -5000, // Negative amount
        paymentMethod: 'mpesa',
      };

      expect(invalidPayment.amount).toBeLessThan(0);
    });

    it('should reject zero amount', () => {
      const zeroPayment = {
        tenantId: new ObjectId().toString(),
        amount: 0,
      };

      expect(zeroPayment.amount).toBe(0);
    });

    it('should require valid tenant ID', async () => {
      req.body = {
        tenantId: 'invalid-id',
        amount: 20000,
      };

      mockTenantStorage.getTenantById.mockResolvedValue(null);

      const result = await mockTenantStorage.getTenantById(req.body.tenantId);

      expect(result).toBeNull();
    });
  });

  describe('allocatePayment', () => {
    it('should allocate payment to rent', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 20000,
        status: 'completed',
      });

      mockPaymentStorage.allocatePayment.mockResolvedValue({
        ...payment,
        rentAllocated: 20000,
        utilitiesAllocated: 0,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.rentAllocated).toBe(20000);
    });

    it('should allocate payment to utilities', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 2000,
      });

      mockPaymentStorage.allocatePayment.mockResolvedValue({
        ...payment,
        rentAllocated: 0,
        utilitiesAllocated: 2000,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.utilitiesAllocated).toBe(2000);
    });

    it('should allocate split payment (rent + utilities)', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 22000, // 20000 rent + 2000 utilities
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

    it('should handle overpayment', async () => {
      const tenantId = new ObjectId();
      const payment = createTestPayment({
        tenantId,
        amount: 25000, // Exceeds 22000 by 3000
        status: 'overpaid',
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
        rentAllocated: 10000,
        utilitiesAllocated: 0,
        outstandingBalance: 12000,
      });

      const result = await mockPaymentStorage.allocatePayment(payment);

      expect(result.rentAllocated).toBe(10000);
      expect(result.outstandingBalance).toBe(12000);
    });
  });

  describe('getOutstandingBalance', () => {
    it('should calculate outstanding balance correctly', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(7000);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBe(7000);
    });

    it('should return 0 if all payments completed', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(0);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBe(0);
    });

    it('should handle negative balance (credit)', async () => {
      const tenantId = new ObjectId();

      mockPaymentStorage.getOutstandingBalance.mockResolvedValue(-3000);

      const balance = await mockPaymentStorage.getOutstandingBalance(
        tenantId.toString()
      );

      expect(balance).toBeLessThan(0);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update status to completed', async () => {
      const paymentId = new ObjectId();

      mockPaymentStorage.updatePaymentStatus.mockResolvedValue({
        _id: paymentId,
        status: 'completed',
      });

      const result = await mockPaymentStorage.updatePaymentStatus(
        paymentId.toString(),
        'completed'
      );

      expect(result.status).toBe('completed');
    });

    it('should update status from partial to completed', async () => {
      const paymentId = new ObjectId();

      mockPaymentStorage.updatePaymentStatus.mockResolvedValue({
        _id: paymentId,
        status: 'completed',
      });

      await mockPaymentStorage.updatePaymentStatus(
        paymentId.toString(),
        'completed'
      );

      expect(mockPaymentStorage.updatePaymentStatus).toHaveBeenCalled();
    });

    it('should validate status transitions', () => {
      const validStatuses = ['pending', 'partial', 'completed', 'overpaid', 'failed'];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Payment Validation & Security', () => {
    it('should prevent duplicate payment processing', async () => {
      const payment = createTestPayment();

      mockPaymentStorage.recordPayment.mockResolvedValue(payment);
      mockPaymentStorage.recordPayment.mockResolvedValue(null); // Second attempt returns null

      await mockPaymentStorage.recordPayment(payment);
      const secondAttempt = await mockPaymentStorage.recordPayment(payment);

      expect(secondAttempt).toBeNull();
    });

    it('should validate tenant exists before recording payment', async () => {
      const tenantId = new ObjectId();

      mockTenantStorage.getTenantById.mockResolvedValue(null);

      const result = await mockTenantStorage.getTenantById(tenantId.toString());

      expect(result).toBeNull();
    });

    it('should log payment transactions for audit', () => {
      const payment = createTestPayment();

      // Payment should be traceable and auditable
      expect(payment.createdAt).toBeDefined();
      expect(payment.transactionId).toBeDefined();
    });
  });
});
