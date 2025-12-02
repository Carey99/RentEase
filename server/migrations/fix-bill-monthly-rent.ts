/**
 * Migration to fix bills with incorrect monthlyRent values
 * 
 * Problem: Bills were created using tenant.apartmentInfo.rentAmount (which might include utilities)
 * instead of the base property type rent.
 * 
 * Solution: Recalculate monthlyRent from property.propertyTypes for all bills
 */

import { Tenant, Property, PaymentHistory } from '../database';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixBillMonthlyRent() {
  try {
    console.log('🔧 Starting migration: Fix bill monthlyRent values\n');

    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!mongoUrl) {
      throw new Error('MONGODB_URI or MONGODB_URL not found in environment variables');
    }

    const dbName = process.env.DATABASE_NAME || 'RentFlow';
    await mongoose.connect(mongoUrl, { dbName });
    console.log(`✅ Connected to MongoDB (${dbName} database)\n`);

    // Get all bills (exclude transaction records)
    const allRecords = await PaymentHistory.find({}).lean();
    console.log(`📊 Total payment records in database: ${allRecords.length}`);
    
    const bills = allRecords.filter((bill: any) => 
      !bill.notes || !bill.notes.includes('Payment transaction')
    );

    console.log(`📋 Found ${bills.length} bills to check (${allRecords.length - bills.length} transaction records excluded)\n`);

    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const bill of bills) {
      try {
        // Get tenant
        const tenant = await Tenant.findById(bill.tenantId).lean();
        if (!tenant) {
          console.log(`⚠️  Bill ${bill._id}: Tenant not found`);
          errorCount++;
          continue;
        }

        // Get property
        const property = await Property.findById(bill.propertyId).lean();
        if (!property) {
          console.log(`⚠️  Bill ${bill._id}: Property not found`);
          errorCount++;
          continue;
        }

        // Get base rent from property type
        const propertyType = tenant.apartmentInfo?.propertyType;
        const propertyTypeInfo = property.propertyTypes?.find((pt: any) => pt.type === propertyType);
        
        if (!propertyTypeInfo) {
          console.log(`⚠️  Bill ${bill._id}: Property type '${propertyType}' not found in property`);
          errorCount++;
          continue;
        }

        const correctMonthlyRent = parseFloat(propertyTypeInfo.price);
        const currentMonthlyRent = bill.monthlyRent || 0;

        // Check if it needs fixing
        if (Math.abs(correctMonthlyRent - currentMonthlyRent) < 0.01) {
          // Already correct
          skippedCount++;
          continue;
        }

        console.log(`🔄 Fixing bill ${bill._id}:`);
        console.log(`   Tenant: ${tenant.fullName}`);
        console.log(`   For: ${bill.forMonth}/${bill.forYear}`);
        console.log(`   Current monthlyRent: ${currentMonthlyRent}`);
        console.log(`   Correct monthlyRent: ${correctMonthlyRent}`);
        console.log(`   Utilities: ${bill.totalUtilityCost || 0}`);

        // Update the bill
        await PaymentHistory.updateOne(
          { _id: bill._id },
          {
            $set: {
              monthlyRent: correctMonthlyRent
            }
          }
        );

        fixedCount++;
        console.log(`   ✅ Fixed\n`);

      } catch (error) {
        console.error(`❌ Error processing bill ${bill._id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total bills checked: ${bills.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Skipped (already correct): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration completed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
fixBillMonthlyRent().then(() => process.exit(0));
