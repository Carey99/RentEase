import { MonthlyBalance } from '../database';
import type { InsertPaymentHistory, InsertMonthlyBalance } from '../../shared/schema';

export class PaymentBalanceService {
  /**
   * Calculate which month/year a payment should be applied to
   */
  static calculatePaymentMonth(paymentDate: Date): { month: number, year: number } {
    return {
      month: paymentDate.getMonth() + 1, // JavaScript months are 0-indexed
      year: paymentDate.getFullYear()
    };
  }

  /**
   * Get or create monthly balance record for a tenant/month/year combination
   */
  static async getOrCreateMonthlyBalance(
    tenantId: string,
    landlordId: string,
    propertyId: string,
    month: number,
    year: number,
    monthlyRentAmount: number
  ): Promise<any> {
    try {
      let balance = await MonthlyBalance.findOne({
        tenantId,
        month,
        year
      });

      if (!balance) {
        // Create new monthly balance record
        balance = await MonthlyBalance.create({
          tenantId,
          landlordId,
          propertyId,
          month,
          year,
          expectedAmount: monthlyRentAmount,
          paidAmount: 0,
          balance: monthlyRentAmount, // Initially, full amount is owed
          status: 'pending'
        });
      }

      return balance;
    } catch (error) {
      console.error('Error getting or creating monthly balance:', error);
      throw error;
    }
  }

  /**
   * Process a payment and determine how it should be allocated across months
   */
  static async processPayment(
    tenantId: string,
    landlordId: string,
    propertyId: string,
    paymentAmount: number,
    paymentDate: Date,
    monthlyRentAmount: number
  ): Promise<{
    paymentDetails: Partial<InsertPaymentHistory>,
    monthlyBalanceUpdates: any[]
  }> {
    try {
      const paymentMonth = this.calculatePaymentMonth(paymentDate);
      
      // Get the current monthly balance for the payment month
      const currentMonthBalance = await this.getOrCreateMonthlyBalance(
        tenantId,
        landlordId,
        propertyId,
        paymentMonth.month,
        paymentMonth.year,
        monthlyRentAmount
      );

      let remainingPayment = paymentAmount;
      let appliedAmount = 0;
      let creditAmount = 0;
      let paymentStatus: 'partial' | 'completed' | 'overpaid' = 'partial';

      // First, try to apply payment to the current month
      if (currentMonthBalance.balance > 0 && remainingPayment > 0) {
        appliedAmount = Math.min(remainingPayment, currentMonthBalance.balance);
        remainingPayment -= appliedAmount;

        // Update the monthly balance
        const newPaidAmount = currentMonthBalance.paidAmount + appliedAmount;
        const newBalance = currentMonthBalance.expectedAmount - newPaidAmount;

        await MonthlyBalance.findByIdAndUpdate(currentMonthBalance._id, {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newBalance === 0 ? 'completed' : 'partial'
        });

        // Determine payment status based on the current month
        if (newBalance === 0) {
          paymentStatus = remainingPayment > 0 ? 'overpaid' : 'completed';
        } else {
          paymentStatus = 'partial';
        }
      }

      // If there's remaining payment, it becomes credit for future months
      if (remainingPayment > 0) {
        creditAmount = remainingPayment;
        paymentStatus = 'overpaid';

        // Apply credit to future months starting from next month
        await this.applyCreditToFutureMonths(
          tenantId,
          landlordId,
          propertyId,
          paymentMonth.month,
          paymentMonth.year,
          creditAmount,
          monthlyRentAmount
        );
      }

      return {
        paymentDetails: {
          tenantId,
          landlordId,
          propertyId,
          amount: paymentAmount,
          paymentDate,
          status: paymentStatus,
          forMonth: paymentMonth.month,
          forYear: paymentMonth.year,
          monthlyRentAmount,
          appliedAmount,
          creditAmount
        },
        monthlyBalanceUpdates: [] // We'll track these if needed
      };

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Apply credit to future months
   */
  static async applyCreditToFutureMonths(
    tenantId: string,
    landlordId: string,
    propertyId: string,
    startMonth: number,
    startYear: number,
    creditAmount: number,
    monthlyRentAmount: number
  ): Promise<void> {
    let remainingCredit = creditAmount;
    let currentMonth = startMonth + 1;
    let currentYear = startYear;

    // Handle month/year overflow
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }

    // Apply credit to future months (up to 12 months ahead to prevent infinite loop)
    let monthsAhead = 0;
    while (remainingCredit > 0 && monthsAhead < 12) {
      const futureBalance = await this.getOrCreateMonthlyBalance(
        tenantId,
        landlordId,
        propertyId,
        currentMonth,
        currentYear,
        monthlyRentAmount
      );

      const creditToApply = Math.min(remainingCredit, futureBalance.balance);
      
      if (creditToApply > 0) {
        const newPaidAmount = futureBalance.paidAmount + creditToApply;
        const newBalance = futureBalance.expectedAmount - newPaidAmount;

        await MonthlyBalance.findByIdAndUpdate(futureBalance._id, {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newBalance === 0 ? 'completed' : 'partial'
        });

        remainingCredit -= creditToApply;
      }

      // Move to next month
      currentMonth += 1;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear += 1;
      }
      monthsAhead += 1;
    }

    if (remainingCredit > 0) {
      console.warn(`Credit of $${remainingCredit} could not be fully applied to future months for tenant ${tenantId}`);
    }
  }

