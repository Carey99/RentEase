/**
 * Encryption utilities for sensitive data
 * Uses AES-256 encryption for credentials
 */

import CryptoJS from 'crypto-js';

// Get encryption key from environment (must be set in production!)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-must-be-32-chars-long!!';

if (!process.env.ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in production! Using default key (INSECURE)');
}

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask a credential for display (show first 4 and last 4 chars)
 */
export function maskCredential(credential: string, visibleChars: number = 4): string {
  if (!credential || credential.length <= visibleChars * 2) {
    return '••••••••••••';
  }
  
  const start = credential.substring(0, visibleChars);
  const end = credential.substring(credential.length - visibleChars);
  const middle = '•'.repeat(Math.max(8, credential.length - (visibleChars * 2)));
  
  return `${start}${middle}${end}`;
}

/**
 * Check if a string is encrypted (AES encrypted strings start with 'U2')
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  // AES encrypted strings from crypto-js typically start with 'U2' after base64 encoding
  return text.length > 20 && /^[A-Za-z0-9+/=]+$/.test(text);
}
