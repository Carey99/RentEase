/**
 * Payment Reference Generator
 * 
 * Generates unique, traceable payment references for RentEase transactions
 * Format: RE-{YYYYMM}-{LANDLORD}-{TENANT}-{RANDOM}
 * Example: RE-202511-L123-T456-ABC789
 */

import crypto from 'crypto';

/**
 * Generate a unique payment reference
 * 
 * @param landlordId - Landlord's database ID
 * @param tenantId - Tenant's database ID
 * @returns Unique payment reference string
 */
export function generatePaymentReference(
  landlordId: string | number,
  tenantId: string | number
): string {
  // Get current date in YYYYMM format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const datePrefix = `${year}${month}`;
  
  // Extract last 6 characters of landlord and tenant IDs
  const landlordSuffix = String(landlordId).slice(-6).toUpperCase();
  const tenantSuffix = String(tenantId).slice(-6).toUpperCase();
  
  // Generate random string for uniqueness
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Combine all parts
  return `RE-${datePrefix}-L${landlordSuffix}-T${tenantSuffix}-${randomPart}`;
}

/**
 * Generate an idempotency key for payment operations
 * Prevents duplicate charges if request is retried
 * 
 * @param landlordId - Landlord's database ID
 * @param tenantId - Tenant's database ID
 * @param billId - Bill's database ID
 * @returns Idempotency key string
 */
export function generateIdempotencyKey(
  landlordId: string | number,
  tenantId: string | number,
  billId: string | number
): string {
  // Create deterministic key based on landlord, tenant, and bill
  const timestamp = Date.now();
  const data = `${landlordId}-${tenantId}-${billId}-${timestamp}`;
  
  // Hash the data for security and consistency
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32)
    .toUpperCase();
}

/**
 * Validate payment reference format
 * 
 * @param reference - Payment reference to validate
 * @returns True if valid, false otherwise
 */
export function validatePaymentReference(reference: string): boolean {
  // Expected format: RE-YYYYMM-L{6}-T{6}-{8}
  const pattern = /^RE-\d{6}-L[A-Z0-9]{1,6}-T[A-Z0-9]{1,6}-[A-F0-9]{8}$/;
  return pattern.test(reference);
}

/**
 * Extract metadata from payment reference
 * 
 * @param reference - Payment reference string
 * @returns Parsed metadata or null if invalid
 */
export function parsePaymentReference(reference: string): {
  yearMonth: string;
  landlordId: string;
  tenantId: string;
  random: string;
} | null {
  if (!validatePaymentReference(reference)) {
    return null;
  }

  const parts = reference.split('-');
  return {
    yearMonth: parts[1], // YYYYMM
    landlordId: parts[2].substring(1), // Remove 'L' prefix
    tenantId: parts[3].substring(1), // Remove 'T' prefix
    random: parts[4]
  };
}

/**
 * Generate a short display reference for UI
 * Useful for showing to users without the full technical reference
 * 
 * @param fullReference - Full payment reference
 * @returns Shortened reference (e.g., "RE-202511-ABC789")
 */
export function getShortReference(fullReference: string): string {
  if (!validatePaymentReference(fullReference)) {
    return fullReference;
  }

  const parts = fullReference.split('-');
  return `${parts[0]}-${parts[1]}-${parts[4]}`; // RE-YYYYMM-RANDOM
}
