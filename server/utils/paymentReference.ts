// Payment Reference Generator for RentEase
// Format: RE-YYYYMM-LXXX-TXXX-RANDOM

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatIdForReference(id: string, prefix: string): string {
  const idStr = id.toString();
  const last3 = idStr.slice(-3).padStart(3, '0');
  return prefix + last3;
}

export function generatePaymentReference(landlordId: string, tenantId: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = year.toString() + month;
  
  const landlordRef = formatIdForReference(landlordId, 'L');
  const tenantRef = formatIdForReference(tenantId, 'T');
  const random = generateRandomString(6);
  
  return 'RE-' + yearMonth + '-' + landlordRef + '-' + tenantRef + '-' + random;
}

// Overload 1: Simple version with tenantId and date
export function generateAccountReference(tenantId: string, date: Date): string;
// Overload 2: Full version with property details
export function generateAccountReference(propertyName: string, unitNumber: string, month?: string): string;
// Implementation
export function generateAccountReference(arg1: string, arg2: string | Date, month?: string): string {
  // Simple version: tenantId + date
  if (arg2 instanceof Date) {
    const tenantShort = arg1.slice(-4).toUpperCase();
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthShort = monthNames[arg2.getMonth()];
    return `T${tenantShort}-${monthShort}`.substring(0, 13);
  }
  
  // Full version: propertyName + unitNumber + optional month
  const propShort = arg1.substring(0, 4).toUpperCase().replace(/\s/g, '');
  const unitShort = arg2.substring(0, 3).toUpperCase().replace(/\s/g, '');
  
  if (month) {
    const monthNum = parseInt(month);
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthShort = monthNum && monthNum >= 1 && monthNum <= 12 ? monthNames[monthNum - 1] : month.substring(0, 3).toUpperCase();
    return (propShort + '-' + unitShort + '-' + monthShort).substring(0, 13);
  }
  
  return (propShort + '-' + unitShort).substring(0, 13);
}

export function parsePaymentReference(reference: string): { yearMonth: string; landlordRef: string; tenantRef: string; random: string; } | null {
  const parts = reference.split('-');
  if (parts.length !== 5 || parts[0] !== 'RE') {
    return null;
  }
  return {
    yearMonth: parts[1],
    landlordRef: parts[2],
    tenantRef: parts[3],
    random: parts[4]
  };
}

export function isValidPaymentReference(reference: string): boolean {
  return parsePaymentReference(reference) !== null;
}

// Overload 1: Simple version with just date
export function generateTransactionDescription(date: Date): string;
// Overload 2: Full version with property details
export function generateTransactionDescription(propertyName: string, month: string): string;
// Implementation
export function generateTransactionDescription(arg1: Date | string, month?: string): string {
  // Simple version: just date
  if (arg1 instanceof Date) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthShort = monthNames[arg1.getMonth()];
    return `Rent-${monthShort}`.substring(0, 20);
  }
  
  // Full version: propertyName + month
  const propShort = arg1.substring(0, 5).replace(/\s/g, '');
  const monthShort = month!.substring(0, 3);
  return ('Rent-' + propShort + '-' + monthShort).substring(0, 20);
}
