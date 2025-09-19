/**
 * Rent Cycle Service
 * Business logic for rent cycle management
 */

import { RentCycleData, RentSettings, PaymentRecord } from '../types/rentCycle';
import { 
  calculateNextDueDate, 
  calculateDaysRemaining, 
  calculateRentStatus, 
  updateRentCycleAfterPayment 
} from '../utils/rentCycleUtils';

export class RentCycleService {
  /**
   * Get current rent cycle status for a tenant
   */
  static getCurrentRentCycleStatus(
    lastPaymentDate: Date | undefined, 
    paymentDay: number, 
    gracePeriodDays: number = 3
  ): RentCycleData {
    // Handle case where no payment has been made yet
    if (!lastPaymentDate) {
      return {
        rentStatus: 'overdue',
        daysRemaining: -999, // Indicates no payment made
        nextDueDate: calculateNextDueDate(paymentDay)
      };
    }
    
    const nextDueDate = calculateNextDueDate(paymentDay, lastPaymentDate);
    const daysRemaining = calculateDaysRemaining(nextDueDate);
    const rentStatus = calculateRentStatus(daysRemaining, gracePeriodDays);
    
    return {
      lastPaymentDate,
      nextDueDate,
      daysRemaining,
      rentStatus
    };
  }

  /**
   * Process a tenant payment and update rent cycle
   */
  static processPayment(
    paymentDay: number, 
    gracePeriodDays: number, 
    paymentDate: Date
  ): RentCycleData {
    return updateRentCycleAfterPayment(paymentDay, gracePeriodDays, paymentDate);
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
