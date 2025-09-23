/**
 * Rent Cycle Types
 * Centralized type definitions for rent cycle functionality
 */

export interface RentCycleData {
  lastPaymentDate?: Date;
  nextDueDate: Date;
  daysRemaining: number;
  rentStatus: 'active' | 'grace_period' | 'overdue' | 'paid_in_advance' | 'partial';
  advancePaymentDays?: number; // Number of days paid in advance
  advancePaymentMonths?: number; // Number of months paid in advance
  debtAmount?: number; // Total amount owed for partial payments
  monthsOwed?: number; // Number of months with unpaid balance
}

export interface RentSettings {
  paymentDay: number;
  gracePeriodDays: number;
}

export interface PaymentRecord {
  amount: number;
  date: Date;
  tenantId: string;
}
