/**
 * Centralized payment calculation utilities
 * These functions ensure consistent debt/payment calculations across the entire application
 */

export interface PaymentRecord {
  _id?: string;
  amount: number;
  forMonth: number;
  forYear: number;
  paymentDate?: Date;
  monthlyRent: number;
  status: 'pending' | 'partial' | 'completed' | 'overpaid' | 'failed';
  utilityCharges?: Array<{
    type: string;
    unitsUsed: number;
    pricePerUnit: number;
    total: number;
  }>;
  totalUtilityCost?: number;
  notes?: string;
}

/**
 * Filter out payment transaction records to avoid double counting
 * Only returns bill records (not individual payment receipts)
 */
export function filterBillsOnly(payments: any[]): any[] {
  return payments.filter((p: any) => !p.notes?.includes('Payment transaction'));
}

/**
 * Calculate the expected amount for a bill (rent + utilities)
 */
export function calculateExpectedAmount(payment: any): number {
  const rent = Number(payment.monthlyRent || 0);
  const utilities = Number(payment.totalUtilityCost || 0);
  return rent + utilities;
}

/**
 * Calculate the amount paid for a bill
 * ALWAYS uses the amount field which tracks cumulative payments
 */
export function calculatePaidAmount(payment: any): number {
  return Number(payment.amount || 0);
}

/**
 * Calculate the outstanding balance for a bill
 */
export function calculateOutstandingBalance(payment: any): number {
  const expected = calculateExpectedAmount(payment);
  const paid = calculatePaidAmount(payment);
  return Math.max(0, expected - paid); // Only positive balances
}

/**
 * Calculate total outstanding debt across all bills
 */
export function calculateTotalDebt(payments: any[]): number {
  const bills = filterBillsOnly(payments);
  return bills.reduce((sum, bill) => {
    return sum + calculateOutstandingBalance(bill);
  }, 0);
}

/**
 * Calculate total revenue collected for a specific month
 * Returns the sum of all payments made in that month (from transaction records)
 */
export function calculateMonthlyRevenue(payments: any[], month: number, year: number): number {
  // Get transaction records for the specific month
  const transactions = payments.filter((p: any) => 
    p.notes?.includes('Payment transaction') &&
    p.forMonth === month && 
    p.forYear === year
  );
  
  // Sum up the actual payment amounts
  return transactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
}

/**
 * Calculate total revenue collected for current month from bills
 * Alternative approach: look at bill records and sum their amount fields for current month
 */
export function calculateMonthlyRevenueFromBills(payments: any[], month: number, year: number): number {
  const bills = filterBillsOnly(payments);
  const currentMonthBills = bills.filter((p: any) => 
    p.forMonth === month && p.forYear === year
  );
  
  return currentMonthBills.reduce((sum: number, bill: any) => 
    sum + calculatePaidAmount(bill), 0
  );
}

/**
 * Get all bills with outstanding balances (for pending bills count)
 */
export function getBillsWithDebt(payments: any[]): any[] {
  const bills = filterBillsOnly(payments);
  return bills.filter(bill => calculateOutstandingBalance(bill) > 0);
}

/**
 * Calculate payment statistics for a specific month
 */
export function calculateMonthlyStats(payments: any[], month: number, year: number) {
  const bills = filterBillsOnly(payments);
  const monthBills = bills.filter((p: any) => p.forMonth === month && p.forYear === year);
  
  const expected = monthBills.reduce((sum, bill) => sum + calculateExpectedAmount(bill), 0);
  const paid = monthBills.reduce((sum, bill) => sum + calculatePaidAmount(bill), 0);
  const outstanding = monthBills.reduce((sum, bill) => sum + calculateOutstandingBalance(bill), 0);
  
  return {
    expected,
    paid,
    outstanding,
    collectionRate: expected > 0 ? Math.round((paid / expected) * 100) : 0,
    billCount: monthBills.length,
  };
}

/**
 * Check if a bill is fully paid
 */
export function isFullyPaid(payment: any): boolean {
  const outstanding = calculateOutstandingBalance(payment);
  return outstanding === 0;
}

/**
 * Check if a bill has any payment
 */
export function hasAnyPayment(payment: any): boolean {
  return calculatePaidAmount(payment) > 0;
}
