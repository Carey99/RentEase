import { type RentStatus } from "@shared/schema";
import { Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel } from "../database";

/**
 * RentCycleStorage - Handles rent cycle calculations and updates
 * Scope: Rent cycle state, payment tracking, status calculations, rent settings
 * Collections: Tenant, Property (rentSettings), PaymentHistory
 * Dependencies: PaymentStorage (for payment history queries)
 * 
 * KEY CONCEPTS:
 * - currentMonthPaid: Boolean flag set to true when current month rent is paid
 * - rentStatus: 'active' | 'paid' | 'partial' | 'grace_period' | 'overdue'
 * - isNewTenant: Flag for newly registered tenants with no payment history
 */
export class RentCycleStorage {
  /**
   * Calculate rent cycle data for a tenant
   * Returns: Payment status, days remaining, next due date, rent status
   */
  async getRentCycleForTenant(tenant: any, property: any) {
    try {
      console.log(`🔄 Calculating rent cycle for tenant: ${tenant.fullName} (${tenant._id})`);

      // Get rent settings from property or use defaults
      const rentSettings = {
        paymentDay: property?.rentSettings?.paymentDay || 1,
        gracePeriodDays: property?.rentSettings?.gracePeriodDays || 3
      };
      console.log(`  ⚙️  Rent settings:`, rentSettings);

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get tenant registration date to check if they're new
      const tenantCreatedAt = tenant.createdAt ? new Date(tenant.createdAt) : now;
      const tenantRegistrationMonth = tenantCreatedAt.getMonth() + 1;
      const tenantRegistrationYear = tenantCreatedAt.getFullYear();

      const registeredThisMonth = (tenantRegistrationMonth === currentMonth && tenantRegistrationYear === currentYear);
      console.log(`  🆕 Registration check: Registered ${tenantCreatedAt.toDateString()}, registeredThisMonth: ${registeredThisMonth}`);

      // Check if tenant has ANY payment history
      const anyPayments = await PaymentHistoryModel.find({
        tenantId: tenant._id
      }).lean();

      const hasAnyPayments = anyPayments.length > 0;
      const isNewTenant = registeredThisMonth && !hasAnyPayments;

      console.log(`  🆕 Has any payments: ${hasAnyPayments}, Is truly new tenant: ${isNewTenant}`);

      // Check for bills for current month (exclude transaction records)
      const currentMonthBills = await PaymentHistoryModel.find({
        tenantId: tenant._id,
        forMonth: currentMonth,
        forYear: currentYear,
        notes: { $not: /Payment transaction/ }
      }).sort({ createdAt: -1 }).lean();

      const currentMonthBill = currentMonthBills.length > 0 ? currentMonthBills[0] : null;

      if (currentMonthBills.length > 1) {
        console.log(`  ⚠️  WARNING: Found ${currentMonthBills.length} bills for ${currentMonth}/${currentYear}, using most recent`);
      }

      // Check payment status
      const currentMonthPaid = currentMonthBill?.status === 'completed' || currentMonthBill?.status === 'overpaid';
      const hasPartialPayment = currentMonthBill?.status === 'partial';

      console.log(`  📋 Current month bill:`, {
        exists: !!currentMonthBill,
        status: currentMonthBill?.status,
        amount: currentMonthBill?.amount,
        monthlyRent: currentMonthBill?.monthlyRent,
      });

      // Get last completed bill across ALL months
      const allCompletedBills = await PaymentHistoryModel.find({
        tenantId: tenant._id,
        status: { $in: ['completed', 'overpaid'] },
        notes: { $not: /Payment transaction/ }
      }).sort({ paymentDate: -1 }).limit(1).lean();

      const lastPayment = allCompletedBills.length > 0 ? allCompletedBills[0] : null;

      console.log(`  💰 Current month (${currentMonth}/${currentYear}) PAID: ${currentMonthPaid}`);

      // Calculate due dates
      const currentDueDate = new Date(currentYear, currentMonth - 1, rentSettings.paymentDay);
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const nextDueDate = new Date(nextYear, nextMonth - 1, rentSettings.paymentDay);

      let rentStatus: 'active' | 'overdue' | 'grace_period' | 'paid' | 'partial' = 'active';
      let daysRemaining: number;

      // Determine rent status
      if (!currentMonthBill) {
        rentStatus = 'active';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  ✨ No bill for current month - tenant is current: ${daysRemaining} days to next cycle`);
      } else if (currentMonthPaid) {
        rentStatus = 'paid';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  ✅ PAID for ${currentMonth}/${currentYear}: Next due in ${daysRemaining} days`);
      } else if (hasPartialPayment) {
        rentStatus = 'partial';
        const timeDiff = nextDueDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        console.log(`  💰 PARTIAL PAYMENT for ${currentMonth}/${currentYear}: ${currentMonthBill.amount} paid`);
      } else {
        // Bill exists but no payment
        if (now >= currentDueDate) {
          const timeDiff = now.getTime() - currentDueDate.getTime();
          const daysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          if (daysOverdue <= rentSettings.gracePeriodDays) {
            rentStatus = 'grace_period';
            console.log(`  ⚠️  GRACE PERIOD: ${daysOverdue} days past due date`);
          } else {
            rentStatus = 'overdue';
            console.log(`  ❌ OVERDUE: ${daysOverdue} days past due date`);
          }

          daysRemaining = -daysOverdue;
        } else {
          rentStatus = 'active';
          const timeDiff = currentDueDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          console.log(`  ⏰ ACTIVE: Bill due in ${daysRemaining} days`);
        }
      }

      console.log(`  📊 Final: status=${rentStatus}, daysRemaining=${daysRemaining}`);

      // Calculate partial payment info
      let partialPaymentInfo = null;
      if (hasPartialPayment && currentMonthBill) {
        const expectedAmount = currentMonthBill.monthlyRent + (currentMonthBill.totalUtilityCost || 0);
        partialPaymentInfo = {
          amountPaid: currentMonthBill.amount,
          expectedAmount,
          remainingBalance: expectedAmount - currentMonthBill.amount,
          paymentDate: currentMonthBill.paymentDate
        };
      }

      const rentCycleResult = {
        lastPaymentDate: lastPayment?.paymentDate || null,
        lastPaymentAmount: lastPayment?.amount || null,
        currentMonthPaid,
        paidForMonth: lastPayment?.forMonth || null,
        paidForYear: lastPayment?.forYear || null,
        // Show currentDueDate if not paid, nextDueDate if paid or new tenant
        nextDueDate: isNewTenant ? nextDueDate : (currentMonthPaid ? nextDueDate : currentDueDate),
        daysRemaining,
        rentStatus,
        isNewTenant,
        hasPartialPayment,
        partialPaymentInfo
      };

      console.log(`  🎯 RETURNING RENT CYCLE:`, JSON.stringify(rentCycleResult, null, 2));

      return rentCycleResult;
    } catch (error) {
      console.error('Error calculating rent cycle:', error);
      return {
        lastPaymentDate: null,
        lastPaymentAmount: null,
        currentMonthPaid: false,
        paidForMonth: null,
        paidForYear: null,
        nextDueDate: new Date(),
        daysRemaining: -999,
        rentStatus: 'overdue' as const
      };
    }
  }

  /**
   * Update property rent settings
   */
  async updatePropertyRentSettings(propertyId: string, paymentDay: number, gracePeriodDays: number = 3): Promise<boolean> {
    try {
      const result = await PropertyModel.findByIdAndUpdate(
        propertyId,
        {
          $set: {
            'rentSettings.paymentDay': paymentDay,
            'rentSettings.gracePeriodDays': gracePeriodDays
          }
        },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error('Error updating property rent settings:', error);
      throw error;
    }
  }

  /**
   * Update tenant rent status
   */
  async updateTenantRentStatus(tenantId: string): Promise<any> {
    try {
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const property = await PropertyModel.findById(tenant.apartmentInfo?.propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const paymentDay = 1;
      const gracePeriodDays = 3;

      const currentStatus = {
        rentStatus: 'active',
        daysRemaining: 30,
        nextDueDate: new Date(),
        lastPaymentDate: undefined
      };

      await TenantModel.findByIdAndUpdate(
        tenantId,
        {
          $set: {
            status: 'active'
          }
        }
      );

      return currentStatus;
    } catch (error) {
      console.error('Error updating tenant rent status:', error);
      throw error;
    }
  }
}

export const rentCycleStorage = new RentCycleStorage();
