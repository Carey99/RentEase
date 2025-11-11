/**
 * Daraja Service - STK Push Implementation
 * 
 * Handles M-Pesa STK Push payment requests.
 * Routes payments to landlord-specific paybill/till numbers dynamically.
 */

import axios from 'axios';
import { getAccessToken, getBaseUrl } from './darajaAuth';
import { normalizePhoneNumber } from './phoneValidator';
import { generatePaymentReference, generateAccountReference, generateTransactionDescription } from './paymentReference';

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
 */
export function generatePassword(businessShortCode: string, timestamp: string): string {
  const passkey = process.env.DARAJA_PASSKEY;
  if (!passkey) {
    throw new Error('DARAJA_PASSKEY not configured');
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
 */
export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  try {
    console.log('\n💳 Initiating STK Push...');
    console.log('  Amount:', request.amount);
    console.log('  Phone:', request.tenantPhone);
    console.log('  Business Short Code:', request.businessShortCode);
    console.log('  Business Type:', request.businessType);

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

    // Get access token
    const token = await getAccessToken();

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(request.businessShortCode, timestamp);

    // Get callback URL (in production, this should be your public domain)
    const callbackUrl = process.env.DARAJA_CALLBACK_URL || 'https://your-domain.com/api/daraja/callback';

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

    // Send STK Push request
    const baseUrl = getBaseUrl();
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
 */
export async function querySTKPushStatus(
  businessShortCode: string,
  checkoutRequestId: string
): Promise<STKStatusResponse> {
  try {
    console.log('\n🔍 Querying STK Push status...');
    console.log('  Checkout Request ID:', checkoutRequestId);

    // Get access token
    const token = await getAccessToken();

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(businessShortCode, timestamp);

    // Prepare query request
    const queryPayload = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    console.log('📤 Sending status query to Daraja API...');

    // Send query request
    const baseUrl = getBaseUrl();
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
 */
export const RESULT_CODES = {
  SUCCESS: '0',
  INSUFFICIENT_FUNDS: '1',
  USER_CANCELLED: '17',
  SYSTEM_BUSY: '26',
  REQUEST_CANCELLED: '1032',
  TIMEOUT: '1037',
  INVALID_INITIATOR: '2001'
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
    default:
      return `Payment failed (Code: ${resultCode})`;
  }
}
