import { type PaymentHistory, type InsertPaymentHistory } from "@shared/schema";
import { Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel } from "../database";
import { logActivity, createActivityLog } from "../controllers/activityController";
import { logTenantActivity, createTenantActivityLog } from "../controllers/tenantActivityController";
import { ObjectId } from "mongodb";

/**
 * PaymentStorage - Handles all payment and billing operations
 * CRITICAL: This class manages all financial transactions
 * Scope: Bill creation, payment processing, payment history, utility charges
 * Collections: PaymentHistory, Tenant, Property
 * Dependencies: TenantStorage (for tenant info), PropertyStorage (for property info), ActivityStorage (for logging)
 * 
 * KEY CONCEPTS:
 * - BILL: A bill is created with status='pending' and amount=0 (no payment yet)
 * - PAYMENT: When tenant pays, we update the bill's amount and status
 * - TRANSACTION: A separate transaction record created for receipt purposes
 * - HISTORICAL DEBT: If tenant has unpaid previous months, new bill includes this debt
 */
export class PaymentStorage {
  /**
   * Create a bill for tenant
   * Status starts as 'pending', amount starts as 0 (nothing paid)
   * Includes historical debt from previous unpaid months
   */
  async recordTenantPayment(
    tenantId: string,
    paymentAmount: number,
    forMonth: number,
    forYear: number,
    paymentDate: Date = new Date(),
    utilityCharges?: Array<{ type: string; unitsUsed: number; pricePerUnit: number; total: number }>,
    totalUtilityCost?: number
  ): Promise<boolean> {
    try {
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get property to find payment day and grace period
      const property = await PropertyModel.findById(tenant.apartmentInfo?.propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Check if bill/payment already exists for this tenant, month, and year
      const existingPayment = await PaymentHistoryModel.findOne({
        tenantId,
        forMonth,
        forYear
      });

      if (existingPayment) {
        console.log(`⚠️ Bill already exists for tenant ${tenantId} for ${forMonth}/${forYear}`);
        throw new Error(`Bill already recorded for ${forMonth}/${forYear}. Cannot create duplicate bill.`);
      }

      // Get monthly rent amount from tenant's apartment info
      const monthlyRentAmount = parseFloat(tenant.apartmentInfo?.rentAmount || '0');
      if (monthlyRentAmount <= 0) {
        throw new Error('Invalid rent amount for tenant');
      }

      // Calculate historical debt from previous unpaid months
      const historicalBills = await PaymentHistoryModel.find({
        tenantId,
        status: { $in: ['pending', 'partial'] },
        notes: { $not: /Payment transaction/ },
        $or: [
          { forYear: { $lt: forYear } },
          { forYear: forYear, forMonth: { $lt: forMonth } }
        ]
      });

      let historicalDebt = 0;
      const historicalDebtDetails: string[] = [];

      historicalBills.forEach(bill => {
        const expected = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const paid = bill.amount || 0;
        const balance = expected - paid;

        if (balance > 0) {
          historicalDebt += balance;
          historicalDebtDetails.push(`${bill.forMonth}/${bill.forYear}: KSH ${balance}`);
        }
      });

      console.log(`📝 Creating BILL for tenant ${tenantId} for ${forMonth}/${forYear}`);
      if (historicalDebt > 0) {
        console.log(`  ⚠️ Including historical debt: KSH ${historicalDebt}`);
        console.log(`  Details: ${historicalDebtDetails.join(', ')}`);
      }

      const currentMonthCharges = monthlyRentAmount + (totalUtilityCost || 0);
      const totalBillAmount = currentMonthCharges + historicalDebt;

      let billNotes = `Bill for ${forMonth}/${forYear} - Rent: KSH ${monthlyRentAmount}, Utilities: KSH ${totalUtilityCost || 0}`;
      if (historicalDebt > 0) {
        billNotes += ` | Includes historical debt: KSH ${historicalDebt} (${historicalDebtDetails.join(', ')})`;
      }

      const newPayment = await this.createPaymentHistory({
        tenantId,
        landlordId: tenant.apartmentInfo?.landlordId?.toString() || '',
        propertyId: tenant.apartmentInfo?.propertyId?.toString() || '',
        amount: 0,
        paymentDate,
        forMonth,
        forYear,
        monthlyRent: totalBillAmount,
        paymentMethod: 'Not specified',
        status: 'pending',
        notes: billNotes,
        utilityCharges: utilityCharges || [],
        totalUtilityCost: totalUtilityCost || 0,
      });

      // Log tenant activity
      await logTenantActivity(createTenantActivityLog(
        tenantId,
        'bill_created',
        'New Bill Created',
        `Your bill for ${forMonth}/${forYear} is ready. Total amount: KSH ${totalBillAmount.toLocaleString()}`,
        {
          landlordId: tenant.apartmentInfo?.landlordId?.toString(),
          propertyId: tenant.apartmentInfo?.propertyId?.toString(),
          propertyName: tenant.apartmentInfo?.propertyName || undefined,
          paymentId: newPayment._id?.toString(),
          amount: totalBillAmount,
          dueDate: paymentDate.toISOString(),
        },
        'medium'
      ));

      console.log(`✅ Bill created successfully. Tenant must now pay this bill.`);
      return true;
    } catch (error) {
      console.error('Error creating bill for tenant:', error);
      throw error;
    }
  }

  /**
   * Process tenant's payment
   * Updates bill status and amount, creates transaction record
   * Handles both consolidated bills (with historical debt) and regular bills
   */
  async processTenantPayment(
    paymentId: string,
    amountPaid: number,
    paymentMethod: string = 'M-Pesa',
    tenantId?: string
  ): Promise<boolean> {
    try {
      const payment = await PaymentHistoryModel.findById(paymentId);

      if (!payment) {
        throw new Error('Payment bill not found');
      }

      if (tenantId && payment.tenantId.toString() !== tenantId) {
        throw new Error('This bill does not belong to this tenant');
      }

      const tenantIdStr = payment.tenantId.toString();
      console.log(`\n💳 Processing payment: KSH ${amountPaid} for tenant ${tenantIdStr}`);

      // Check if consolidated bill (includes historical debt)
      const billIncludesHistoricalDebt = payment.notes?.includes('Includes historical debt');

      if (billIncludesHistoricalDebt) {
        console.log(`📝 This is a consolidated bill (includes historical debt)`);

        const expectedAmount = payment.monthlyRent;
        const previousAmountPaid = payment.amount || 0;
        const totalPaidNow = previousAmountPaid + amountPaid;

        let paymentStatus: 'pending' | 'partial' | 'completed' | 'overpaid';

        if (totalPaidNow < expectedAmount) {
          paymentStatus = 'partial';
        } else if (totalPaidNow === expectedAmount) {
          paymentStatus = 'completed';
        } else {
          paymentStatus = 'overpaid';
        }

        // Update this bill
        await PaymentHistoryModel.findByIdAndUpdate(payment._id, {
          $set: {
            amount: totalPaidNow,
            status: paymentStatus,
            notes: payment.notes
              ? `${payment.notes} | Payment of ${amountPaid} received on ${new Date().toDateString()}`
              : `Payment of ${amountPaid} received on ${new Date().toDateString()}`
          }
        });

        // If fully paid, mark historical bills as completed
        if (paymentStatus === 'completed' || paymentStatus === 'overpaid') {
          const historicalBills = await PaymentHistoryModel.find({
            tenantId: tenantIdStr,
            status: { $in: ['pending', 'partial'] },
            notes: { $not: /Payment transaction/ },
            $or: [
              { forYear: { $lt: payment.forYear } },
              { forYear: payment.forYear, forMonth: { $lt: payment.forMonth } }
            ]
          });

          for (const oldBill of historicalBills) {
            const oldExpected = oldBill.monthlyRent + (oldBill.totalUtilityCost || 0);
            await PaymentHistoryModel.findByIdAndUpdate(oldBill._id, {
              $set: {
                amount: oldExpected,
                status: 'completed',
                notes: (oldBill.notes || '') + ` | Resolved by ${payment.forMonth}/${payment.forYear} consolidated payment`
              }
            });
            console.log(`  ✓ Marked historical bill ${oldBill.forMonth}/${oldBill.forYear} as completed`);
          }
        }

        // Create transaction record
        await this.createPaymentHistory({
          tenantId: payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: payment.propertyId.toString(),
          amount: amountPaid,
          paymentDate: new Date(),
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod,
          status: paymentStatus,
          notes: `Payment transaction for ${payment.forMonth}/${payment.forYear}`,
          utilityCharges: payment.utilityCharges,
          totalUtilityCost: payment.totalUtilityCost,
        });

        console.log(`✅ Consolidated payment processed: Status ${paymentStatus}`);

        const tenant = await TenantModel.findById(payment.tenantId);
        const allPaid = paymentStatus === 'completed';

        if (tenant && tenant.apartmentInfo?.landlordId) {
          await logActivity(createActivityLog(
            tenant.apartmentInfo.landlordId.toString(),
            allPaid ? 'payment_received' : 'debt_created',
            allPaid ? 'Payment Received - All Clear' : 'Payment Received',
            `${tenant.fullName} paid KSH ${amountPaid.toLocaleString()}${allPaid ? ' - All bills cleared including historical debt' : ''}`,
            {
              tenantId: tenant._id?.toString(),
              tenantName: tenant.fullName,
              propertyId: tenant.apartmentInfo.propertyId?.toString() || undefined,
              propertyName: tenant.apartmentInfo.propertyName || undefined,
              paymentId: payment._id?.toString(),
              amount: amountPaid,
              unitNumber: tenant.apartmentInfo.unitNumber || undefined,
            },
            allPaid ? 'medium' : 'low'
          ));
        }

        await logTenantActivity(createTenantActivityLog(
          payment.tenantId.toString(),
          allPaid ? 'payment_processed' : 'partial_payment_received',
          allPaid ? 'Payment Confirmed - All Clear' : 'Payment Received',
          allPaid
            ? `Your payment of KSH ${amountPaid.toLocaleString()} has been processed. All bills are now paid!`
            : `Payment of KSH ${amountPaid.toLocaleString()} received. Remaining balance: KSH ${(expectedAmount - totalPaidNow).toLocaleString()}`,
          {
            landlordId: payment.landlordId.toString(),
            propertyId: payment.propertyId.toString(),
            paymentId: payment._id?.toString(),
            amount: amountPaid,
          },
          allPaid ? 'medium' : 'low'
        ));

        return true;
      }

      // Non-consolidated bill logic (backwards compatibility)
      const allBills = await PaymentHistoryModel.find({
        tenantId: tenantIdStr,
        status: { $in: ['pending', 'partial'] },
        notes: { $not: /Payment transaction/ }
      }).sort({ forYear: 1, forMonth: 1 });

      console.log(`📋 Found ${allBills.length} unpaid/partial bills for tenant`);

      let remainingAmount = amountPaid;
      const updatedBills: Array<{ bill: any; amountApplied: number; newStatus: string }> = [];

      for (const bill of allBills) {
        if (remainingAmount <= 0) break;

        const expectedAmount = bill.monthlyRent + (bill.totalUtilityCost || 0);
        const previousAmountPaid = bill.amount || 0;
        const billBalance = expectedAmount - previousAmountPaid;

        if (billBalance <= 0) continue;

        const amountToApply = Math.min(remainingAmount, billBalance);
        const newTotalPaid = previousAmountPaid + amountToApply;

        let newStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
        if (newTotalPaid < expectedAmount) {
          newStatus = 'partial';
        } else if (newTotalPaid === expectedAmount) {
          newStatus = 'completed';
        } else {
          newStatus = 'overpaid';
        }

        updatedBills.push({
          bill,
          amountApplied: amountToApply,
          newStatus
        });

        remainingAmount -= amountToApply;
      }

      // Apply updates to all affected bills
      for (const update of updatedBills) {
        const newTotalPaid = (update.bill.amount || 0) + update.amountApplied;

        await PaymentHistoryModel.findByIdAndUpdate(update.bill._id, {
          $set: {
            amount: newTotalPaid,
            status: update.newStatus,
            notes: update.bill.notes
              ? `${update.bill.notes} | Payment of ${update.amountApplied} received on ${new Date().toDateString()}`
              : `Payment of ${update.amountApplied} received on ${new Date().toDateString()}`
          }
        });
      }

      // Create transaction record
      const billsAffected = updatedBills.map(u => `${u.bill.forMonth}/${u.bill.forYear}`).join(', ');
      await this.createPaymentHistory({
        tenantId: payment.tenantId.toString(),
        landlordId: payment.landlordId.toString(),
        propertyId: payment.propertyId.toString(),
        amount: amountPaid,
        paymentDate: new Date(),
        forMonth: payment.forMonth,
        forYear: payment.forYear,
        monthlyRent: payment.monthlyRent,
        paymentMethod,
        status: updatedBills.every(u => u.newStatus === 'completed' || u.newStatus === 'overpaid') ? 'completed' : 'partial',
        notes: `Payment transaction for ${payment.forMonth}/${payment.forYear} (Applied to: ${billsAffected})`,
        utilityCharges: payment.utilityCharges,
        totalUtilityCost: payment.totalUtilityCost,
      });

      console.log(`✅ Payment of KSH ${amountPaid} processed successfully`);

      return true;
    } catch (error) {
      console.error('Error processing tenant payment:', error);
      throw error;
    }
  }

  /**
   * Create payment history record
   */
  async createPaymentHistory(paymentHistory: InsertPaymentHistory): Promise<PaymentHistory> {
    try {
      const payment = new PaymentHistoryModel(paymentHistory);
      const saved = await payment.save();

      console.log(`💾 Payment history saved:`, saved);

      return {
        _id: saved._id.toString(),
        tenantId: saved.tenantId.toString(),
        landlordId: saved.landlordId.toString(),
        propertyId: saved.propertyId.toString(),
        amount: saved.amount,
        paymentDate: saved.paymentDate,
        forMonth: saved.forMonth,
        forYear: saved.forYear,
        monthlyRent: saved.monthlyRent,
        paymentMethod: saved.paymentMethod || 'Not specified',
        status: saved.status || 'completed',
        notes: saved.notes || undefined,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      console.error('Error creating payment history:', error);
      throw error;
    }
  }

  /**
   * Get payment history for tenant
   */
  async getPaymentHistory(tenantId: string): Promise<PaymentHistory[]> {
    try {
      const tenant = await TenantModel.findById(tenantId).lean();

      const payments = await PaymentHistoryModel.find({ tenantId })
        .populate('propertyId', 'name')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        const property = payment.propertyId as any;

        return {
          _id: payment._id.toString(),
          tenantId: payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: property._id ? property._id.toString() : payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: (payment as any).utilityCharges || [],
          totalUtilityCost: (payment as any).totalUtilityCost || 0,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenantId,
            id: tenantId,
            name: tenant?.fullName || 'Unknown Tenant'
          },
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(),
            name: property.name || 'Unknown Property'
          },
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  /**
   * Get payment history for landlord
   */
  async getPaymentHistoryByLandlord(landlordId: string): Promise<PaymentHistory[]> {
    try {
      const payments = await PaymentHistoryModel.find({ landlordId })
        .populate('tenantId', 'fullName email')
        .populate('propertyId', 'name')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        const tenant = payment.tenantId as any;
        const property = payment.propertyId as any;

        return {
          _id: payment._id.toString(),
          tenantId: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: property._id ? property._id.toString() : payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: payment.utilityCharges || [],
          totalUtilityCost: payment.totalUtilityCost || 0,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            name: tenant.fullName || 'Unknown Tenant'
          },
          property: {
            _id: property._id ? property._id.toString() : payment.propertyId.toString(),
            id: property._id ? property._id.toString() : payment.propertyId.toString(),
            name: property.name || 'Unknown Property'
          },
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting landlord payment history:', error);
      return [];
    }
  }

  /**
   * Get payment history for property
   */
  async getPaymentHistoryByProperty(propertyId: string): Promise<PaymentHistory[]> {
    try {
      const payments = await PaymentHistoryModel.find({ propertyId })
        .populate('tenantId', 'fullName email')
        .sort({ paymentDate: -1 })
        .lean();

      return payments.map(payment => {
        const tenant = payment.tenantId as any;

        return {
          _id: payment._id.toString(),
          tenantId: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
          landlordId: payment.landlordId.toString(),
          propertyId: payment.propertyId.toString(),
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          forMonth: payment.forMonth,
          forYear: payment.forYear,
          monthlyRent: payment.monthlyRent,
          paymentMethod: payment.paymentMethod || 'Not specified',
          status: payment.status || 'completed',
          notes: payment.notes || undefined,
          utilityCharges: payment.utilityCharges || [],
          totalUtilityCost: payment.totalUtilityCost || 0,
          createdAt: payment.createdAt,
          tenant: {
            _id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            id: tenant._id ? tenant._id.toString() : payment.tenantId.toString(),
            name: tenant.fullName || 'Unknown Tenant'
          },
          property: {
            _id: propertyId,
            id: propertyId,
            name: 'Property'
          },
        } as PaymentHistory;
      });
    } catch (error) {
      console.error('Error getting property payment history:', error);
      return [];
    }
  }

  /**
   * Get recorded months for tenant in specific year
   */
  async getRecordedMonthsForTenant(tenantId: string, year: number): Promise<number[]> {
    try {
      const payments = await PaymentHistoryModel.find({
        tenantId,
        forYear: year
      }).lean();

      const months = payments.map(p => p.forMonth);
      const uniqueMonths = Array.from(new Set(months));
      return uniqueMonths.sort((a, b) => a - b);
    } catch (error) {
      console.error('Error getting recorded months:', error);
      return [];
    }
  }
}

export const paymentStorage = new PaymentStorage();
