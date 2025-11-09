/**
 * Phone Number Normalizer for Kenya
 * 
 * Formats and validates Kenyan phone numbers for M-Pesa payments
 * Supports various input formats and normalizes to 254XXXXXXXXX
 */

/**
 * Normalize a Kenyan phone number to international format (254XXXXXXXXX)
 * 
 * Handles various input formats:
 * - 0712345678 → 254712345678
 * - 712345678 → 254712345678
 * - +254712345678 → 254712345678
 * - 254712345678 → 254712345678
 * - 07 1234 5678 → 254712345678
 * 
 * @param phone - Phone number in any format
 * @returns Normalized phone number (254XXXXXXXXX) or null if invalid
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) {
    return null;
  }

  // Remove all whitespace, hyphens, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Already in international format (254XXXXXXXXX)
    // Do nothing
  } else if (cleaned.startsWith('0')) {
    // Local format starting with 0 (0712345678)
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Missing leading 0 (712345678)
    cleaned = '254' + cleaned;
  } else {
    // Invalid format
    return null;
  }
  
  // Validate the normalized phone number
  if (isValidKenyanPhone(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * Validate if a phone number is a valid Kenyan mobile number
 * 
 * Valid Kenyan mobile prefixes:
 * - Safaricom: 254 7XX, 254 1XX
 * - Airtel: 254 7XX, 254 1XX
 * - Telkom: 254 7XX
 * 
 * @param phone - Phone number to validate (should be 254XXXXXXXXX format)
 * @returns True if valid Kenyan mobile number
 */
export function isValidKenyanPhone(phone: string): boolean {
  if (!phone) {
    return false;
  }

  // Must be exactly 12 digits (254 + 9 digits)
  if (phone.length !== 12) {
    return false;
  }

  // Must start with 254
  if (!phone.startsWith('254')) {
    return false;
  }

  // Extract the prefix after 254 (should be 7 or 1)
  const prefix = phone.substring(3, 4);
  
  // Valid Kenyan mobile prefixes start with 7 or 1
  if (prefix !== '7' && prefix !== '1') {
    return false;
  }

  // Ensure all characters are digits
  if (!/^\d+$/.test(phone)) {
    return false;
  }

  return true;
}

/**
 * Format phone number for display to users
 * 
 * @param phone - Phone number in any format
 * @returns Formatted phone number (+254 712 345 678) or original if invalid
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return phone; // Return original if invalid
  }

  // Format as +254 7XX XXX XXX
  return `+${normalized.substring(0, 3)} ${normalized.substring(3, 6)} ${normalized.substring(6, 9)} ${normalized.substring(9)}`;
}

/**
 * Format phone number for M-Pesa API (0712345678 format)
 * Some APIs prefer this format
 * 
 * @param phone - Phone number in any format
 * @returns Formatted phone number (0712345678) or null if invalid
 */
export function formatPhoneForMPesa(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return null;
  }

  // Convert 254712345678 to 0712345678
  return '0' + normalized.substring(3);
}

/**
 * Extract mobile network operator from phone number
 * 
 * @param phone - Phone number in any format
 * @returns Network operator ('safaricom', 'airtel', 'telkom') or 'unknown'
 */
export function getNetworkOperator(phone: string): 'safaricom' | 'airtel' | 'telkom' | 'unknown' {
  const normalized = normalizePhoneNumber(phone);
  
  if (!normalized) {
    return 'unknown';
  }

  // Extract the first 4 digits after 254
  const prefix = normalized.substring(3, 7);
  
  // Safaricom prefixes
  const safaricomPrefixes = [
    '0700', '0701', '0702', '0703', '0704', '0705', '0706', '0707', '0708', '0709',
    '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719',
    '0720', '0721', '0722', '0723', '0724', '0725', '0726', '0727', '0728', '0729',
    '0740', '0741', '0742', '0743', '0745', '0746', '0748',
    '0757', '0758', '0759',
    '0768', '0769',
    '0790', '0791', '0792', '0793', '0794', '0795', '0796', '0797', '0798', '0799',
    '0110', '0111', '0112', '0113', '0114', '0115'
  ];

  // Airtel prefixes
  const airtelPrefixes = [
    '0730', '0731', '0732', '0733', '0734', '0735', '0736', '0737', '0738', '0739',
    '0750', '0751', '0752', '0753', '0754', '0755', '0756',
    '0780', '0781', '0782', '0783', '0784', '0785', '0786', '0787', '0788', '0789',
    '0100', '0101', '0102', '0103', '0104', '0105', '0106', '0107', '0108', '0109'
  ];

  // Telkom prefixes
  const telkomPrefixes = [
    '0770', '0771', '0772', '0773', '0774', '0775', '0776', '0777', '0778', '0779'
  ];

  // Check which operator
  if (safaricomPrefixes.some(p => prefix.startsWith(p.substring(1)))) {
    return 'safaricom';
  }
  if (airtelPrefixes.some(p => prefix.startsWith(p.substring(1)))) {
    return 'airtel';
  }
  if (telkomPrefixes.some(p => prefix.startsWith(p.substring(1)))) {
    return 'telkom';
  }

  return 'unknown';
}

/**
 * Validate and normalize phone number with detailed error messages
 * 
 * @param phone - Phone number to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePhone(phone: string): {
  valid: boolean;
  normalized: string | null;
  error: string | null;
} {
  if (!phone || phone.trim() === '') {
    return {
      valid: false,
      normalized: null,
      error: 'Phone number is required'
    };
  }

  const normalized = normalizePhoneNumber(phone);

  if (!normalized) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid phone number format. Please use format: 0712345678'
    };
  }

  if (!isValidKenyanPhone(normalized)) {
    return {
      valid: false,
      normalized: null,
      error: 'Phone number must be a valid Kenyan mobile number (07XX XXX XXX)'
    };
  }

  return {
    valid: true,
    normalized,
    error: null
  };
}