  /**
   * Get monthly balance summary for a tenant
   */
  static async getMonthlyBalanceSummary(tenantId: string): Promise<any[]> {
    try {
      const balances = await MonthlyBalance.find({ tenantId })
        .populate('propertyId', 'name')
        .sort({ year: -1, month: -1 })
        .lean();

      return balances.map(balance => ({
        ...balance,
        monthName: new Date(balance.year, balance.month - 1).toLocaleString('default', { month: 'long' }),
        isOverdue: balance.status !== 'completed' && this.isMonthOverdue(balance.month, balance.year)
      }));
    } catch (error) {
      console.error('Error getting monthly balance summary:', error);
      throw error;
    }
  }

  /**
   * Check if a month is overdue (past current month)
   */
  static isMonthOverdue(month: number, year: number): boolean {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    return false;
  }

  /**
   * Get landlord's payment summary organized by property
   */
  static async getLandlordPaymentSummaryByProperty(landlordId: string): Promise<any> {
    try {
      const balances = await MonthlyBalance.find({ landlordId })
        .populate('tenantId', 'fullName')
        .populate('propertyId', 'name')
        .sort({ year: -1, month: -1 })
        .lean();

      // Group by property
      const propertySummary = balances.reduce((acc: any, balance: any) => {
        const propertyId = balance.propertyId._id.toString();
        const propertyName = balance.propertyId.name;
        
        if (!acc[propertyId]) {
          acc[propertyId] = {
            propertyId,
            propertyName,
            tenants: {},
            totalExpected: 0,
            totalPaid: 0,
            totalBalance: 0
          };
        }

        acc[propertyId].totalExpected += balance.expectedAmount;
        acc[propertyId].totalPaid += balance.paidAmount;
        acc[propertyId].totalBalance += balance.balance;

        // Group by tenant within property
        const tenantId = balance.tenantId._id.toString();
        if (!acc[propertyId].tenants[tenantId]) {
          acc[propertyId].tenants[tenantId] = {
            tenantId,
            tenantName: balance.tenantId.fullName,
            monthlyBalances: [],
            totalExpected: 0,
            totalPaid: 0,
            totalBalance: 0
          };
        }

        acc[propertyId].tenants[tenantId].monthlyBalances.push(balance);
        acc[propertyId].tenants[tenantId].totalExpected += balance.expectedAmount;
        acc[propertyId].tenants[tenantId].totalPaid += balance.paidAmount;
        acc[propertyId].tenants[tenantId].totalBalance += balance.balance;

        return acc;
      }, {});

      return Object.values(propertySummary);
    } catch (error) {
      console.error('Error getting landlord payment summary by property:', error);
      throw error;
    }
  }
}
