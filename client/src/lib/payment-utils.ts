// Utility helpers for payment/bill calculations
// Keep logic centralized so landlord and tenant views match exactly.

export type PaymentRecord = any;

export function isTransactionRecord(p: PaymentRecord): boolean {
  return !!p?.notes && typeof p.notes === 'string' && p.notes.includes('Payment transaction');
}

export function expectedForBill(bill: PaymentRecord, defaultMonthlyRent = 0): number {
  const monthlyRent = Number(bill?.monthlyRent ?? defaultMonthlyRent ?? 0) || 0;
  const utilities = Number(bill?.totalUtilityCost ?? 0) || 0;
  return monthlyRent + utilities;
}

export function paidForBill(bill: PaymentRecord): number {
  // The `amount` field tracks cumulative payments applied to the bill (per existing conventions)
  return Number(bill?.amount ?? 0) || 0;
}

export function balanceForBill(bill: PaymentRecord, defaultMonthlyRent = 0): number {
  return expectedForBill(bill, defaultMonthlyRent) - paidForBill(bill);
}

export function sumOutstanding(payments: PaymentRecord[] = [], defaultMonthlyRent = 0): number {
  return (payments || [])
    .filter(p => !isTransactionRecord(p))
    .reduce((sum, b) => {
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
