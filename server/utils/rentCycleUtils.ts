/**
 * Rent Cycle Utilities
 * Pure utility functions for rent cycle calculations
 */

export function calculateNextDueDate(paymentDay: number, lastPaymentDate?: Date): Date {
  const now = new Date();
  let nextDue: Date;

  if (lastPaymentDate) {
    // Calculate next due date based on last payment
    const lastPayment = new Date(lastPaymentDate);
    nextDue = new Date(lastPayment.getFullYear(), lastPayment.getMonth() + 1, paymentDay);
  } else {
    // No payment made yet, use current month or next if past payment day
    const currentDate = now.getDate();
    if (currentDate <= paymentDay) {
      nextDue = new Date(now.getFullYear(), now.getMonth(), paymentDay);
    } else {
      nextDue = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
    }
  }

  return nextDue;
}

export function calculateDaysRemaining(nextDueDate: Date): number {
  const now = new Date();
  const timeDiff = nextDueDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

export function calculateRentStatus(daysRemaining: number, gracePeriodDays: number): 'active' | 'grace_period' | 'overdue' {
  if (daysRemaining > 0) {
    return 'active';
  } else if (daysRemaining >= -gracePeriodDays) {
    return 'grace_period';
  } else {
    return 'overdue';
  }
}

export function updateRentCycleAfterPayment(paymentDay: number, gracePeriodDays: number, paymentDate: Date) {
  const nextDueDate = calculateNextDueDate(paymentDay, paymentDate);
  const daysRemaining = calculateDaysRemaining(nextDueDate);
  const rentStatus = calculateRentStatus(daysRemaining, gracePeriodDays);

  return {
    lastPaymentDate: paymentDate,
    nextDueDate,
    daysRemaining,
    rentStatus
  };
}
