/**
 * Daraja Configuration Controller
 * 
 * Handles landlord M-Pesa configuration for receiving payments.
 * Each landlord provides their own Daraja API credentials.
 * Payments go directly to landlord's paybill/till.
 */

import type { Request, Response } from 'express';
import { Landlord } from '../database';
import { testConnection } from '../utils/darajaAuth';
import { encrypt, decrypt, maskCredential, isEncrypted } from '../utils/encryption';

interface DarajaConfigRequest {
  businessShortCode: string;
  businessType: 'paybill' | 'till';
  businessName?: string;
  accountNumber?: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

export class DarajaConfigController {
  /**
   * Configure landlord's M-Pesa receiving account
   * POST /api/landlords/:landlordId/daraja/configure
   */
  static async configure(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const config: DarajaConfigRequest = req.body;

      // Validate required fields
      const validationError = DarajaConfigController.validateConfig(config);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Find landlord
      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      // Validate business short code format
      if (!DarajaConfigController.isValidShortCode(config.businessShortCode)) {
        return res.status(400).json({ 
          error: 'Invalid business short code format. Must be 5-7 digits.' 
        });
      }

      // Update landlord's Daraja configuration with ENCRYPTED credentials
      landlord.darajaConfig = {
        businessShortCode: config.businessShortCode.trim(),
        businessType: config.businessType,
        businessName: config.businessName?.trim() || landlord.fullName,
        accountNumber: config.accountNumber?.trim() || undefined,
        consumerKey: encrypt(config.consumerKey.trim()),        // ✅ Encrypted
        consumerSecret: encrypt(config.consumerSecret.trim()),  // ✅ Encrypted
        passkey: encrypt(config.passkey.trim()),                // ✅ Encrypted
        environment: config.environment,
        isConfigured: true,
        isActive: true,
        configuredAt: new Date(),
        lastTestedAt: undefined
      };

      // Update payment method to daraja
      landlord.paymentMethod = 'daraja';

      await landlord.save();

      res.json({
        success: true,
        message: 'M-Pesa configuration saved successfully',
        config: {
          businessShortCode: landlord.darajaConfig.businessShortCode,
          businessType: landlord.darajaConfig.businessType,
          businessName: landlord.darajaConfig.businessName,
          environment: landlord.darajaConfig.environment,
          hasCredentials: !!(landlord.darajaConfig.consumerKey && 
                            landlord.darajaConfig.consumerSecret && 
                            landlord.darajaConfig.passkey),
          isConfigured: landlord.darajaConfig.isConfigured,
          isActive: landlord.darajaConfig.isActive,
          configuredAt: landlord.darajaConfig.configuredAt
        }
      });
    } catch (error: any) {
      console.error('❌ Daraja configuration error:', error);
      res.status(500).json({ 
        error: 'Failed to configure M-Pesa',
        details: error.message 
      });
    }
  }

