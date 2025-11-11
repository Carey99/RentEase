import mongoose from 'mongoose';
import { Landlord } from './server/database';

async function checkAndConfigureLandlord() {
  try {
    await mongoose.connect(process.env.DATABASE_URL!);
    console.log('Connected to MongoDB');

    // Find the landlord
    const landlordId = '6891ac946dacef4a8d363d00';
    const landlord = await Landlord.findById(landlordId);

    if (!landlord) {
      console.log('❌ Landlord not found with ID:', landlordId);
      return;
    }

    console.log('\n📋 Landlord Information:');
    console.log('  Name:', landlord.fullName);
    console.log('  Email:', landlord.email);
    console.log('  Has Daraja Config:', !!landlord.darajaConfig);
    
    if (landlord.darajaConfig) {
      console.log('\n💳 Current M-Pesa Configuration:');
      console.log('  Business Short Code:', landlord.darajaConfig.businessShortCode);
      console.log('  Business Type:', landlord.darajaConfig.businessType);
      console.log('  Is Configured:', landlord.darajaConfig.isConfigured);
      console.log('  Is Active:', landlord.darajaConfig.isActive);
    } else {
      console.log('\n⚠️  No M-Pesa configuration found!');
      console.log('\nWould you like to add a test configuration? (Edit this script to configure)');
      console.log('\nTo configure via code, uncomment the section below:');
      
      /*
      // UNCOMMENT AND MODIFY TO AUTO-CONFIGURE:
      landlord.darajaConfig = {
        businessShortCode: '174379',  // Your paybill/till number
        businessType: 'paybill',      // 'paybill' or 'till'
        isConfigured: true,
        isActive: true
      };
      await landlord.save();
      console.log('✅ M-Pesa configured successfully!');
      */
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAndConfigureLandlord();
