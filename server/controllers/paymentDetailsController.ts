/**
 * Manual Payment Details Controller
 * 
 * Handles landlord's manual payment information (bank, M-Pesa, etc.)
 * Independent of Daraja API configuration for simple payment display
 */

import type { Request, Response } from 'express';
import { Landlord } from '../database';
import { manualPaymentDetailsSchema } from '@shared/schema';

export class PaymentDetailsController {
  /**
   * Get landlord's manual payment details
   * GET /api/landlords/:landlordId/payment-details
   */
  static async getPaymentDetails(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      if (!landlordId) {
        return res.status(400).json({ error: 'Landlord ID is required' });
      }

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      // Return manual payment details (or empty structure if not set)
      const paymentDetails = landlord.manualPaymentDetails || {
        enabled: false,
        mpesa: {},
        bank: { enabled: false },
        instructions: ''
      };

      res.json(paymentDetails);
    } catch (error: any) {
      console.error('❌ Error fetching payment details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payment details',
        details: error.message 
      });
    }
  }

  /**
   * Update landlord's manual payment details
   * PUT /api/landlords/:landlordId/payment-details
   */
  static async updatePaymentDetails(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      if (!landlordId) {
        return res.status(400).json({ error: 'Landlord ID is required' });
      }

      // Validate request body
      const validationResult = manualPaymentDetailsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid payment details',
          details: validationResult.error.issues
        });
      }

      const paymentDetails = validationResult.data;

      // Update landlord's manual payment details
      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      landlord.manualPaymentDetails = {
        ...paymentDetails,
        updatedAt: new Date()
      };

      await landlord.save();

      console.log('✅ Manual payment details updated for landlord:', landlordId);

      res.json({
        success: true,
        message: 'Payment details updated successfully',
        paymentDetails: landlord.manualPaymentDetails
      });
    } catch (error: any) {
      console.error('❌ Error updating payment details:', error);
      res.status(500).json({ 
        error: 'Failed to update payment details',
        details: error.message 
      });
    }
  }

  /**
   * Get public payment details for tenant view
   * GET /api/landlords/:landlordId/payment-details/public
   * 
   * Returns safe payment information for display on tenant dashboard
   */
  static async getPublicPaymentDetails(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      if (!landlordId) {
        return res.status(400).json({ error: 'Landlord ID is required' });
      }

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      // Check if manual payment details are enabled
      if (!landlord.manualPaymentDetails?.enabled) {
        return res.json({ enabled: false });
      }

      // Return safe public information (no sensitive data)
      const publicDetails = {
        enabled: true,
        mpesa: landlord.manualPaymentDetails.mpesa || {},
        bank: landlord.manualPaymentDetails.bank?.enabled 
          ? landlord.manualPaymentDetails.bank 
          : { enabled: false },
        instructions: landlord.manualPaymentDetails.instructions || ''
      };

      res.json(publicDetails);
    } catch (error: any) {
      console.error('❌ Error fetching public payment details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payment details',
        details: error.message 
      });
    }
  }
}