  /**
   * Get landlord's M-Pesa configuration status
   * GET /api/landlords/:landlordId/daraja/status
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      console.log('📱 Getting Daraja status for landlord:', landlordId);

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        console.log('❌ Landlord not found:', landlordId);
        return res.status(404).json({ error: 'Landlord not found' });
      }

      console.log('✅ Landlord found:', landlord.fullName);
      const config = landlord.darajaConfig;
      console.log('📋 Daraja config:', config);

      // Safely decrypt and mask credentials for display
      // Handle both encrypted and plain text (for migration purposes)
      let consumerKey = null;
      let consumerSecret = null;
      let passkey = null;

      try {
        if (config?.consumerKey) {
          consumerKey = isEncrypted(config.consumerKey) 
            ? decrypt(config.consumerKey) 
            : config.consumerKey; // Plain text (needs migration)
        }
        if (config?.consumerSecret) {
          consumerSecret = isEncrypted(config.consumerSecret) 
            ? decrypt(config.consumerSecret) 
            : config.consumerSecret; // Plain text (needs migration)
        }
        if (config?.passkey) {
          passkey = isEncrypted(config.passkey) 
            ? decrypt(config.passkey) 
            : config.passkey; // Plain text (needs migration)
        }
      } catch (error) {
        console.error('Error decrypting credentials:', error);
        // If decryption fails, treat as plain text
      }

      const response = {
        isConfigured: config?.isConfigured || false,
        isActive: config?.isActive || false,
        businessShortCode: config?.businessShortCode || null,
        businessType: config?.businessType || null,
        businessName: config?.businessName || null,
        accountNumber: config?.accountNumber || null,
        environment: config?.environment || null,
        hasCredentials: !!(config?.consumerKey && config?.consumerSecret && config?.passkey),
        // Return masked versions for display (never send actual credentials to frontend!)
        consumerKeyMasked: consumerKey ? maskCredential(consumerKey) : null,
        consumerSecretMasked: consumerSecret ? maskCredential(consumerSecret) : null,
        passkeyMasked: passkey ? maskCredential(passkey, 6) : null,
        configuredAt: config?.configuredAt || null,
        lastTestedAt: config?.lastTestedAt || null
      };

      console.log('📤 Sending response:', response);
      res.json(response);
    } catch (error: any) {
      console.error('❌ Get Daraja status error:', error);
      res.status(500).json({ 
        error: 'Failed to get M-Pesa status',
        details: error.message 
      });
    }
  }

  /**
   * Test Daraja API connection
   * POST /api/landlords/:landlordId/daraja/test
   */
  static async testConfiguration(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      if (!landlord.darajaConfig?.isConfigured) {
        return res.status(400).json({ 
          error: 'M-Pesa not configured. Please configure first.' 
        });
      }

      // Validate that credentials exist
      if (!landlord.darajaConfig.consumerKey || 
          !landlord.darajaConfig.consumerSecret || 
          !landlord.darajaConfig.passkey ||
          !landlord.darajaConfig.environment) {
        return res.status(400).json({ 
          error: 'Daraja credentials are incomplete. Please reconfigure with all credentials.' 
        });
      }

      // Safely decrypt credentials (handle both encrypted and plain text)
      let consumerKey = landlord.darajaConfig.consumerKey;
      let consumerSecret = landlord.darajaConfig.consumerSecret;

      try {
        if (isEncrypted(consumerKey)) {
          consumerKey = decrypt(consumerKey);
        }
        if (isEncrypted(consumerSecret)) {
          consumerSecret = decrypt(consumerSecret);
        }
      } catch (error) {
        console.error('Error decrypting credentials for test:', error);
        // Continue with original values if decryption fails
      }

      // Test Daraja API connection using landlord's credentials
      const credentials = {
        consumerKey,
        consumerSecret,
        environment: landlord.darajaConfig.environment
      };

      const testResult = await testConnection(credentials, landlordId);

      if (testResult.success) {
        // Update last tested timestamp
        if (landlord.darajaConfig) {
          landlord.darajaConfig.lastTestedAt = new Date();
          await landlord.save();
        }
      }

      res.json({
        success: testResult.success,
        message: testResult.message,
        businessShortCode: landlord.darajaConfig.businessShortCode,
        testedAt: new Date()
      });
    } catch (error: any) {
      console.error('❌ Test Daraja configuration error:', error);
      res.status(500).json({ 
        error: 'Failed to test M-Pesa configuration',
        details: error.message 
      });
    }
  }

  /**
   * Remove/deactivate landlord's M-Pesa configuration
   * DELETE /api/landlords/:landlordId/daraja/configure
   */
  static async removeConfiguration(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }

      // Deactivate configuration (don't delete, keep for audit)
      if (landlord.darajaConfig) {
        landlord.darajaConfig.isActive = false;
        landlord.darajaConfig.isConfigured = false;
      }

      // Switch payment method back to manual
      landlord.paymentMethod = 'manual';

      await landlord.save();

      res.json({
        success: true,
        message: 'M-Pesa configuration deactivated successfully'
      });
    } catch (error: any) {
      console.error('❌ Remove Daraja configuration error:', error);
      res.status(500).json({ 
        error: 'Failed to remove M-Pesa configuration',
        details: error.message 
      });
    }
  }

  /**
   * Validate configuration request
   */
  private static validateConfig(config: DarajaConfigRequest): string | null {
    if (!config.businessShortCode) {
      return 'Business short code is required (your paybill or till number)';
    }

    if (!config.businessType) {
      return 'Business type is required (paybill or till)';
    }

    if (config.businessType !== 'paybill' && config.businessType !== 'till') {
      return 'Business type must be either "paybill" or "till"';
    }

    // Validate Daraja credentials
    if (!config.consumerKey) {
      return 'Consumer Key is required';
    }

    if (!config.consumerSecret) {
      return 'Consumer Secret is required';
    }

    if (!config.passkey) {
      return 'Passkey is required';
    }

    if (!config.environment) {
      return 'Environment is required (sandbox or production)';
    }

    if (config.environment !== 'sandbox' && config.environment !== 'production') {
      return 'Environment must be either "sandbox" or "production"';
    }

    // For paybill, account number is recommended but optional
    if (config.businessType === 'paybill' && !config.accountNumber) {
      console.warn('⚠️  Paybill configured without account number - payments may be harder to identify');
    }

    return null;
  }

  /**
   * Validate business short code format
   */
  private static isValidShortCode(shortCode: string): boolean {
    // Business short codes are typically 5-7 digits
    const cleaned = shortCode.trim();
    return /^\d{5,7}$/.test(cleaned);
  }
}
