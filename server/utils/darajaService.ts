/**
 * Daraja Service - STK Push Implementation
 * 
 * Handles M-Pesa STK Push payment requests.
 * Routes payments to landlord-specific paybill/till numbers dynamically.
 * 
 * UPDATED: Now supports per-landlord Daraja credentials
 */

import axios from 'axios';
import { getAccessToken, getBaseUrl, LandlordDarajaCredentials } from './darajaAuth';
import { normalizePhoneNumber } from './phoneValidator';
import { generatePaymentReference, generateAccountReference, generateTransactionDescription } from './paymentReference';
import { decrypt, isEncrypted } from './encryption';

/**
 * Landlord with Daraja configuration
 * Using any for database document to avoid type conflicts
 */
export interface LandlordWithDaraja {
  _id: any; // ObjectId or string
  darajaConfig: {
    consumerKey?: string | null;
    consumerSecret?: string | null;
    passkey?: string | null;
    environment?: 'sandbox' | 'production';
    businessShortCode?: string | null;
    businessType?: 'paybill' | 'till' | null;
    isConfigured?: boolean;
    isActive?: boolean;
  };
}

interface STKPushRequest {
  landlordId: string;
  tenantId: string;
  tenantPhone: string;
  amount: number;
  businessShortCode: string;
  businessType: 'paybill' | 'till';
  accountReference?: string;
  transactionDesc?: string;
}

