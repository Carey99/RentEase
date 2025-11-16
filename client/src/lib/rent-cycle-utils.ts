/**
 * Simple rent cycle utilities
 */

/**
 * Helper function to pluralize "day" or "days"
 */
function pluralizeDays(count: number): string {
  return count === 1 ? 'day' : 'days';
}

export function formatRentStatusText(
  daysRemaining: number,
  rentStatus: 'active' | 'overdue' | 'grace_period' | 'paid' | 'partial',
  advancePaymentDays?: number,
  debtAmount?: number,
  monthsOwed?: number,
  paidForMonth?: number,
  paidForYear?: number,
  isNewTenant?: boolean
): string {
  // Handle new tenants - show welcome message instead of overdue
  if (isNewTenant && rentStatus === 'active' && daysRemaining > 0) {
    return `First payment due in ${daysRemaining} ${pluralizeDays(daysRemaining)}`;
  }
  
  // For partial payment status, show "Partial"
  if (rentStatus === 'partial') {
    return 'Partial';
  }
  
  // For paid status, show days remaining to next payment instead of "Paid for Month"
  if (rentStatus === 'paid' && daysRemaining > 0) {
    return `${daysRemaining} ${pluralizeDays(daysRemaining)} remaining`;
  }
  
  if (rentStatus === 'overdue') {
    const absDays = Math.abs(daysRemaining);
    return `Overdue (${absDays} ${pluralizeDays(absDays)})`;
  }
  
  if (rentStatus === 'grace_period') {
    const absDays = Math.abs(daysRemaining);
    return `Grace Period (${absDays} ${pluralizeDays(absDays)} overdue)`;
  }
  
  if (daysRemaining > 0) {
    return `${daysRemaining} ${pluralizeDays(daysRemaining)} remaining`;
  }
  
  return 'Active';
}

export function getRentStatusColor(rentStatus: 'active' | 'overdue' | 'grace_period' | 'paid' | 'partial'): string {
  switch (rentStatus) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'grace_period':
      return 'bg-orange-100 text-orange-800';
    case 'active':
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month - 1] || 'Unknown';
}

export function formatPaymentHistoryMonth(forMonth: number, forYear: number): string {
  const monthName = getMonthName(forMonth);
  return `${monthName} ${forYear}`;
}
