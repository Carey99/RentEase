import mongoose from 'mongoose';
import { PaymentHistory as PaymentHistoryModel } from '../database';

/**
 * Migration to fix payment transaction statuses
 * Recalculates status for transaction records based on cumulative amounts
 */
export async function fixPaymentTransactionStatus() {
  console.log('🔧 Starting payment transaction status fix...');
  
  try {
    // Get all payment transaction records (those with "Payment transaction" in notes)
    const transactions = await PaymentHistoryModel.find({
      notes: { $regex: /Payment transaction for/ }
    }).sort({ forMonth: 1, forYear: 1, paymentDate: 1 });

    console.log(`Found ${transactions.length} payment transactions to review`);

    // Group transactions by tenant, month, and year
    const groupedTransactions: Record<string, any[]> = {};
    
    transactions.forEach(tx => {
      const key = `${tx.tenantId}_${tx.forMonth}_${tx.forYear}`;
      if (!groupedTransactions[key]) {
        groupedTransactions[key] = [];
      }
      groupedTransactions[key].push(tx);
    });

    console.log(`Grouped into ${Object.keys(groupedTransactions).length} unique bill periods`);

    // Process each group
    let updatedCount = 0;
    for (const [key, txList] of Object.entries(groupedTransactions)) {
      console.log(`\nProcessing group: ${key} (${txList.length} transactions)`);
      
      // Get the expected amount from the first transaction (they should all have the same rent + utilities)
      const firstTx = txList[0];
      const expectedAmount = firstTx.monthlyRent + (firstTx.totalUtilityCost || 0);
      
      console.log(`  Expected amount: ${expectedAmount}`);
      
      // Recalculate cumulative status for each transaction
      let cumulativePaid = 0;
      
      for (const tx of txList) {
        cumulativePaid += tx.amount;
        
        // Determine correct status based on cumulative amount
        let correctStatus: 'pending' | 'partial' | 'completed' | 'overpaid';
        
        if (cumulativePaid < expectedAmount) {
          correctStatus = 'partial';
        } else if (cumulativePaid === expectedAmount) {
          correctStatus = 'completed';
        } else {
          correctStatus = 'overpaid';
        }
        
        // Update if status is wrong
        if (tx.status !== correctStatus) {
          console.log(`  Updating transaction ${tx._id}: ${tx.status} -> ${correctStatus} (paid ${tx.amount}, cumulative ${cumulativePaid}/${expectedAmount})`);
          
          await PaymentHistoryModel.findByIdAndUpdate(tx._id, {
            $set: { status: correctStatus }
          });
          
          updatedCount++;
        } else {
          console.log(`  Transaction ${tx._id} already has correct status: ${correctStatus}`);
        }
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} transaction records`);
    return { success: true, updated: updatedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/rentease';
  
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('📦 Connected to MongoDB');
      await fixPaymentTransactionStatus();
      await mongoose.disconnect();
      console.log('👋 Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    });
}
