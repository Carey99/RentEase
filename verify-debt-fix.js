// Quick verification script to check debt calculation consistency
// Usage: node verify-debt-fix.js [tenant-id]
// If no tenant-id provided, will check Jones Makini

async function verifyDebtCalculations(tenantId) {
  console.log('🔍 Fetching payment history...\n');
  
  try {
    const BASE_URL = 'http://localhost:5000';
    
    // If no tenant ID, fetch all tenants from landlord and find Jones Makini
    if (!tenantId) {
      console.log('No tenant ID provided, fetching Jones Makini...');
      const LANDLORD_ID = '6891ac946dacef4a8d363d00';
      
      const tenantsResp = await fetch(`${BASE_URL}/api/landlords/${LANDLORD_ID}/tenants`);
      const tenants = await tenantsResp.json();
      
      const jonesTenant = tenants.find(t => 
        (t.name && t.name.includes('Jones Makini')) || 
        (t.fullName && t.fullName.includes('Jones Makini'))
      );
      
      if (!jonesTenant) {
        console.log('\n� Available tenants:');
        tenants.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.name || t.fullName} (ID: ${t._id || t.id})`);
        });
        console.log('\n❌ Jones Makini not found. Please specify a tenant ID:');
        console.log('   node verify-debt-fix.js <tenant-id>\n');
        return;
      }
      
      tenantId = jonesTenant._id || jonesTenant.id;
      console.log(`✅ Found: ${jonesTenant.name || jonesTenant.fullName} (ID: ${tenantId})\n`);
    }
    
    // Fetch payment history
    const response = await fetch(`${BASE_URL}/api/payment-history/tenant/${tenantId}`);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.status} ${response.statusText}`);
      return;
    }
    
    const payments = await response.json();
    console.log(`📋 Total payment records: ${payments.length}`);
    
    // Filter out transaction records (only bills)
    const bills = payments.filter(p => !p.notes || !p.notes.includes('Payment transaction'));
    console.log(`📄 Bill records (excluding transactions): ${bills.length}\n`);
    
    if (bills.length === 0) {
      console.log('⚠️  No bills found for this tenant');
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // OLD BUGGY LOGIC (assumes completed = fully paid)
    console.log('❌ OLD BUGGY CALCULATION:\n');
    let oldTotalDebt = 0;
    bills.forEach(bill => {
      const expected = (bill.monthlyRent || 0) + (bill.totalUtilityCost || 0);
      let paid = 0;
      
      // Bug: assumes status determines payment
      if (bill.status === 'completed' || bill.status === 'overpaid') {
        paid = expected; // WRONG!
      } else if (bill.status === 'partial') {
        paid = bill.amount || 0;
      }
      
      const balance = expected - paid;
      if (balance > 0) {
        oldTotalDebt += balance;
        console.log(`  ${bill.forMonth}/${bill.forYear}: Expected KSH ${expected}, Status: ${bill.status}, Assumed Paid: KSH ${paid}, Balance: KSH ${balance}`);
      }
    });
    console.log(`\n  💰 OLD TOTAL DEBT: KSH ${oldTotalDebt.toLocaleString()}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // NEW FIXED LOGIC (uses actual amount field)
    console.log('✅ NEW FIXED CALCULATION:\n');
    let newTotalDebt = 0;
    bills.forEach(bill => {
      const expected = (bill.monthlyRent || 0) + (bill.totalUtilityCost || 0);
      const paid = bill.amount || 0; // CORRECT: use actual cumulative payment
      const balance = expected - paid;
      
      if (balance > 0) {
        newTotalDebt += balance;
        console.log(`  ${bill.forMonth}/${bill.forYear}: Expected KSH ${expected}, Actual Paid: KSH ${paid}, Balance: KSH ${balance}`);
      }
    });
    console.log(`\n  💰 NEW TOTAL DEBT: KSH ${newTotalDebt.toLocaleString()}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Show the difference
    const difference = oldTotalDebt - newTotalDebt;
    if (difference === 0) {
      console.log('✅ PERFECT! Both calculations match (no discrepancy)');
    } else {
      console.log(`⚠️  DISCREPANCY DETECTED: KSH ${Math.abs(difference).toLocaleString()}`);
      console.log(`   The old logic was ${difference > 0 ? 'OVERESTIMATING' : 'UNDERESTIMATING'} debt by this amount`);
      console.log(`   This bug caused the landlord dashboard to show incorrect totals!`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Show detailed breakdown
    console.log('📊 DETAILED BREAKDOWN:\n');
    bills.forEach(bill => {
      const expected = (bill.monthlyRent || 0) + (bill.totalUtilityCost || 0);
      const paid = bill.amount || 0;
      const balance = expected - paid;
      
      console.log(`\n  ${bill.forMonth}/${bill.forYear}:`);
      console.log(`    Rent: KSH ${bill.monthlyRent || 0}`);
      console.log(`    Utilities: KSH ${bill.totalUtilityCost || 0}`);
      console.log(`    Expected Total: KSH ${expected}`);
      console.log(`    Amount Field (Cumulative Paid): KSH ${paid}`);
      console.log(`    Status: ${bill.status}`);
      console.log(`    Balance: KSH ${balance} ${balance > 0 ? '(OUTSTANDING)' : '(PAID)'}`);
      
      if (bill.notes) {
        console.log(`    Notes: ${bill.notes}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) console.error('   Cause:', error.cause);
  }
}

// Get tenant ID from command line args
const tenantId = process.argv[2];

// Run verification
verifyDebtCalculations(tenantId).then(() => {
  console.log('\n✅ Verification complete!\n');
}).catch(err => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});

