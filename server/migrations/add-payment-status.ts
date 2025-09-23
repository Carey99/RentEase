/**
 * Migration script to add status field to existing payment history records
 */

import { PaymentHistory } from '../database.js';

export async function addPaymentStatusMigration() {
  console.log('🔄 Starting migration to add status field to payment history records...');
  
  try {
    // Update all existing payment history records that don't have a status field
    const result = await PaymentHistory.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'completed' } }
    );
    
    console.log(`✅ Migration completed: Updated ${result.modifiedCount} payment history records with status field`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
