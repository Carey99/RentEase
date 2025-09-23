/**
 * Rent Cycle Utilities
 * Pure utility functions for rent cycle calculations
 */

/**
 * Calculate advance payment details based on payment amount vs monthly rent
 * Analyzes if tenant has paid enough to cover future rent cycles
 */
export function calculateAdvancePayment(
  lastPaymentDate: Date,
  paymentDay: number,
  monthlyRentAmount: number,
  totalAmountPaid: number
): { advancePaymentDays: number; advancePaymentMonths: number } {
  if (monthlyRentAmount <= 0 || totalAmountPaid <= 0) {
    return { advancePaymentDays: 0, advancePaymentMonths: 0 };
  }

  const now = new Date();
  const lastPayment = new Date(lastPaymentDate);
  
  // Calculate total months that can be covered by the total amount paid
  const totalMonthsCovered = Math.floor(totalAmountPaid / monthlyRentAmount);
  
  console.log(`🧮 Advance Payment Calculation:`);
  console.log(`  💰 Monthly rent: $${monthlyRentAmount}`);
  console.log(`  💳 Total paid: $${totalAmountPaid}`);
  console.log(`  📅 Months covered: ${totalMonthsCovered}`);
  
  if (totalMonthsCovered <= 1) {
    // Only current month covered, no advance
    return { advancePaymentDays: 0, advancePaymentMonths: 0 };
  }
  
  // Calculate the date up to which rent is covered
  const rentCoveredUntilDate = new Date(
    lastPayment.getFullYear(), 
    lastPayment.getMonth() + totalMonthsCovered, 
    paymentDay
  );
  
  console.log(`  📆 Rent covered until: ${rentCoveredUntilDate.toISOString().split('T')[0]}`);
  console.log(`  📆 Current date: ${now.toISOString().split('T')[0]}`);
  
  // If the coverage extends beyond today, tenant has paid in advance
  if (rentCoveredUntilDate > now) {
    const timeDiff = rentCoveredUntilDate.getTime() - now.getTime();
    const advancePaymentDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // Calculate advance months (excluding current month)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
    const advancePaymentMonths = rentCoveredUntilDate > currentMonthEnd ? totalMonthsCovered - 1 : 0;
    
    console.log(`  ✅ Advance payment detected:`);
    console.log(`    📅 Days in advance: ${advancePaymentDays}`);
    console.log(`    🗓️ Months in advance: ${advancePaymentMonths}`);
    
    return {
      advancePaymentDays: Math.max(0, advancePaymentDays),
      advancePaymentMonths: Math.max(0, advancePaymentMonths)
    };
  }
  
  console.log(`  ❌ No advance payment detected`);
  return { advancePaymentDays: 0, advancePaymentMonths: 0 };
}

export function calculateNextDueDate(
  paymentDay: number, 
  lastPaymentDate?: Date, 
  advancePaymentDays?: number
): Date {
  const now = new Date();
  let nextDue: Date;

  // If tenant has paid in advance, calculate when advance payment runs out
  if (advancePaymentDays && advancePaymentDays > 0) {
    console.log(`  📅 Calculating next due date for advance payment of ${advancePaymentDays} days`);
    nextDue = new Date(now);
    nextDue.setDate(now.getDate() + advancePaymentDays);
    console.log(`  🎯 Next due date (when advance runs out): ${nextDue.toISOString()}`);
    return nextDue;
  }

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

export function calculateRentStatus(
  daysRemaining: number, 
  gracePeriodDays: number,
  advancePaymentDays?: number
): 'active' | 'grace_period' | 'overdue' | 'paid_in_advance' {
  // If there are advance payment days, tenant is paid in advance
  if (advancePaymentDays && advancePaymentDays > 0) {
    return 'paid_in_advance';
  }
  
  if (daysRemaining > 0) {
    return 'active';
  } else if (daysRemaining >= -gracePeriodDays) {
    return 'grace_period';
  } else {
    return 'overdue';
  }
}

export function updateRentCycleAfterPayment(
  paymentDay: number, 
  gracePeriodDays: number, 
  paymentDate: Date,
  rentAmount?: number,
  totalAmountPaid?: number
) {
  let advancePaymentDays = 0;
  let advancePaymentMonths = 0;
  
  // Calculate advance payment if we have rent amount and total paid information
  if (rentAmount && totalAmountPaid) {
    const advancePayment = calculateAdvancePayment(paymentDate, paymentDay, rentAmount, totalAmountPaid);
    advancePaymentDays = advancePayment.advancePaymentDays;
    advancePaymentMonths = advancePayment.advancePaymentMonths;
  }
  
  // Calculate next due date - if there's advance payment, use advance payment logic
  const nextDueDate = calculateNextDueDate(paymentDay, paymentDate, advancePaymentDays);
  const daysRemaining = calculateDaysRemaining(nextDueDate);
  const rentStatus = calculateRentStatus(daysRemaining, gracePeriodDays, advancePaymentDays);

  return {
    lastPaymentDate: paymentDate,
    nextDueDate,
    daysRemaining,
    rentStatus,
    advancePaymentDays: advancePaymentDays > 0 ? advancePaymentDays : undefined,
    advancePaymentMonths: advancePaymentMonths > 0 ? advancePaymentMonths : undefined
  };
}
