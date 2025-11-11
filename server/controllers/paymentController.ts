import { Request, Response } from 'express';
import { storage } from '../storage';
import { Landlord, Tenant, PaymentIntent } from '../database';
import { initiateSTKPush, querySTKPushStatus, getResultMessage } from '../utils/darajaService';
import { generatePaymentReference } from '../utils/paymentReference';

export class PaymentController {
  /**
   * Get payment history for a tenant
   * GET /api/payment-history/tenant/:tenantId
   */
  static async getTenantPaymentHistory(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const payments = await storage.getPaymentHistory(tenantId);
      
      res.json(payments);
    } catch (error) {
      console.error("Error getting tenant payment history:", error);
      res.status(500).json({ error: "Failed to get payment history" });
    }
  }

  /**
   * Get payment history for a landlord (all properties)
   * GET /api/payment-history/landlord/:landlordId
   */
  static async getLandlordPaymentHistory(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const payments = await storage.getPaymentHistoryByLandlord(landlordId);
      
      res.json(payments);
    } catch (error) {
      console.error("Error getting landlord payment history:", error);
      res.status(500).json({ error: "Failed to get payment history" });
    }
  }

  /**
   * Get payment history for a landlord organized by property
   * GET /api/payment-history/landlord/:landlordId/by-property
   */
  static async getLandlordPaymentHistoryByProperty(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      console.log(`🏠 Getting payment history by property for landlord: ${landlordId}`);
      
      // Get all payment history for the landlord
      const payments = await storage.getPaymentHistoryByLandlord(landlordId);
      console.log(`📊 Found ${payments.length} total payments for landlord`);
      
      // Group payments by property
      const propertiesMap: Record<string, any> = {};
      
      payments.forEach((payment: any) => {
        const propertyId = payment.propertyId || payment.property?._id;
        const propertyName = payment.property?.name || 'Unknown Property';
        
        console.log(`💰 Processing payment: propertyId=${propertyId}, propertyName=${propertyName}, amount=${payment.amount}`);
        
        if (!propertiesMap[propertyId]) {
          propertiesMap[propertyId] = {
            propertyId,
            propertyName,
            payments: [],
            totalAmount: 0,
            paymentCount: 0
          };
        }
        
        propertiesMap[propertyId].payments.push(payment);
        propertiesMap[propertyId].totalAmount += payment.amount || 0;
        propertiesMap[propertyId].paymentCount += 1;
      });
      
      // Convert to array and sort by property name
      const propertySummary = Object.values(propertiesMap).sort((a: any, b: any) => 
        a.propertyName.localeCompare(b.propertyName)
      );
      
      console.log(`🏢 Returning ${propertySummary.length} properties with payment data`);
      res.json(propertySummary);
    } catch (error) {
      console.error("Error getting landlord payment history by property:", error);
      res.status(500).json({ error: "Failed to get payment history by property" });
    }
  }

  /**
   * Get payment history for a property
   * GET /api/payment-history/property/:propertyId
   */
  static async getPropertyPaymentHistory(req: Request, res: Response) {
    try {
      const { propertyId } = req.params;
      const payments = await storage.getPaymentHistoryByProperty(propertyId);
      
      res.json(payments);
    } catch (error) {
      console.error("Error getting property payment history:", error);
      res.status(500).json({ error: "Failed to get payment history" });
    }
  }

  /**
   * Get recorded months for a tenant in a specific year
   * GET /api/payment-history/tenant/:tenantId/recorded-months/:year
   */
  static async getRecordedMonths(req: Request, res: Response) {
    try {
      const { tenantId, year } = req.params;
      const months = await storage.getRecordedMonthsForTenant(tenantId, parseInt(year));
      
      res.json({ months });
    } catch (error) {
      console.error("Error getting recorded months:", error);
      res.status(500).json({ error: "Failed to get recorded months" });
    }
  }

  /**
   * Delete a payment history record
   * DELETE /api/payment-history/:paymentId
   */
  static async deletePaymentHistory(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const success = await storage.deletePaymentHistory(paymentId);
      
      if (success) {
        res.json({ message: "Payment record deleted successfully" });
      } else {
        res.status(404).json({ error: "Payment record not found" });
      }
    } catch (error) {
      console.error("Error deleting payment history:", error);
      res.status(500).json({ error: "Failed to delete payment record" });
    }
  }

  /**
   * Initiate M-Pesa payment (STK Push)
   * POST /api/payments/initiate
   * 
   * Body: { tenantId, landlordId, amount, phoneNumber, billId }
   */
  static async initiatePayment(req: Request, res: Response) {
    try {
      const { tenantId, landlordId, amount, phoneNumber, billId } = req.body;

      console.log('\n💳 Payment initiation request received');
      console.log('  Tenant ID:', tenantId);
      console.log('  Landlord ID:', landlordId);
      console.log('  Amount:', amount);
      console.log('  Phone:', phoneNumber);

      // Validate required fields
      if (!tenantId || !landlordId || !amount || !phoneNumber) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['tenantId', 'landlordId', 'amount', 'phoneNumber']
        });
      }

      // Validate amount
      if (amount <= 0 || amount > 150000) {
        return res.status(400).json({ 
          error: 'Invalid amount',
          message: 'Amount must be between 1 and 150,000 KES'
        });
      }

      // Get tenant
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Get landlord
      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      // Check if landlord has M-Pesa configured
      console.log('📋 Checking landlord M-Pesa configuration...');
      console.log('  Has darajaConfig:', !!landlord.darajaConfig);
      console.log('  Is configured:', landlord.darajaConfig?.isConfigured);
      console.log('  Is active:', landlord.darajaConfig?.isActive);
      
      if (!landlord.darajaConfig?.isActive) {
        return res.status(400).json({ 
          error: 'M-Pesa not configured',
          message: 'Landlord has not configured M-Pesa payments. Please ask your landlord to set up M-Pesa in Settings → Payment Gateway.'
        });
      }

      console.log('✅ Landlord M-Pesa config found');
      console.log('  Business Short Code:', landlord.darajaConfig.businessShortCode);
      console.log('  Business Type:', landlord.darajaConfig.businessType);
      
      // Validate business type
      if (!['paybill', 'till'].includes(landlord.darajaConfig.businessType)) {
        return res.status(400).json({
          error: 'Invalid configuration',
          message: `Invalid business type: ${landlord.darajaConfig.businessType}. Must be 'paybill' or 'till'.`
        });
      }

      // Generate payment reference
      const paymentReference = generatePaymentReference(landlordId, tenantId);

      // Create PaymentIntent record
      const paymentIntent = await PaymentIntent.create({
        tenantId,
        landlordId,
        billId: billId || null,
        amount,
        phoneNumber,
        paymentReference,
        businessShortCode: landlord.darajaConfig.businessShortCode,
        businessType: landlord.darajaConfig.businessType,
        status: 'pending',
        initiatedAt: new Date()
      });

      console.log('📝 PaymentIntent created:', paymentIntent._id);

      // Initiate STK Push
      const stkResponse = await initiateSTKPush({
        landlordId,
        tenantId,
        tenantPhone: phoneNumber,
        amount,
        businessShortCode: landlord.darajaConfig.businessShortCode,
        businessType: landlord.darajaConfig.businessType,
        accountReference: landlord.darajaConfig.accountNumber,
        transactionDesc: `Rent-${new Date().getMonth() + 1}`
      });

      // Update PaymentIntent with STK Push details
      paymentIntent.merchantRequestId = stkResponse.merchantRequestId;
      paymentIntent.checkoutRequestId = stkResponse.checkoutRequestId;
      await paymentIntent.save();

      console.log('✅ STK Push initiated successfully');
      console.log('  Checkout Request ID:', stkResponse.checkoutRequestId);

      res.json({
        success: true,
        message: 'Payment request sent to your phone',
        paymentIntentId: paymentIntent._id,
        checkoutRequestId: stkResponse.checkoutRequestId,
        customerMessage: stkResponse.customerMessage
      });

    } catch (error: any) {
      console.error('❌ Payment initiation error:', error);
      res.status(500).json({ 
        error: 'Failed to initiate payment',
        message: error.message
      });
    }
  }

  /**
   * Get payment status
   * GET /api/payments/:paymentIntentId/status
   */
  static async getPaymentStatus(req: Request, res: Response) {
    try {
      const { paymentIntentId } = req.params;

      console.log('🔍 Checking payment status:', paymentIntentId);

      const paymentIntent = await PaymentIntent.findById(paymentIntentId);
      if (!paymentIntent) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // If already completed or failed, return cached status
      if (paymentIntent.status === 'completed' || paymentIntent.status === 'failed') {
        console.log('  Status (cached):', paymentIntent.status);
        return res.json({
          status: paymentIntent.status,
          resultCode: paymentIntent.resultCode,
          resultDescription: paymentIntent.resultDescription,
          mpesaReceiptNumber: paymentIntent.mpesaReceiptNumber,
          transactionDate: paymentIntent.transactionDate
        });
      }

      // Query Daraja API for latest status
      if (paymentIntent.checkoutRequestId) {
        try {
          const statusResponse = await querySTKPushStatus(
            paymentIntent.businessShortCode,
            paymentIntent.checkoutRequestId
          );

          // Update payment intent with latest status
          paymentIntent.resultCode = statusResponse.resultCode;
          paymentIntent.resultDescription = statusResponse.resultDesc;
          
          if (statusResponse.success) {
            paymentIntent.status = 'completed';
            paymentIntent.completedAt = new Date();
          } else if (statusResponse.resultCode !== '0' && statusResponse.resultCode !== '') {
            paymentIntent.status = 'failed';
          }

          await paymentIntent.save();

          console.log('  Status (from Daraja):', paymentIntent.status);

          return res.json({
            status: paymentIntent.status,
            resultCode: statusResponse.resultCode,
            resultDescription: statusResponse.resultDesc,
            message: getResultMessage(statusResponse.resultCode)
          });
        } catch (error) {
          // If query fails, return current status
          console.warn('⚠️ Failed to query Daraja, returning cached status');
        }
      }

      // Return current status from database
      res.json({
        status: paymentIntent.status,
        resultCode: paymentIntent.resultCode,
        resultDescription: paymentIntent.resultDescription
      });

    } catch (error: any) {
      console.error('❌ Payment status check error:', error);
      res.status(500).json({ 
        error: 'Failed to check payment status',
        message: error.message
      });
    }
  }
}
