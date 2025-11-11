/**
 * Daraja API Authentication Service
 * 
 * Handles OAuth token generation and management for Safaricom's Daraja API.
 * Token is valid for 1 hour and is cached to avoid unnecessary API calls.
 * 
 * RentEase uses ONE Daraja account for all landlords (Approach 1 - Aggregator Model)
 */

import axios from 'axios';

// Environment configuration
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_ENV = process.env.DARAJA_ENV || 'sandbox';

// Base URLs
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

const BASE_URL = DARAJA_ENV === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;

// Validate required credentials
if (!DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET) {
  throw new Error(
    'Daraja API credentials are required. Set DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET in .env'
  );
}

/**
 * Token cache
 * Stores the access token and its expiry time to avoid unnecessary API calls
 */
interface TokenCache {
  accessToken: string | null;
  expiresAt: number | null; // Timestamp in milliseconds
}

const tokenCache: TokenCache = {
  accessToken: null,
  expiresAt: null
};

/**
 * Generate OAuth access token
 * Token is valid for 1 hour (3600 seconds)
 * 
 * @returns Access token string
 */
export async function generateAccessToken(): Promise<string> {
  try {
    // Check if cached token is still valid (with 5-minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (tokenCache.accessToken && tokenCache.expiresAt && (tokenCache.expiresAt - bufferTime) > now) {
      console.log('✅ Using cached Daraja access token');
      return tokenCache.accessToken;
    }

    console.log('🔄 Generating new Daraja access token...');

    // Create Basic Auth credentials
    const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');

    // Request new token
    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    if (!response.data.access_token) {
      throw new Error('No access token in response');
    }

    // Cache the token
    const expiresIn = parseInt(response.data.expires_in) || 3600; // Default 1 hour
    tokenCache.accessToken = response.data.access_token;
    tokenCache.expiresAt = now + (expiresIn * 1000);

    console.log(`✅ New Daraja access token generated (expires in ${expiresIn}s)`);
    
    return tokenCache.accessToken;
  } catch (error: any) {
    console.error('❌ Failed to generate Daraja access token:', error.response?.data || error.message);
    throw new Error(`Daraja authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Get current access token (generates new one if needed)
 * 
 * @returns Access token string
 */
export async function getAccessToken(): Promise<string> {
  return generateAccessToken();
}

/**
 * Clear token cache (useful for testing or forcing refresh)
 */
export function clearTokenCache(): void {
  tokenCache.accessToken = null;
  tokenCache.expiresAt = null;
  console.log('🗑️  Daraja token cache cleared');
}

/**
 * Test Daraja API connection
 * Attempts to generate a token to verify credentials are correct
 * 
 * @returns Success status and message
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    clearTokenCache(); // Force fresh token generation
    const token = await generateAccessToken();
    
    if (token) {
      return {
        success: true,
        message: `Daraja API connection successful (${DARAJA_ENV} environment)`
      };
    }
    
    return {
      success: false,
      message: 'Failed to obtain access token'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Connection test failed'
    };
  }
}

/**
 * Get Daraja API base URL
 * 
 * @returns Base URL for current environment
 */
export function getBaseUrl(): string {
  return BASE_URL;
}

/**
 * Get current environment
 * 
 * @returns 'sandbox' or 'production'
 */
export function getEnvironment(): string {
  return DARAJA_ENV;
}
