import mongoose from 'mongoose';
import { Tenant, Property, PaymentHistory } from '../database';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb+srv://careyedwin6:hy6oGQpzwjbsGl6C@cluster0.dwzqjzg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkDelillahBill() {
  try {
    await mongoose.connect(MONGODB_URL, { dbName: 'RentFlow' });
    console.log('✅ Connected to MongoDB');

    const tenant = await Tenant.findOne({ fullName: /Delillah/i }).lean();
    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log('\n=== TENANT INFO ===');
    console.log('Name:', tenant.fullName);
    console.log('Property Type:', tenant.apartmentInfo?.propertyType);
    console.log('Rent Amount (stored):', tenant.apartmentInfo?.rentAmount);

    const property = await Property.findById(tenant.apartmentInfo?.propertyId).lean();
    console.log('\n=== PROPERTY INFO ===');
    console.log('Property Types:', JSON.stringify(property.propertyTypes, null, 2));

    const match = property.propertyTypes?.find((pt: any) => pt.type === tenant.apartmentInfo?.propertyType);
    console.log('\n=== MATCHING PROPERTY TYPE ===');
    console.log('Match found:', !!match);
    if (match) {
      console.log('Base Rent from Property:', match.price);
    }

    const bills = await PaymentHistory.find({
      tenantId: tenant._id,
      notes: { $not: /Payment transaction/ }
    }).sort({ createdAt: -1 }).limit(3).lean();

    console.log('\n=== RECENT BILLS ===');
    bills.forEach((bill: any) => {
      console.log(`\n${bill.forMonth}/${bill.forYear}:`);
      console.log('  monthlyRent (stored):', bill.monthlyRent);
      console.log('  totalUtilityCost:', bill.totalUtilityCost);
      console.log('  Total Expected:', bill.monthlyRent + bill.totalUtilityCost);
      console.log('  Amount Paid:', bill.amount);
      console.log('  Status:', bill.status);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkDelillahBill();
