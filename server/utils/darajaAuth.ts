/**
 * Daraja API Authentication Service
 * 
 * Handles OAuth token generation and management for Safaricom's Daraja API.
 * Token is valid for 1 hour and is cached to avoid unnecessary API calls.
 * 
 * UPDATED: Now supports per-landlord credentials (each landlord has their own Daraja account)
 */

import axios from 'axios';

// Base URLs
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

/**
 * Landlord credentials interface
 */
export interface LandlordDarajaCredentials {
  consumerKey: string;
  consumerSecret: string;
  environment: 'sandbox' | 'production';
}

/**
 * Token cache per landlord
 * Key: landlordId, Value: token data
 */
interface TokenCache {
  accessToken: string;
  expiresAt: number; // Timestamp in milliseconds
}

const tokenCacheMap = new Map<string, TokenCache>();

/**
 * Generate cache key for a landlord's credentials
 */
function getCacheKey(consumerKey: string, environment: string): string {
  return `${consumerKey}:${environment}`;
}

/**
 * Get base URL for environment
 */
function getBaseUrlForEnvironment(environment: 'sandbox' | 'production'): string {
  return environment === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

/**
 * Generate OAuth access token for specific landlord credentials
 * Token is valid for 1 hour (3600 seconds)
 * 
 * @param credentials - Landlord's Daraja credentials
 * @param landlordId - Landlord ID for logging purposes
 * @returns Access token string
 */
export async function generateAccessToken(
  credentials: LandlordDarajaCredentials,
  landlordId: string
): Promise<string> {
  try {
    const { consumerKey, consumerSecret, environment } = credentials;
    const cacheKey = getCacheKey(consumerKey, environment);
    
    // Check if cached token is still valid (with 5-minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const cachedToken = tokenCacheMap.get(cacheKey);
    
    if (cachedToken && (cachedToken.expiresAt - bufferTime) > now) {
      console.log(`✅ Using cached Daraja access token for landlord ${landlordId}`);
      return cachedToken.accessToken;
    }

    console.log(`🔄 Generating new Daraja access token for landlord ${landlordId} (${environment})...`);

    // Create Basic Auth credentials
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const baseUrl = getBaseUrlForEnvironment(environment);

    // Request new token
    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
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
    const accessToken = response.data.access_token;
    
    tokenCacheMap.set(cacheKey, {
      accessToken,
      expiresAt: now + (expiresIn * 1000)
    });

    console.log(`✅ New Daraja access token generated for landlord ${landlordId} (expires in ${expiresIn}s)`);
    
    return accessToken;
  } catch (error: any) {
    console.error(`❌ Failed to generate Daraja access token for landlord ${landlordId}:`, error.response?.data || error.message);
    throw new Error(`Daraja authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Get current access token for landlord (generates new one if needed)
 * 
 * @param credentials - Landlord's Daraja credentials
 * @param landlordId - Landlord ID for logging purposes
 * @returns Access token string
 */
export async function getAccessToken(
  credentials: LandlordDarajaCredentials,
  landlordId: string
): Promise<string> {
  return generateAccessToken(credentials, landlordId);
}

/**
 * Clear token cache for specific landlord (useful for testing or forcing refresh)
 * 
 * @param consumerKey - Landlord's consumer key
 * @param environment - Environment (sandbox or production)
 */
export function clearTokenCache(consumerKey: string, environment: string): void {
  const cacheKey = getCacheKey(consumerKey, environment);
  tokenCacheMap.delete(cacheKey);
  console.log(`🗑️  Daraja token cache cleared for ${cacheKey}`);
}

/**
 * Clear all token caches (useful for testing)
 */
export function clearAllTokenCaches(): void {
  tokenCacheMap.clear();
  console.log('🗑️  All Daraja token caches cleared');
}

/**
 * Test Daraja API connection with specific credentials
 * Attempts to generate a token to verify credentials are correct
 * 
 * @param credentials - Landlord's Daraja credentials
 * @param landlordId - Landlord ID for logging purposes
 * @returns Success status and message
 */
export async function testConnection(
  credentials: LandlordDarajaCredentials,
  landlordId: string
): Promise<{ success: boolean; message: string }> {
  try {
    clearTokenCache(credentials.consumerKey, credentials.environment); // Force fresh token generation
    const token = await generateAccessToken(credentials, landlordId);
    
    if (token) {
      return {
        success: true,
        message: `Daraja API connection successful (${credentials.environment} environment)`
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
 * Get Daraja API base URL for environment
 * 
 * @param environment - Environment (sandbox or production)
 * @returns Base URL for specified environment
 */
export function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return getBaseUrlForEnvironment(environment);
}
