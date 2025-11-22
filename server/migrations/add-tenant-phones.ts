/**
 * Migration: Add phone numbers to test tenants
 * Matches the phone numbers in test-mpesa-statement.pdf
 */

import { Tenant } from '../database';

export async function addTenantPhones() {
  console.log('📞 Adding phone numbers to test tenants...');

  try {
    // The test M-Pesa statement has these phone numbers:
    // 254XXXXXXX445 - CORNELIUS OTIENO / JOHN K. (2 transactions)
    // 254XXXXXXX784 - DELILLAH A.
    // 254XXXXXXX901 - M. WANJIKU
    // 254XXXXXXX999 - SAMUEL KIMANI
    // 254XXXXXXX012 - PETER O.

    // Update existing test tenant
    const janeResult = await Tenant.updateOne(
      { email: 'tenant@example.com' },
      { 
        $set: { 
          phone: '254712345445', // Last 3 digits: 445
          fullName: 'Jane Cornelius' // Close to "CORNELIUS OTIENO"
        } 
      }
    );

    if (janeResult.modifiedCount > 0) {
      console.log('✅ Updated Jane Tenant with phone: 254712345445 (last 3: 445)');
    }

    // Find the landlord to add more test tenants
    const landlord = await Tenant.findOne({ email: 'landlord@example.com' });
    
    if (!landlord) {
      console.log('⚠️  Landlord not found, skipping additional tenant creation');
      return;
    }

    // Get landlord's property
    const property = await Tenant.findOne({
      'apartmentInfo.landlordId': landlord._id
    });

    if (!property || !property.apartmentInfo) {
      console.log('⚠️  No property found, skipping additional tenant creation');
      return;
    }

    const propertyId = property.apartmentInfo.propertyId;
    const landlordId = landlord._id;

    // Check if we need to create additional test tenants
    const existingTenants = await Tenant.find({
      'apartmentInfo.landlordId': landlordId
    });

    console.log(`📊 Found ${existingTenants.length} existing tenants for landlord`);

    // Create additional test tenants if needed (matching M-Pesa statement senders)
    const additionalTenants = [
      {
        fullName: 'John Kapish',
        email: 'john.kapish@example.com',
        password: 'password123',
        role: 'tenant',
        phone: '254722345445', // Last 3: 445 (same as another transaction)
        apartmentInfo: {
          landlordId,
          propertyId,
          propertyName: 'Sunset Apartments',
          propertyType: '1bedroom',
          unitNumber: 'B202',
          rentAmount: '1000'
        }
      },
      {
        fullName: 'Delillah Arab',
        email: 'delillah.arab@example.com',
        password: 'password123',
        role: 'tenant',
        phone: '254733345784', // Last 3: 784
        apartmentInfo: {
          landlordId,
          propertyId,
          propertyName: 'Sunset Apartments',
          propertyType: '1bedroom',
          unitNumber: 'C303',
          rentAmount: '1000'
        }
      },
      {
        fullName: 'Mary Wanjiku',
        email: 'mary.wanjiku@example.com',
        password: 'password123',
        role: 'tenant',
        phone: '254744345901', // Last 3: 901
        apartmentInfo: {
          landlordId,
          propertyId,
          propertyName: 'Sunset Apartments',
          propertyType: 'studio',
          unitNumber: 'D404',
          rentAmount: '800'
        }
      }
    ];

    for (const tenantData of additionalTenants) {
      const exists = await Tenant.findOne({ email: tenantData.email });
      if (!exists) {
        const newTenant = await Tenant.create(tenantData);
        console.log(`✅ Created tenant: ${tenantData.fullName} (${tenantData.phone})`);
      } else {
        // Update phone if needed
        await Tenant.updateOne(
          { email: tenantData.email },
          { $set: { phone: tenantData.phone, fullName: tenantData.fullName } }
        );
        console.log(`✅ Updated tenant: ${tenantData.fullName} (${tenantData.phone})`);
      }
    }

    console.log('✅ Phone migration completed!');
  } catch (error) {
    console.error('❌ Phone migration failed:', error);
    throw error;
  }
}
