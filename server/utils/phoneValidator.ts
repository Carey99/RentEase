/**
 * Phone Number Validator and Normalizer for Kenya
 * 
 * Handles various Kenyan phone number formats and normalizes them to 254XXXXXXXXX format
 * which is required by Daraja API.
 * 
 * Supported formats:
 * - 254712345678 (international)
 * - +254712345678 (international with +)
 * - 0712345678 (local)
 * - 712345678 (without leading 0)
 */

/**
 * Kenyan mobile network prefixes
 */
const KENYA_PREFIXES = {
  safaricom: ['7', '1'], // 07xx, 01xx
  airtel: ['7', '1'],     // 07xx, 01xx
  telkom: ['7'],          // 07xx
};

/**
 * Valid starting digits for Kenyan numbers (after 254)
 */
const VALID_STARTS = ['7', '1']; // 07xx, 01xx formats

/**
 * Validate and normalize Kenyan phone number
 * 
 * @param phone - Phone number in any supported format
 * @returns Normalized phone number (254XXXXXXXXX) or null if invalid
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) {
    return null;
  }

  // Remove all spaces, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Already in international format: 254XXXXXXXXX
    if (cleaned.length === 12 && VALID_STARTS.includes(cleaned.charAt(3))) {
      return cleaned;
    }
  } else if (cleaned.startsWith('0')) {
    // Local format: 0XXXXXXXXX
    if (cleaned.length === 10 && VALID_STARTS.includes(cleaned.charAt(1))) {
      return '254' + cleaned.substring(1);
    }
  } else if (cleaned.length === 9) {
    // Without leading 0: XXXXXXXXX
    if (VALID_STARTS.includes(cleaned.charAt(0))) {
      return '254' + cleaned;
    }
  }

  // Invalid format
  return null;
}

/**
 * Validate phone number format
 * 
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  return normalizePhoneNumber(phone) !== null;
}

/**
 * Get network provider from phone number
 * 
 * @param phone - Phone number (any format)
 * @returns Network provider name or 'unknown'
 */
export function getNetworkProvider(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return 'unknown';
  }

  // Get the first digit after 254
  const firstDigit = normalized.charAt(3);
  const secondDigit = normalized.charAt(4);

  // Safaricom: 07xx (0-9), 01xx (0-9)
  if (firstDigit === '7' || firstDigit === '1') {
    // Most common is Safaricom, but Airtel and Telkom also use 7xx
    // For now, we'll default to Safaricom as it's the largest
    return 'Safaricom';
  }

  return 'unknown';
}

/**
 * Format phone number for display
 * 
 * @param phone - Phone number (any format)
 * @returns Formatted phone number (+254 7XX XXX XXX) or original if invalid
 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return phone; // Return original if invalid
  }

  // Format as: +254 7XX XXX XXX
  return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
}

/**
 * Validate multiple phone numbers
 * 
 * @param phones - Array of phone numbers
 * @returns Object with valid and invalid phone numbers
 */
export function validatePhoneNumbers(phones: string[]): {
  valid: string[];
  invalid: string[];
  normalized: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const normalized: string[] = [];

  for (const phone of phones) {
    const norm = normalizePhoneNumber(phone);
    if (norm) {
      valid.push(phone);
      normalized.push(norm);
    } else {
      invalid.push(phone);
    }
  }

  return { valid, invalid, normalized };
}

/**
 * Check if phone number is a Safaricom number (for M-Pesa compatibility)
 * 
 * @param phone - Phone number (any format)
 * @returns true if Safaricom, false otherwise
 */
export function isSafaricomNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return false;
  }

  // Safaricom numbers typically start with 07xx or 01xx
  const firstDigit = normalized.charAt(3);
  
  return firstDigit === '7' || firstDigit === '1';
}

/**
 * Sanitize phone number for logging (mask middle digits)
 * 
 * @param phone - Phone number to sanitize
 * @returns Masked phone number (e.g., 254712***678)
 */
export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return '***';
  }

  // Mask middle digits: 254712***678
  return `${normalized.substring(0, 6)}***${normalized.substring(9)}`;
}
