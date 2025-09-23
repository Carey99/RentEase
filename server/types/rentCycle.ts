/**
 * Rent Cycle Types
 * Centralized type definitions for rent cycle functionality
 */

export interface RentCycleData {
  lastPaymentDate?: Date;
  nextDueDate: Date;
  daysRemaining: number;
  rentStatus: 'active' | 'grace_period' | 'overdue' | 'paid_in_advance';
  advancePaymentDays?: number; // Number of days paid in advance
  advancePaymentMonths?: number; // Number of months paid in advance
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
