/**
 * Payment status text generation
 * Consolidated payment status logic
 * (Consolidates from rent-cycle-utils and payment-utils)
 */

export interface RentCycleData {
  daysRemaining?: number;
  rentStatus?: string;
  advancePaymentDays?: number;
  debtAmount?: number;
  monthsOwed?: number;
}

/**
 * Generate human-readable rent status text
 * @param daysRemaining - Days until rent is due
 * @param rentStatus - Current rent status
 * @param advancePaymentDays - Days paid in advance
 * @param debtAmount - Amount owed
 * @param monthsOwed - Number of months behind
 * @returns Human-readable status text
 */
export function formatRentStatusText(
  daysRemaining: number = 0,
  rentStatus: string = 'active',
  advancePaymentDays: number = 0,
  debtAmount: number = 0,
  monthsOwed: number = 0
): string {
  if (rentStatus === 'paid_in_advance') {
    if (monthsOwed && monthsOwed > 0) {
      return `Paid ${monthsOwed > 1 ? monthsOwed + ' months' : monthsOwed + ' month'} ahead`;
    }
    if (advancePaymentDays && advancePaymentDays > 0) {
      return `${advancePaymentDays} days ahead`;
    }
    return 'Paid in advance';
  }
  
  if (rentStatus === 'paid') {
    return 'Paid';
  }
  
  if (rentStatus === 'partial') {
    if (debtAmount) {
      return `KSH ${debtAmount.toLocaleString()} due`;
    }
    return 'Partial payment';
  }
  
  if (rentStatus === 'active' && daysRemaining) {
    if (daysRemaining > 0) {
      return `${daysRemaining} days remaining`;
    }
    return 'Overdue';
  }
  
  return 'Active';
}

/**
 * Get color for rent status
 * @param rentStatus - Current rent status
 * @returns Tailwind color class
 */
export function getRentStatusColor(
  rentStatus: string
): 'text-green-600' | 'text-amber-600' | 'text-red-600' | 'text-blue-600' {
  switch (rentStatus) {
    case 'paid':
    case 'paid_in_advance':
      return 'text-green-600';
    case 'partial':
      return 'text-amber-600';
    case 'overdue':
      return 'text-red-600';
    case 'active':
    default:
      return 'text-blue-600';
  }
}
