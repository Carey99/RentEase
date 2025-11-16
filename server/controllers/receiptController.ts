/**
 * Receipt Controller
 * 
 * Handles PDF receipt generation and downloads
 */

import type { Request, Response } from 'express';
import { PaymentHistory, Tenant, Landlord, Property } from '../database';
import { generateReceipt } from '../utils/receiptGenerator';

export class ReceiptController {
  /**
   * Generate and download receipt for a payment
   * GET /api/payments/:paymentId/receipt
   */
  static async downloadReceipt(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      
      console.log('📄 Generating receipt for payment:', paymentId);
      
      // Fetch payment record
      const payment = await PaymentHistory.findById(paymentId);
      
      if (!payment) {
        console.log('❌ Payment not found:', paymentId);
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      // Only generate receipts for successful payments
      if (payment.status !== 'completed') {
        console.log('❌ Payment not completed:', payment.status);
        return res.status(400).json({ 
          error: 'Receipt can only be generated for completed payments' 
        });
      }
      
      // Fetch tenant details
      const tenant = await Tenant.findById(payment.tenantId);
      if (!tenant) {
        console.log('❌ Tenant not found:', payment.tenantId);
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // Fetch landlord details
      const landlord = await Landlord.findById(payment.landlordId);
      if (!landlord) {
        console.log('❌ Landlord not found:', payment.landlordId);
        return res.status(404).json({ error: 'Landlord not found' });
      }
      
      // Fetch property details
      const property = await Property.findById(payment.propertyId);
      if (!property) {
        console.log('❌ Property not found:', payment.propertyId);
        return res.status(404).json({ error: 'Property not found' });
      }
      
      // Get apartment info from tenant
      const apartmentInfo = tenant.apartmentInfo;
      if (!apartmentInfo) {
        console.log('❌ Apartment info not found for tenant:', tenant._id);
        return res.status(404).json({ error: 'Apartment information not found' });
      }
      
      // Format payment period
      const paymentPeriod = `${getMonthName(payment.forMonth)} ${payment.forYear}`;
      
      // Prepare utility charges if available
      const utilityCharges = payment.utilityCharges?.map((utility: any) => ({
        type: utility.type,
        units: utility.unitsUsed,
        pricePerUnit: utility.pricePerUnit,
        total: utility.total,
      })) || [];
      
      // Extract historical debt info from payment notes
      let historicalDebt = 0;
      let historicalDebtDetails = '';
      
      if (payment.notes && payment.notes.includes('Includes historical debt:')) {
        const match = payment.notes.match(/Includes historical debt: KSH ([0-9,]+) \(([^)]+)\)/);
        if (match) {
          historicalDebt = parseFloat(match[1].replace(/,/g, ''));
          historicalDebtDetails = match[2];
        }
      }
      
      // Calculate current month charges (excluding historical debt)
      const currentMonthRent = payment.monthlyRent - historicalDebt;
      
      // Prepare receipt data
      const receiptData = {
        // Payment Info
        receiptNumber: payment._id.toString().substring(0, 12).toUpperCase(),
        transactionId: (payment as any).transactionId || payment._id.toString(),
        mpesaReceiptNumber: (payment as any).mpesaReceiptNumber || undefined,
        amount: payment.amount,
        paymentDate: payment.createdAt,
        paymentMethod: payment.paymentMethod === 'mpesa' ? 'M-Pesa' : payment.paymentMethod,
        
        // Bill Breakdown (current month only)
        monthlyRent: currentMonthRent,
        utilityCharges: utilityCharges.length > 0 ? utilityCharges : undefined,
        historicalDebt: historicalDebt > 0 ? historicalDebt : undefined,
        historicalDebtDetails: historicalDebtDetails || undefined,
        
        // Tenant Info
        tenantName: tenant.fullName,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone || 'N/A',
        
        // Property Info
        propertyName: property.name,
        propertyType: apartmentInfo.propertyType || '',
        unitNumber: apartmentInfo.unitNumber || '',
        
        // Landlord Info
        landlordName: landlord.fullName,
        landlordEmail: landlord.email,
        landlordPhone: landlord.phone || undefined,
        
        // Period covered
        paymentPeriod,
        
        // Additional details
        description: `Rent payment for ${apartmentInfo.propertyType} - Unit ${apartmentInfo.unitNumber}`,
        notes: payment.status === 'completed' 
          ? 'Payment successfully received and processed.' 
          : undefined,
      };
      
      console.log('✅ Generating PDF receipt...');
      
      // Generate and stream the PDF
      generateReceipt(receiptData, res);
      
    } catch (error: any) {
      console.error('❌ Error generating receipt:', error);
      res.status(500).json({ 
        error: 'Failed to generate receipt',
        details: error.message 
      });
    }
  }
}

/**
 * Get month name from month number (1-12)
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
