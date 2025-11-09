/**
 * Paystack Payment Service
 * 
 * Handles all interactions with Paystack API for Kenya M-Pesa payments
 * Supports: Mobile Money, Paybill, and Till receiving methods
 */

import Paystack from 'paystack-node';
import crypto from 'crypto';

// Environment configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY!;
const PAYSTACK_ENV = process.env.PAYSTACK_ENV || 'test'; // 'test' or 'live'

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
  throw new Error('Paystack API keys are required. Set PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in .env');
}

// Initialize Paystack client
const paystack = new Paystack(PAYSTACK_SECRET_KEY, PAYSTACK_ENV);

/**
 * Payment receiving methods supported by Paystack
 */
export type ReceiveMethod = 'mobile_money' | 'paybill' | 'till';

/**
 * Configuration for landlord's receiving account
 */
export interface LandlordAccountConfig {
  receiveMethod: ReceiveMethod;
  
  // Mobile Money fields
  recipientPhone?: string;
  recipientName?: string;
  idNumber?: string;
  
  // Paybill fields
  paybillNumber?: string;
  paybillAccountReference?: string;
  
  // Till fields
  tillNumber?: string;
  
  // Common business fields
  businessName?: string;
  kraPin?: string;
  businessPhone?: string;
  
  // Bank account details (for settlement)
  accountBank?: string;
  accountNumber?: string;
}

/**
 * Response from Paystack subaccount creation
 */
export interface SubaccountResponse {
  subaccountId: string;
  subaccountCode: string;
  businessName: string;
  settlementBank: string;
  accountNumber: string;
  percentageCharge?: number;
}

/**
 * Payment initiation request
 */
export interface PaymentRequest {
  amount: number; // Amount in smallest currency unit (KES cents)
  phoneNumber: string; // Kenya phone number (254...)
  email: string; // Customer email
  reference: string; // Unique payment reference
  subaccountCode?: string; // Optional subaccount for split payment
  metadata?: Record<string, any>; // Additional data
}

/**
 * Payment initiation response
 */
export interface PaymentResponse {
  success: boolean;
  reference: string;
  transactionId?: string;
  authorizationUrl?: string;
  accessCode?: string;
  message: string;
}

/**
 * Payment verification response
 */
export interface VerificationResponse {
  success: boolean;
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  reference: string;
  amount: number;
  paidAt?: Date;
  channel?: string;
  metadata?: Record<string, any>;
  message: string;
}

class PaystackService {
  /**
   * Create a subaccount for a landlord
   * Allows direct settlement to landlord's account
   */
  async createSubaccount(
    config: LandlordAccountConfig,
    landlordId: string
  ): Promise<SubaccountResponse> {
    try {
      // Validate required fields based on receive method
      this.validateConfig(config);

      // Determine settlement account
      const settlementAccount = this.getSettlementAccount(config);
      
      // Create subaccount via Paystack API
      const response = await paystack.subaccount.create({
        business_name: config.businessName || 'Landlord Account',
        settlement_bank: settlementAccount.bankCode || '063', // Default to Stanbic Bank
        account_number: settlementAccount.accountNumber,
        percentage_charge: 0, // Landlord gets 100% (we absorb Paystack fees)
        description: `RentEase landlord ${landlordId} - ${config.receiveMethod}`,
        metadata: {
          landlordId,
          receiveMethod: config.receiveMethod,
          configuredAt: new Date().toISOString()
        }
      });

      if (!response.status) {
        throw new Error(response.message || 'Failed to create subaccount');
      }

      return {
        subaccountId: response.data.id.toString(),
        subaccountCode: response.data.subaccount_code,
        businessName: response.data.business_name,
        settlementBank: response.data.settlement_bank,
        accountNumber: response.data.account_number,
        percentageCharge: response.data.percentage_charge
      };
    } catch (error: any) {
      console.error('❌ Paystack subaccount creation failed:', error);
      throw new Error(`Failed to create subaccount: ${error.message}`);
    }
  }

