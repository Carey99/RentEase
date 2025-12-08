// Utility helpers for payment/bill calculations
// Keep logic centralized so landlord and tenant views match exactly.

export type PaymentRecord = any;

export function isTransactionRecord(p: PaymentRecord): boolean {
  return !!p?.notes && typeof p.notes === 'string' && p.notes.includes('Payment transaction');
}

export function expectedForBill(bill: PaymentRecord, defaultMonthlyRent = 0): number {
  // CRITICAL: Determine if bill.monthlyRent already includes utilities
  // If defaultMonthlyRent is provided and > 0, use it (it's the base rent from property)
  // If defaultMonthlyRent is 0 or not provided, use bill.monthlyRent as the TOTAL
  // (assume bill.monthlyRent already includes utilities to avoid double-counting)
  
  if (defaultMonthlyRent > 0) {
    // We have clean base rent from property, add utilities from bill
    const utilities = Number(bill?.totalUtilityCost ?? 0) || 0;
    return defaultMonthlyRent + utilities;
  } else {
    // No base rent provided, use bill.monthlyRent as final amount
    // DO NOT add utilities again as bill.monthlyRent likely already includes them
    return Number(bill?.monthlyRent ?? 0) || 0;
  }
}

export function paidForBill(bill: PaymentRecord): number {
  // The `amount` field tracks cumulative payments applied to the bill (per existing conventions)
  return Number(bill?.amount ?? 0) || 0;
}

export function balanceForBill(bill: PaymentRecord, defaultMonthlyRent = 0): number {
  return expectedForBill(bill, defaultMonthlyRent) - paidForBill(bill);
}

/**
 * Calculate expected amount for CURRENT MONTH including ALL historical debts
 * This consolidates all previous unpaid balances into the current month
 */
export function expectedForCurrentMonth(
  allBills: PaymentRecord[], 
  currentMonth: number, 
  currentYear: number,
  defaultMonthlyRent = 0
): number {
  // Filter out transaction records
  const bills = allBills.filter(p => !isTransactionRecord(p));
  
  // Get current month's bill
  const currentBill = bills.find(b => b.forMonth === currentMonth && b.forYear === currentYear);
  if (!currentBill) return 0;
  
  // Current month's charges
  const currentMonthExpected = expectedForBill(currentBill, defaultMonthlyRent);
  
  // Get ALL previous month's unpaid balances
  const previousBills = bills.filter(b => {
    // Previous months
    return (b.forYear < currentYear) || (b.forYear === currentYear && b.forMonth < currentMonth);
  });
  
  const historicalDebt = previousBills.reduce((sum, b) => {
    const expected = expectedForBill(b, defaultMonthlyRent);
    const paid = paidForBill(b);
    const balance = expected - paid;
    return sum + (balance > 0 ? balance : 0);
  }, 0);
  
  return currentMonthExpected + historicalDebt;
}

/**
 * Calculate balance for CURRENT MONTH including historical debts
 */
export function balanceForCurrentMonth(
  allBills: PaymentRecord[],
  currentMonth: number,
  currentYear: number,
  defaultMonthlyRent = 0
): number {
  const bills = allBills.filter(p => !isTransactionRecord(p));
  const currentBill = bills.find(b => b.forMonth === currentMonth && b.forYear === currentYear);
  if (!currentBill) return 0;
  
  const totalExpected = expectedForCurrentMonth(allBills, currentMonth, currentYear, defaultMonthlyRent);
  const totalPaid = paidForBill(currentBill);
  
  return totalExpected - totalPaid;
}

export function sumOutstanding(payments: PaymentRecord[] = [], defaultMonthlyRent = 0): number {
  // Filter out transaction records and get only bill records
  const bills = (payments || []).filter(p => !isTransactionRecord(p));
  
  // Group bills by month/year to handle duplicates
  const billsByMonth = new Map<string, PaymentRecord>();
  
  bills.forEach(bill => {
    const key = `${bill.forMonth}-${bill.forYear}`;
    const existing = billsByMonth.get(key);
    
    // If duplicate exists, keep the one with more recent date or higher amount paid
    if (!existing || new Date(bill.paymentDate) > new Date(existing.paymentDate)) {
      billsByMonth.set(key, bill);
    }
  });
  
  // Sum up outstanding balances from unique bills only
  return Array.from(billsByMonth.values()).reduce((sum, b) => {
    const bal = balanceForBill(b, defaultMonthlyRent);
    return sum + (bal > 0 ? bal : 0);
  }, 0);
}

export default {
  isTransactionRecord,
  expectedForBill,
  paidForBill,
  balanceForBill,
  sumOutstanding,
};
