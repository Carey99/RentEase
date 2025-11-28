/**
 * Password validation utilities
 * Centralized password strength checking and requirements validation
 */

export interface PasswordStrengthResult {
  score: number;           // 0-6
  label: 'Weak' | 'Medium' | 'Strong' | '';
  color: 'bg-red-500' | 'bg-amber-500' | 'bg-emerald-500' | '';
}

export interface PasswordRequirement {
  met: boolean;
  label: string;
}

/**
 * Check password strength and return score, label, and color
 * @param password - Password to check
 * @returns Object with score (0-6), label, and Tailwind color class
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

/**
 * Get password requirements checklist
 * @param password - Password to validate against requirements
 * @returns Array of requirements with met status
 */
export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: password.length >= 12, label: 'At least 12 characters' },
    { met: /[a-z]/.test(password), label: 'Lowercase letter' },
    { met: /[A-Z]/.test(password), label: 'Uppercase letter' },
    { met: /[0-9]/.test(password), label: 'Number' },
    { met: /[^a-zA-Z0-9]/.test(password), label: 'Special character' },
  ];
}
