/**
 * Check debt tracking for all tenants to verify historical debt calculations
 */
import mongoose from 'mongoose';
import { Tenant as TenantModel, Property as PropertyModel, PaymentHistory as PaymentHistoryModel } from '../database';
import dotenv from 'dotenv';

dotenv.config();

async function checkDebtTracking() {
  try {
    console.log('🔧 Checking debt tracking\n');
    
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
      throw new Error('MONGODB_URL environment variable is not set');
    }

    await mongoose.connect(mongoUrl + '/RentFlow');
    console.log('✅ Connected to MongoDB (RentFlow database)\n');

    // Get all tenants with payment history
    const allBills = await PaymentHistoryModel.find({}).sort({ tenantId: 1, forYear: 1, forMonth: 1 }).lean();
    console.log(`📋 Found ${allBills.length} total payment records\n`);
    
    // Filter out transaction records
    const bills = allBills.filter(b => !b.notes?.includes('Payment transaction'));

    // Group by tenant
    const tenantBills = new Map<string, any[]>();
    for (const bill of bills) {
      const tenantId = bill.tenantId.toString();
      if (!tenantBills.has(tenantId)) {
        tenantBills.set(tenantId, []);
      }
      tenantBills.get(tenantId)!.push(bill);
    }

    console.log(`📊 Analyzing ${tenantBills.size} tenants with payment history\n`);

    for (const [tenantId, bills] of tenantBills.entries()) {
      const tenant = await TenantModel.findById(tenantId);
      if (!tenant) continue;

      console.log(`\n=== ${tenant.fullName} ===`);
      
      let cumulativeDebt = 0;
      
      for (const bill of bills) {
        const expected = (bill.monthlyRent || 0) + (bill.totalUtilityCost || 0);
        const paid = bill.amount || 0;
        const balance = expected - paid;
        
        cumulativeDebt += balance;
        
        console.log(`  ${bill.forMonth}/${bill.forYear}: ${bill.status}`);
        console.log(`    Expected: ${expected}, Paid: ${paid}, Balance: ${balance}`);
        console.log(`    Cumulative Debt: ${cumulativeDebt}`);
        
        if (bill.status === 'completed' || bill.status === 'overpaid') {
          if (balance > 0.01) {
            console.log(`    ⚠️  WARNING: Bill marked as "${bill.status}" but has unpaid balance of ${balance}`);
          }
        }
      }
      
      if (Math.abs(cumulativeDebt) > 0.01) {
        console.log(`  📊 Final Debt: ${cumulativeDebt > 0 ? 'OWES' : 'OVERPAID'} ${Math.abs(cumulativeDebt)}`);
      } else {
        console.log(`  ✅ All settled (debt: ${cumulativeDebt})`);
      }
    }

    console.log('\n✅ Debt check completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

checkDebtTracking();
