/**
 * Gateway Controller
 * Handles payment gateway configuration for landlords
 * Allows landlords to set up Paystack subaccounts for receiving rent payments
 */

import type { Request, Response } from "express";
import { paystackService } from "../utils/paystackService";
import { normalizePhoneNumber, validatePhone } from "../utils/phoneNormalizer";
import { Landlord } from "../database";
import type { LandlordAccountConfig } from "../utils/paystackService";

export class GatewayController {
  /**
   * Configure payment gateway for a landlord
   * POST /api/landlords/:landlordId/gateway/configure
   * 
   * Body: {
   *   receiveMethod: 'mobile_money' | 'paybill' | 'till',
   *   recipientPhone?: string,
   *   recipientName?: string,
   *   idNumber?: string,
   *   paybillNumber?: string,
   *   paybillAccountReference?: string,
   *   tillNumber?: string,
   *   businessName?: string,
   *   kraPin?: string,
   *   businessPhone?: string,
   *   accountBank?: string,
   *   accountNumber?: string
   * }
   */
  static async configureGateway(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;
      const config: LandlordAccountConfig = req.body;

      // Validate landlord exists
      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      // Validate receive method
      if (!config.receiveMethod || !['mobile_money', 'paybill', 'till'].includes(config.receiveMethod)) {
        return res.status(400).json({ 
          error: "Invalid receive method. Must be 'mobile_money', 'paybill', or 'till'" 
        });
      }

      // Validate required fields based on receive method
      const validationError = GatewayController.validateConfig(config);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Normalize phone numbers if present
      if (config.recipientPhone) {
        const phoneValidation = validatePhone(config.recipientPhone);
        if (!phoneValidation.valid) {
          return res.status(400).json({ 
            error: `Invalid recipient phone: ${phoneValidation.error}` 
          });
        }
        config.recipientPhone = phoneValidation.normalized!;
      }

      if (config.businessPhone) {
        const phoneValidation = validatePhone(config.businessPhone);
        if (!phoneValidation.valid) {
          return res.status(400).json({ 
            error: `Invalid business phone: ${phoneValidation.error}` 
          });
        }
        config.businessPhone = phoneValidation.normalized!;
      }

      // Create Paystack subaccount
      console.log(`🔧 Creating Paystack subaccount for landlord ${landlordId}...`);
      const subaccount = await paystackService.createSubaccount(config, landlordId);

      // Update landlord's gateway configuration
      landlord.gatewayConfig = {
        provider: 'paystack',
        receiveMethod: config.receiveMethod,
        recipientPhone: config.recipientPhone,
        recipientName: config.recipientName,
        idNumber: config.idNumber,
        paybillNumber: config.paybillNumber,
        paybillAccountReference: config.paybillAccountReference,
        tillNumber: config.tillNumber,
        businessName: config.businessName || subaccount.businessName,
        kraPin: config.kraPin,
        businessPhone: config.businessPhone,
        subaccountId: subaccount.subaccountId,
        subaccountCode: subaccount.subaccountCode,
        isConfigured: true,
        isVerified: false,
        configuredAt: new Date(),
      };

      landlord.paymentMethod = 'gateway';
      await landlord.save();

      console.log(`✅ Gateway configured successfully for landlord ${landlordId}`);
      console.log(`   Subaccount Code: ${subaccount.subaccountCode}`);

      res.json({
        success: true,
        message: "Payment gateway configured successfully",
        gateway: {
          provider: 'paystack',
          receiveMethod: config.receiveMethod,
          subaccountCode: subaccount.subaccountCode,
          businessName: subaccount.businessName,
          isConfigured: true,
          configuredAt: landlord.gatewayConfig.configuredAt
        }
      });

    } catch (error: any) {
      console.error("❌ Error configuring gateway:", error);
      res.status(500).json({ 
        error: "Failed to configure payment gateway",
        details: error.message 
      });
    }
  }

  /**
   * Get gateway configuration status
   * GET /api/landlords/:landlordId/gateway/status
   */
  static async getGatewayStatus(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      const config = landlord.gatewayConfig;
      
      res.json({
        isConfigured: config?.isConfigured || false,
        provider: config?.provider || null,
        receiveMethod: config?.receiveMethod || null,
        businessName: config?.businessName || null,
        subaccountCode: config?.subaccountCode || null,
        isVerified: config?.isVerified || false,
        configuredAt: config?.configuredAt || null,
        verifiedAt: config?.verifiedAt || null,
        lastTestedAt: config?.lastTestedAt || null,
      });

    } catch (error) {
      console.error("Error getting gateway status:", error);
      res.status(500).json({ error: "Failed to get gateway status" });
    }
  }

  /**
   * Test gateway connection
   * POST /api/landlords/:landlordId/gateway/test
   */
  static async testGateway(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      if (!landlord.gatewayConfig?.isConfigured) {
        return res.status(400).json({ 
          error: "Gateway not configured. Please configure gateway first." 
        });
      }

      // Test Paystack connection
      console.log(`🧪 Testing gateway connection for landlord ${landlordId}...`);
      const testResult = await paystackService.testConnection();

      // Update last tested timestamp
      if (landlord.gatewayConfig) {
        landlord.gatewayConfig.lastTestedAt = new Date();
        await landlord.save();
      }

      if (testResult.success) {
        console.log(`✅ Gateway test successful for landlord ${landlordId}`);
      } else {
        console.log(`❌ Gateway test failed for landlord ${landlordId}: ${testResult.message}`);
      }

      res.json({
        success: testResult.success,
        message: testResult.message,
        testedAt: new Date(),
        provider: 'paystack',
        subaccountCode: landlord.gatewayConfig.subaccountCode
      });

    } catch (error: any) {
      console.error("Error testing gateway:", error);
      res.status(500).json({ 
        error: "Failed to test gateway connection",
        details: error.message 
      });
    }
  }

  /**
   * Delete gateway configuration
   * DELETE /api/landlords/:landlordId/gateway/configure
   */
  static async removeGateway(req: Request, res: Response) {
    try {
      const { landlordId } = req.params;

      const landlord = await Landlord.findById(landlordId);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      // Note: Paystack subaccounts cannot be deleted via API
      // We just clear the local configuration
      landlord.gatewayConfig = {
        provider: 'paystack',
        receiveMethod: 'mobile_money',
        isConfigured: false,
        isVerified: false,
      };
      landlord.paymentMethod = 'manual';
      await landlord.save();

      console.log(`🗑️  Gateway configuration removed for landlord ${landlordId}`);

      res.json({
        success: true,
        message: "Gateway configuration removed successfully"
      });

    } catch (error) {
      console.error("Error removing gateway:", error);
      res.status(500).json({ error: "Failed to remove gateway configuration" });
    }
  }

  /**
   * Validate gateway configuration based on receive method
   */
  private static validateConfig(config: LandlordAccountConfig): string | null {
    switch (config.receiveMethod) {
      case 'mobile_money':
        if (!config.recipientPhone) {
          return "Recipient phone number is required for Mobile Money";
        }
        if (!config.recipientName) {
          return "Recipient name is required for Mobile Money";
        }
        // ID number is optional but recommended
        break;

      case 'paybill':
        if (!config.paybillNumber) {
          return "Paybill number is required for Paybill method";
        }
        if (!config.accountBank || !config.accountNumber) {
          return "Bank account details are required for Paybill method";
        }
        break;

      case 'till':
        if (!config.tillNumber) {
          return "Till number is required for Till method";
        }
        if (!config.accountBank || !config.accountNumber) {
          return "Bank account details are required for Till method";
        }
        break;

      default:
        return `Invalid receive method: ${config.receiveMethod}`;
    }

    return null; // Validation passed
  }
}
