import { Request, Response } from 'express';
import { PaymentHistory, Tenant, Property } from '../database';
import { Types } from 'mongoose';
import { broadcastToUser } from '../websocket';
import { logActivity, createActivityLog } from './activityController';
import { logTenantActivity, createTenantActivityLog } from './tenantActivityController';

export class CashPaymentController {
  /**
   * Record a cash payment
   * POST /api/payments/cash
   */
  static async recordCashPayment(req: Request, res: Response) {
    try {
      const { tenantId, landlordId, amount, paymentDate, forMonth, forYear, notes } = req.body;

      // Validate required fields
      if (!tenantId || !landlordId || !amount || !paymentDate || !forMonth || !forYear) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate amount
      if (amount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
      }

      // Validate month and year
      if (forMonth < 1 || forMonth > 12) {
        return res.status(400).json({ message: 'Invalid month' });
      }

      const currentYear = new Date().getFullYear();
      if (forYear < currentYear - 2 || forYear > currentYear + 1) {
        return res.status(400).json({ message: 'Invalid year' });
      }

      // Fetch tenant to get property information
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      if (!tenant.apartmentInfo || !tenant.apartmentInfo.propertyId) {
        return res.status(400).json({ message: 'Tenant has no property assigned' });
      }

      const propertyId = tenant.apartmentInfo.propertyId;
      const monthlyRent = parseFloat(tenant.apartmentInfo.rentAmount || '0');

      // Fetch property to get utilities
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }

      // Find ALL bills for this tenant/month/year to check for duplicates FIRST
      // We need to check if a bill already exists to use its utility charges
      const allBillsForMonth = await PaymentHistory.find({
        tenantId: new Types.ObjectId(tenantId),
        forMonth,
        forYear,
        notes: { $not: /Payment transaction/ } // Exclude transaction records
      }).sort({ createdAt: -1 }); // Most recent first

      console.log(`🔍 Found ${allBillsForMonth.length} existing bill(s) for tenant ${tenantId}, ${forMonth}/${forYear}`);
      
      // If there are multiple bills (duplicates), use the most recent one and log warning
      let existingBill = allBillsForMonth.length > 0 ? allBillsForMonth[0] : null;
      
      if (allBillsForMonth.length > 1) {
        console.warn(`⚠️  WARNING: Found ${allBillsForMonth.length} duplicate bills for ${forMonth}/${forYear}. Using most recent bill (ID: ${existingBill?._id})`);
      }

      // Get utility charges from existing bill OR calculate from property
      let utilityCharges;
      let totalUtilityCost;
      
      if (existingBill) {
        // Use existing bill's utility charges (preserves units used)
        utilityCharges = existingBill.utilityCharges || [];
        totalUtilityCost = existingBill.totalUtilityCost || 0;
        console.log(`📋 Using existing bill's utilities: ${totalUtilityCost} (${utilityCharges.length} charges)`);
      } else {
        // Calculate utility charges from property (default to 1 unit each)
        utilityCharges = property.utilities?.map((utility: any) => ({
          type: utility.type,
          unitsUsed: 1, // Default to 1 unit for NEW bills
          pricePerUnit: parseFloat(utility.price),
          total: parseFloat(utility.price),
        })) || [];
        totalUtilityCost = utilityCharges.reduce((sum: number, charge: any) => sum + charge.total, 0);
        console.log(`🆕 Calculated new utilities from property: ${totalUtilityCost} (${utilityCharges.length} charges)`);
      }

      const expectedAmount = monthlyRent + totalUtilityCost;
      let previousAmountPaid = 0;
      let totalPaidNow = amount;

      if (existingBill) {
        // Bill exists - update it with cumulative payment
        previousAmountPaid = existingBill.amount || 0;
        totalPaidNow = previousAmountPaid + amount;
        console.log(`📝 Updating existing bill (ID: ${existingBill._id}) for ${forMonth}/${forYear}: Previous paid: ${previousAmountPaid}, New payment: ${amount}, Total: ${totalPaidNow}`);
      } else {
        // Create new bill
        console.log(`📝 Creating new bill for ${forMonth}/${forYear}: Amount: ${amount}`);
        existingBill = new PaymentHistory({
          tenantId: new Types.ObjectId(tenantId),
          landlordId: new Types.ObjectId(landlordId),
          propertyId: new Types.ObjectId(propertyId),
          amount: 0, // Will be updated below
          paymentDate: new Date(paymentDate),
          forMonth,
          forYear,
          monthlyRent,
          paymentMethod: 'Cash',
          status: 'pending',
          notes: `Bill for ${forMonth}/${forYear} - Rent: KSH ${monthlyRent}, Utilities: KSH ${totalUtilityCost}`,
          utilityCharges,
          totalUtilityCost,
        });
      }

      // Determine payment status based on cumulative amount
      // Use tolerance for floating-point comparison (0.01 = 1 cent tolerance)
      const tolerance = 0.01;
      const difference = Math.abs(totalPaidNow - expectedAmount);
      let paymentStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
      
      console.log(`💰 Payment Calculation:`, {
        monthlyRent,
        totalUtilityCost,
        expectedAmount,
        previouslyPaid: previousAmountPaid,
        newPayment: amount,
        totalPaidNow,
        difference,
      });
      
      if (difference <= tolerance) {
        // Within tolerance - treat as completed
        paymentStatus = 'completed';
        console.log(`✅ COMPLETED: Paid ${totalPaidNow} / ${expectedAmount} (difference: ${difference})`);
      } else if (totalPaidNow < expectedAmount) {
        paymentStatus = 'partial';
        console.log(`⚠️  PARTIAL: Paid ${totalPaidNow} / ${expectedAmount} (remaining: ${expectedAmount - totalPaidNow})`);
      } else {
        paymentStatus = 'overpaid';
        console.log(`💰 OVERPAID: Paid ${totalPaidNow} / ${expectedAmount} (excess: ${totalPaidNow - expectedAmount})`);
      }

      // Update bill with cumulative payment
      existingBill.amount = totalPaidNow;
      existingBill.status = paymentStatus;
      existingBill.notes = existingBill.notes 
        ? `${existingBill.notes} | Cash payment of KSH ${amount} received on ${new Date(paymentDate).toDateString()}`
        : `Cash payment of KSH ${amount} received on ${new Date(paymentDate).toDateString()}`;
      
      await existingBill.save();

      // Create separate payment transaction record (receipt for this specific payment)
      const paymentTransaction = new PaymentHistory({
        tenantId: new Types.ObjectId(tenantId),
        landlordId: new Types.ObjectId(landlordId),
        propertyId: new Types.ObjectId(propertyId),
        amount, // Only this transaction's amount
        paymentDate: new Date(paymentDate),
        forMonth,
        forYear,
        monthlyRent,
        paymentMethod: 'Cash',
        status: paymentStatus,
        notes: `Payment transaction for ${forMonth}/${forYear}${notes ? ` - ${notes}` : ''}`,
        utilityCharges,
        totalUtilityCost,
      });

      await paymentTransaction.save();

      console.log('✅ Cash payment recorded:', {
        billId: existingBill._id,
        transactionId: paymentTransaction._id,
        tenant: tenant.fullName,
        amountPaid: amount,
        totalPaid: totalPaidNow,
        expected: expectedAmount,
        status: paymentStatus,
        forMonth,
        forYear,
      });

      // Update tenant's rent cycle only if payment is for current month and completed/overpaid
      const currentMonth = new Date().getMonth() + 1;
      const isCurrentMonth = forMonth === currentMonth && forYear === currentYear;
      const isFullyPaid = paymentStatus === 'completed' || paymentStatus === 'overpaid';

      const tenant_updated = await Tenant.findById(tenantId);
      if (tenant_updated) {
        tenant_updated.rentCycle = {
          ...tenant_updated.rentCycle,
          lastPaymentDate: new Date(paymentDate),
          lastPaymentAmount: amount,
          currentMonthPaid: isCurrentMonth && isFullyPaid,
          paidForMonth: forMonth,
          paidForYear: forYear,
          rentStatus: isCurrentMonth && isFullyPaid ? 'paid' : (isCurrentMonth ? 'overdue' : tenant_updated.rentCycle?.rentStatus || 'grace_period'),
        };
        await tenant_updated.save();
        console.log(`🔄 Tenant rent cycle updated: currentMonthPaid=${tenant_updated.rentCycle.currentMonthPaid}, status=${tenant_updated.rentCycle.rentStatus}`);
      }

      // ============================================
      // 🔔 ACTIVITY LOGGING & NOTIFICATIONS
      // ============================================

      // 1. Log activity for LANDLORD
      await logActivity(createActivityLog(
        landlordId,
        paymentStatus === 'completed' || paymentStatus === 'overpaid' ? 'payment_received' : 'debt_created',
        paymentStatus === 'completed' ? 'Cash Payment Received' : 'Partial Cash Payment Received',
        `${tenant.fullName} paid KSH ${amount.toLocaleString()} in cash for ${forMonth}/${forYear}${paymentStatus === 'partial' ? ` (${totalPaidNow}/${expectedAmount} paid)` : ''}`,
        {
          tenantId: tenant._id?.toString(),
          tenantName: tenant.fullName,
          propertyId: propertyId.toString(),
          propertyName: property.name || 'Unknown Property',
          paymentId: existingBill._id?.toString(),
          amount: amount,
          unitNumber: tenant.apartmentInfo?.unitNumber || undefined,
        },
        paymentStatus === 'completed' ? 'high' : 'medium'
      ));

      // 2. Log activity for TENANT
      await logTenantActivity(createTenantActivityLog(
        tenantId,
        paymentStatus === 'completed' || paymentStatus === 'overpaid' ? 'payment_processed' : 'partial_payment_received',
        paymentStatus === 'completed' ? 'Cash Payment Confirmed' : 'Partial Cash Payment Received',
        paymentStatus === 'completed' 
          ? `Your cash payment of KSH ${amount.toLocaleString()} for ${forMonth}/${forYear} has been recorded successfully.`
          : `Partial cash payment of KSH ${amount.toLocaleString()} received. Remaining balance: KSH ${(expectedAmount - totalPaidNow).toLocaleString()}`,
        {
          landlordId: landlordId,
          propertyId: propertyId.toString(),
          paymentId: existingBill._id?.toString(),
          amount: amount,
        },
        paymentStatus === 'completed' ? 'high' : 'medium'
      ));

      // ============================================
      // 📡 WEBSOCKET BROADCASTS FOR REAL-TIME UPDATES
      // ============================================

      // 3. Broadcast to LANDLORD
      broadcastToUser(landlordId, {
        type: 'payment_received',
        data: {
          tenantId,
          tenantName: tenant.fullName,
          amount,
          totalPaid: totalPaidNow,
          expectedAmount,
          paymentMethod: 'Cash',
          status: paymentStatus,
          forMonth,
          forYear,
          timestamp: new Date().toISOString(),
        },
      });

      // 4. Broadcast to TENANT
      broadcastToUser(tenantId, {
        type: 'payment_confirmed',
        data: {
          amount,
          totalPaid: totalPaidNow,
          expectedAmount,
          paymentMethod: 'Cash',
          status: paymentStatus,
          forMonth,
          forYear,
          balance: expectedAmount - totalPaidNow,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`📡 WebSocket broadcasts sent to landlord (${landlordId}) and tenant (${tenantId})`);
      console.log(`🔔 Notifications logged for both landlord and tenant`);

      return res.status(201).json({
        message: 'Cash payment recorded successfully',
        payment: {
          billId: existingBill._id,
          transactionId: paymentTransaction._id,
          tenantId,
          landlordId,
          propertyId,
          amount,
          totalPaid: totalPaidNow,
          expectedAmount,
          paymentDate,
          forMonth,
          forYear,
          paymentMethod: 'Cash',
          status: paymentStatus,
        },
      });
    } catch (error) {
      console.error('Error recording cash payment:', error);
      return res.status(500).json({
        message: 'Failed to record cash payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