  /**
   * Initiate a payment (charge customer)
   * For Kenya, this initiates M-Pesa STK Push
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Initialize transaction
      const initializeData: any = {
        amount: request.amount, // Amount in kobo/cents
        email: request.email,
        reference: request.reference,
        currency: 'KES',
        channels: ['mobile_money'], // Kenya M-Pesa
        metadata: {
          ...request.metadata,
          phoneNumber: request.phoneNumber
        }
      };

      // Add subaccount for split payment if provided
      if (request.subaccountCode) {
        initializeData.subaccount = request.subaccountCode;
      }

      const response = await paystack.transaction.initialize(initializeData);

      if (!response.status) {
        return {
          success: false,
          reference: request.reference,
          message: response.message || 'Failed to initialize payment'
        };
      }

      return {
        success: true,
        reference: request.reference,
        transactionId: response.data.reference,
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        message: 'Payment initialized successfully'
      };
    } catch (error: any) {
      console.error('❌ Paystack payment initiation failed:', error);
      return {
        success: false,
        reference: request.reference,
        message: error.message || 'Payment initiation failed'
      };
    }
  }

  /**
   * Verify a payment status
   * Check if payment was successful
   */
  async verifyPayment(reference: string): Promise<VerificationResponse> {
    try {
      const response = await paystack.transaction.verify(reference);

      if (!response.status) {
        return {
          success: false,
          status: 'failed',
          reference,
          amount: 0,
          message: response.message || 'Payment verification failed'
        };
      }

      const data = response.data;
      
      return {
        success: data.status === 'success',
        status: data.status,
        reference: data.reference,
        amount: data.amount,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
        channel: data.channel,
        metadata: data.metadata,
        message: data.gateway_response || 'Payment verified'
      };
    } catch (error: any) {
      console.error('❌ Paystack payment verification failed:', error);
      return {
        success: false,
        status: 'failed',
        reference,
        amount: 0,
        message: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Verify webhook signature
   * Ensures webhook is from Paystack
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET!)
        .update(payload)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get settlement account details based on receive method
   */
  private getSettlementAccount(config: LandlordAccountConfig): {
    bankCode: string;
    accountNumber: string;
  } {
    // For mobile money, we map phone number to M-Pesa
    if (config.receiveMethod === 'mobile_money' && config.recipientPhone) {
      // Paystack Kenya uses bank code for M-Pesa
      return {
        bankCode: '063', // M-Pesa bank code in Paystack
        accountNumber: config.recipientPhone.replace(/\+/g, '') // Remove + sign
      };
    }

    // For paybill/till, use provided bank details or throw error
    if (config.accountBank && config.accountNumber) {
      return {
        bankCode: config.accountBank,
        accountNumber: config.accountNumber
      };
    }

    throw new Error('Invalid settlement account configuration');
  }

  /**
   * Validate landlord configuration
   */
  private validateConfig(config: LandlordAccountConfig): void {
    if (!config.receiveMethod) {
      throw new Error('Receive method is required');
    }

    switch (config.receiveMethod) {
      case 'mobile_money':
        if (!config.recipientPhone) {
          throw new Error('Recipient phone is required for mobile money');
        }
        if (!config.recipientName) {
          throw new Error('Recipient name is required for mobile money');
        }
        break;

      case 'paybill':
        if (!config.paybillNumber) {
          throw new Error('Paybill number is required');
        }
        if (!config.accountBank || !config.accountNumber) {
          throw new Error('Bank account details are required for paybill');
        }
        break;

      case 'till':
        if (!config.tillNumber) {
          throw new Error('Till number is required');
        }
        if (!config.accountBank || !config.accountNumber) {
          throw new Error('Bank account details are required for till');
        }
        break;

      default:
        throw new Error(`Invalid receive method: ${config.receiveMethod}`);
    }
  }

  /**
   * Test connection to Paystack API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to list banks (lightweight API call)
      const response = await paystack.miscellaneous.list_banks({ country: 'kenya' });
      
      if (response.status) {
        return {
          success: true,
          message: 'Successfully connected to Paystack API'
        };
      }
      
      return {
        success: false,
        message: response.message || 'Failed to connect to Paystack'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const paystackService = new PaystackService();
export default paystackService;