interface STKPushResponse {
  success: boolean;
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

interface STKStatusResponse {
  success: boolean;
  resultCode: string;
  resultDesc: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
}

/**
 * Generate password for STK Push request
 * Password = Base64(BusinessShortCode + Passkey + Timestamp)
 * 
 * @param businessShortCode - Landlord's business short code
 * @param passkey - Landlord's Daraja passkey
 * @param timestamp - Request timestamp
 */
export function generatePassword(
  businessShortCode: string,
  passkey: string,
  timestamp: string
): string {
  if (!passkey) {
    throw new Error('Daraja passkey not configured for this landlord');
  }

  const dataToEncode = `${businessShortCode}${passkey}${timestamp}`;
  return Buffer.from(dataToEncode).toString('base64');
}

/**
 * Generate timestamp in Daraja format: YYYYMMDDHHmmss
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Initiate STK Push to tenant's phone
 * Payment goes directly to landlord's paybill/till
 * 
 * @param request - Payment request details
 * @param landlord - Landlord with Daraja credentials
 */
export async function initiateSTKPush(
  request: STKPushRequest,
  landlord: LandlordWithDaraja
): Promise<STKPushResponse> {
  try {
    console.log('\n💳 Initiating STK Push...');
    console.log('  Landlord ID:', landlord._id);
    console.log('  Amount:', request.amount);
    console.log('  Phone:', request.tenantPhone);
    console.log('  Business Short Code:', request.businessShortCode);
    console.log('  Business Type:', request.businessType);

    // Validate landlord Daraja config
    if (!landlord.darajaConfig.isConfigured || !landlord.darajaConfig.isActive) {
      throw new Error('Landlord M-Pesa payment gateway is not configured or inactive');
    }

    const { consumerKey, consumerSecret, passkey, environment } = landlord.darajaConfig;

    if (!consumerKey || !consumerSecret || !passkey || !environment) {
      throw new Error('Landlord Daraja credentials are incomplete');
    }

    // Safely decrypt credentials (handle both encrypted and plain text)
    let decryptedConsumerKey = consumerKey;
    let decryptedConsumerSecret = consumerSecret;
    let decryptedPasskey = passkey;

    try {
      if (isEncrypted(consumerKey)) {
        decryptedConsumerKey = decrypt(consumerKey);
      }
      if (isEncrypted(consumerSecret)) {
        decryptedConsumerSecret = decrypt(consumerSecret);
      }
      if (isEncrypted(passkey)) {
        decryptedPasskey = decrypt(passkey);
      }
    } catch (error) {
      console.error('Error decrypting credentials in initiateSTKPush:', error);
      // Continue with original values if decryption fails
    }

    console.log('  Environment:', environment);

    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(request.tenantPhone);
    console.log('  Normalized Phone:', phoneNumber);

    // Generate payment reference
    const paymentReference = generatePaymentReference(request.landlordId, request.tenantId);
    console.log('  Payment Reference:', paymentReference);

    // Generate account reference for paybill (max 13 chars)
    const accountRef = request.accountReference || 
                       generateAccountReference(request.tenantId, new Date());
    console.log('  Account Reference:', accountRef);

    // Generate transaction description (max 20 chars)
    const transactionDesc = request.transactionDesc || 
                           generateTransactionDescription(new Date());
    console.log('  Transaction Desc:', transactionDesc);

    // Get access token using landlord's DECRYPTED credentials
    const credentials: LandlordDarajaCredentials = {
      consumerKey: decryptedConsumerKey,
      consumerSecret: decryptedConsumerSecret,
      environment
    };
    const token = await getAccessToken(credentials, landlord._id.toString());

    // Generate timestamp and password using landlord's DECRYPTED passkey
    const timestamp = generateTimestamp();
    const password = generatePassword(
      request.businessShortCode,
      decryptedPasskey,
      timestamp
    );

    // Get callback URL - use environment variable or construct from request
    // For localhost testing, you can use ngrok URL in DARAJA_CALLBACK_URL
    let callbackUrl = process.env.DARAJA_CALLBACK_URL || 'https://your-domain.com/api/daraja/callback';
    
    // If no callback URL is set, log a warning
    if (callbackUrl === 'https://your-domain.com/api/daraja/callback') {
      console.log('⚠️  WARNING: Using placeholder callback URL. Set DARAJA_CALLBACK_URL in .env for testing.');
      console.log('   For localhost testing, use ngrok: DARAJA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/daraja/callback');
    }
    
    console.log('📞 Callback URL:', callbackUrl);

    // Prepare STK Push request
    const stkPushPayload = {
      BusinessShortCode: request.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: request.businessType === 'paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline',
      Amount: Math.round(request.amount), // Must be integer
      PartyA: phoneNumber,
      PartyB: request.businessShortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: transactionDesc
    };

    console.log('\n📤 Sending STK Push request to Daraja API...');

    // Send STK Push request using landlord's environment
    const baseUrl = getBaseUrl(environment);
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ STK Push response received');
    console.log('  Response Code:', response.data.ResponseCode);
    console.log('  Response Description:', response.data.ResponseDescription);

    // Check if request was successful
    if (response.data.ResponseCode === '0') {
      return {
        success: true,
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };
    } else {
      throw new Error(`STK Push failed: ${response.data.ResponseDescription}`);
    }
  } catch (error: any) {
    console.error('❌ STK Push error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.errorMessage || 
      error.response?.data?.ResponseDescription ||
      error.message || 
      'STK Push initiation failed'
    );
  }
}

/**
 * Query STK Push transaction status
 * Check if payment was completed, failed, or still pending
 * 
 * @param businessShortCode - Landlord's business short code
 * @param checkoutRequestId - Checkout request ID from STK Push
 * @param landlord - Landlord with Daraja credentials
 */
export async function querySTKPushStatus(
  businessShortCode: string,
  checkoutRequestId: string,
  landlord: LandlordWithDaraja
): Promise<STKStatusResponse> {
  try {
    console.log('\n🔍 Querying STK Push status...');
    console.log('  Landlord ID:', landlord._id);
    console.log('  Checkout Request ID:', checkoutRequestId);

    // Validate landlord Daraja config
    if (!landlord.darajaConfig.isConfigured || !landlord.darajaConfig.isActive) {
      throw new Error('Landlord M-Pesa payment gateway is not configured or inactive');
    }

    const { consumerKey, consumerSecret, passkey, environment } = landlord.darajaConfig;

    if (!consumerKey || !consumerSecret || !passkey || !environment) {
      throw new Error('Landlord Daraja credentials are incomplete');
    }

    // Safely decrypt credentials (handle both encrypted and plain text)
    let decryptedConsumerKey = consumerKey;
    let decryptedConsumerSecret = consumerSecret;
    let decryptedPasskey = passkey;

    try {
      if (isEncrypted(consumerKey)) {
        decryptedConsumerKey = decrypt(consumerKey);
      }
      if (isEncrypted(consumerSecret)) {
        decryptedConsumerSecret = decrypt(consumerSecret);
      }
      if (isEncrypted(passkey)) {
        decryptedPasskey = decrypt(passkey);
      }
    } catch (error) {
      console.error('Error decrypting credentials in querySTKPushStatus:', error);
      // Continue with original values if decryption fails
    }

    console.log('  Environment:', environment);

    // Get access token using landlord's DECRYPTED credentials
    const credentials: LandlordDarajaCredentials = {
      consumerKey: decryptedConsumerKey,
      consumerSecret: decryptedConsumerSecret,
      environment
    };
    const token = await getAccessToken(credentials, landlord._id.toString());

    // Generate timestamp and password using landlord's DECRYPTED passkey
    const timestamp = generateTimestamp();
    const password = generatePassword(
      businessShortCode,
      decryptedPasskey,
      timestamp
    );

    // Prepare query request
    const queryPayload = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    console.log('📤 Sending status query to Daraja API...');

    // Send query request using landlord's environment
    const baseUrl = getBaseUrl(environment);
    const response = await axios.post(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      queryPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Status query response received');
    console.log('  Result Code:', response.data.ResultCode);
    console.log('  Result Description:', response.data.ResultDesc);

    return {
      success: response.data.ResultCode === '0',
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      merchantRequestId: response.data.MerchantRequestID,
      checkoutRequestId: response.data.CheckoutRequestID
    };
  } catch (error: any) {
    console.error('❌ Status query error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.errorMessage || 
      error.message || 
      'Failed to query payment status'
    );
  }
}

/**
 * Result codes reference:
 * 
 * 0 - Success: Payment completed
 * 1 - Insufficient funds
 * 17 - User cancelled transaction
 * 26 - System busy
 * 1032 - Request cancelled by user
 * 1037 - Timeout (user didn't enter PIN)
 * 2001 - Invalid initiator
 * 4999 - Still processing (pending)
 */
export const RESULT_CODES = {
  SUCCESS: '0',
  INSUFFICIENT_FUNDS: '1',
  USER_CANCELLED: '17',
  SYSTEM_BUSY: '26',
  REQUEST_CANCELLED: '1032',
  TIMEOUT: '1037',
  INVALID_INITIATOR: '2001',
  STILL_PROCESSING: '4999'
};

/**
 * Get human-readable message for result code
 */
export function getResultMessage(resultCode: string): string {
  switch (resultCode) {
    case RESULT_CODES.SUCCESS:
      return 'Payment completed successfully';
    case RESULT_CODES.INSUFFICIENT_FUNDS:
      return 'Insufficient funds in M-Pesa account';
    case RESULT_CODES.USER_CANCELLED:
    case RESULT_CODES.REQUEST_CANCELLED:
      return 'Payment cancelled by user';
    case RESULT_CODES.TIMEOUT:
      return 'Payment timed out - PIN not entered';
    case RESULT_CODES.SYSTEM_BUSY:
      return 'System busy, please try again';
    case RESULT_CODES.INVALID_INITIATOR:
      return 'Invalid payment initiator';
    case RESULT_CODES.STILL_PROCESSING:
      return 'Payment is still being processed - please wait';
    default:
      return `Payment failed (Code: ${resultCode})`;
  }
}
