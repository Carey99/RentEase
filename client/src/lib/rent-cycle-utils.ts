// Frontend rent cycle utilities - mirrors shared utilities for client-side calculations

/**
 * Format days remaining into user-friendly text
 * @param daysRemaining - Days until/past due date
 * @param rentStatus - Current rent status
 * @param advancePaymentDays - Days paid in advance (optional)
 * @returns Human readable status text
 */
export function formatRentStatusText(
  daysRemaining: number, 
  rentStatus: string, 
  advancePaymentDays?: number
): string {
  if (daysRemaining === -999) {
    return "Payment Required";
  }
  
  switch (rentStatus) {
    case 'paid_in_advance':
      if (advancePaymentDays) {
        return advancePaymentDays === 1 
          ? "Paid 1 day in advance" 
          : `Paid ${advancePaymentDays} days in advance`;
      }
      return "Paid in advance";
    case 'active':
      return daysRemaining === 1 ? "1 day remaining" : `${daysRemaining} days remaining`;
    case 'grace_period':
      const overdueDays = Math.abs(daysRemaining);
      return overdueDays === 1 ? "1 day past due (grace period)" : `${overdueDays} days past due (grace period)`;
    case 'overdue':
      const overdueAmount = Math.abs(daysRemaining);
      return overdueAmount === 1 ? "1 day overdue" : `${overdueAmount} days overdue`;
    default:
      return "Status unknown";
  }
}

/**
 * Get badge color class based on rent status
 * @param rentStatus - Current rent status
 * @returns CSS class for badge styling
 */
export function getRentStatusColor(rentStatus: string | undefined): string {
  switch (rentStatus) {
    case 'paid_in_advance':
      return "bg-blue-100 text-blue-800";
    case 'active':
      return "bg-green-100 text-green-800";
    case 'grace_period':
      return "bg-yellow-100 text-yellow-800";
    case 'overdue':
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get rent status priority for sorting (lower number = higher priority)
 * @param rentStatus - Current rent status
 * @returns Priority number
 */
export function getRentStatusPriority(rentStatus: string | undefined): number {
  switch (rentStatus) {
    case 'overdue':
      return 1;
    case 'grace_period':
      return 2;
    case 'active':
      return 3;
    case 'paid_in_advance':
      return 4;
    default:
      return 5;
  }
}
