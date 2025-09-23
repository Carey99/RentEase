import { Request, Response } from 'express';
import { storage } from '../storage';

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
}
