/**
 * Rent Cycle Service
 * Business logic for rent cycle management
 */

import { RentCycleData, RentSettings, PaymentRecord } from '../types/rentCycle';
import { 
  calculateNextDueDate, 
  calculateDaysRemaining, 
  calculateRentStatus, 
  updateRentCycleAfterPayment,
  calculateAdvancePayment,
  calculatePartialPaymentDebt
} from '../utils/rentCycleUtils';

export class RentCycleService {
  /**
   * Get current rent cycle status for a tenant
   */
  static getCurrentRentCycleStatus(
    lastPaymentDate: Date | undefined, 
    paymentDay: number, 
    gracePeriodDays: number = 3,
    rentAmount?: number,
    totalAmountPaid?: number
  ): RentCycleData {
    // Handle case where no payment has been made yet
    if (!lastPaymentDate) {
      return {
        rentStatus: 'overdue',
        daysRemaining: -999, // Indicates no payment made
        nextDueDate: calculateNextDueDate(paymentDay)
      };
    }
    
    let advancePaymentDays = 0;
    let advancePaymentMonths = 0;
    let debtAmount = 0;
    let monthsOwed = 0;
    let isPartialPayment = false;
    
    // Calculate advance payment and partial payment debt if we have the necessary information
    if (rentAmount && totalAmountPaid) {
      // First check for partial payment debt
      const partialPaymentData = calculatePartialPaymentDebt(lastPaymentDate, paymentDay, rentAmount, totalAmountPaid);
      debtAmount = partialPaymentData.debtAmount;
      monthsOwed = partialPaymentData.monthsOwed;
      isPartialPayment = partialPaymentData.isPartialPayment;
      
      // Only calculate advance payment if there's no debt
      if (!isPartialPayment) {
        const advancePayment = calculateAdvancePayment(lastPaymentDate, paymentDay, rentAmount, totalAmountPaid);
        advancePaymentDays = advancePayment.advancePaymentDays;
        advancePaymentMonths = advancePayment.advancePaymentMonths;
      }
    }
    
    // Calculate next due date - if there's advance payment, use advance payment logic
    const nextDueDate = calculateNextDueDate(paymentDay, lastPaymentDate, advancePaymentDays);
    const daysRemaining = calculateDaysRemaining(nextDueDate);
    const rentStatus = calculateRentStatus(daysRemaining, gracePeriodDays, advancePaymentDays, isPartialPayment);
    
    return {
      lastPaymentDate,
      nextDueDate,
      daysRemaining,
      rentStatus,
      advancePaymentDays: advancePaymentDays > 0 ? advancePaymentDays : undefined,
      advancePaymentMonths: advancePaymentMonths > 0 ? advancePaymentMonths : undefined,
      debtAmount: debtAmount > 0 ? debtAmount : undefined,
      monthsOwed: monthsOwed > 0 ? monthsOwed : undefined
    };
  }

  /**
   * Process a tenant payment and update rent cycle
   */
  static processPayment(
    paymentDay: number, 
    gracePeriodDays: number, 
    paymentDate: Date,
    rentAmount?: number,
    totalAmountPaid?: number
  ): RentCycleData {
    return updateRentCycleAfterPayment(paymentDay, gracePeriodDays, paymentDate, rentAmount, totalAmountPaid);
  }

  /**
   * Validate rent settings
   */
  static validateRentSettings(paymentDay: number, gracePeriodDays: number): boolean {
    return paymentDay >= 1 && 
           paymentDay <= 31 && 
           gracePeriodDays >= 0 && 
           gracePeriodDays <= 30;
  }

  /**
   * Get default rent settings
   */
  static getDefaultRentSettings(): RentSettings {
    return {
      paymentDay: 1,
      gracePeriodDays: 3
    };
  }
}
