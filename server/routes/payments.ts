/**
 * Payment Routes
 * GET /api/payment-history/tenant/:tenantId, /api/payment-history/landlord/:landlordId
 * GET /api/payment-history/landlord/:landlordId/by-property, /api/payment-history/property/:propertyId
 * GET /api/payment-history/tenant/:tenantId/recorded-months/:year
 * DELETE /api/payment-history/:paymentId
 * POST /api/payments/cash, /api/payments/initiate
 * GET /api/payments/:paymentIntentId/status, /api/payments/:paymentId/receipt
 */

import type { Express } from "express";
import { PaymentController } from "../controllers/paymentController";
import { CashPaymentController } from "../controllers/cashPaymentController";
import { ReceiptController } from "../controllers/receiptController";
import { paymentLimiter } from "../middleware/security";

export function registerPaymentRoutes(app: Express): void {
  // Payment history routes
  app.get("/api/payment-history/tenant/:tenantId", PaymentController.getTenantPaymentHistory);
  app.get("/api/payment-history/landlord/:landlordId", PaymentController.getLandlordPaymentHistory);
  app.get("/api/payment-history/landlord/:landlordId/by-property", PaymentController.getLandlordPaymentHistoryByProperty);
  app.get("/api/payment-history/property/:propertyId", PaymentController.getPropertyPaymentHistory);
  app.get("/api/payment-history/tenant/:tenantId/recorded-months/:year", PaymentController.getRecordedMonths);
  app.delete("/api/payment-history/:paymentId", PaymentController.deletePaymentHistory);

  // Cash payment routes (with payment rate limiting)
  app.post("/api/payments/cash", paymentLimiter, CashPaymentController.recordCashPayment);

  // Payment initiation routes (STK Push with payment rate limiting)
  app.post("/api/payments/initiate", paymentLimiter, PaymentController.initiatePayment);
  app.get("/api/payments/:paymentIntentId/status", PaymentController.getPaymentStatus);
  
  // Receipt download route
  app.get("/api/payments/:paymentId/receipt", ReceiptController.downloadReceipt);
}
