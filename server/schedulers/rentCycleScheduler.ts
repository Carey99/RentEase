import { Tenant as TenantModel } from "../database";

/**
 * Monthly Rent Cycle Reset Scheduler
 * 
 * This job runs daily to check if we've entered a new month.
 * When a new month begins, it resets all tenants' currentMonthPaid flag to false.
 * 
 * Based on RENT_CYCLE_GUIDE.md - Example 3: Month Transition
 */
export class RentCycleScheduler {
  private lastProcessedMonth: number = -1;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler - runs every day at midnight
   */
  start() {
    console.log('🕐 Rent Cycle Scheduler started');
    
    // Run immediately on startup to catch any missed transitions
    this.processMonthTransition();
    
    // Run daily at midnight (00:00:00)
    // Calculate milliseconds until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Schedule first run at midnight
    setTimeout(() => {
      this.processMonthTransition();
      
      // Then run every 24 hours
      this.intervalId = setInterval(() => {
        this.processMonthTransition();
      }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }, msUntilMidnight);
    
    console.log(`⏰ Next rent cycle check scheduled for: ${tomorrow.toISOString()}`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Rent Cycle Scheduler stopped');
    }
  }

  /**
   * Process month transition
   * If we've entered a new month, reset all currentMonthPaid flags
   */
  private async processMonthTransition() {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      console.log(`📅 Checking for month transition: ${currentMonth}/${currentYear}`);
      
      // Check if this is a different month than we last processed
      if (this.lastProcessedMonth === currentMonth) {
        console.log('  ✓ Same month, no transition needed');
        return;
      }
      
      console.log(`  🔄 New month detected! Checking which tenants need currentMonthPaid reset...`);
      
      // Get all tenants to check their status
      const allTenants = await TenantModel.find({}).lean();
      console.log(`  📊 Total tenants: ${allTenants.length}`);
      
      // Only reset currentMonthPaid to false for tenants who:
      // Haven't paid for the current month (paidForMonth !== currentMonth OR paidForYear !== currentYear)
      const tenantsToReset = allTenants.filter(t => {
        const paidForMonth = t.rentCycle?.paidForMonth;
        const paidForYear = t.rentCycle?.paidForYear;
        
        // Reset if:
        // 1. No payment record at all
        // 2. Paid for a different month
        // 3. Paid for a different year
        const shouldReset = !paidForMonth || !paidForYear || 
                           paidForMonth !== currentMonth || 
                           paidForYear !== currentYear;
        
        if (!shouldReset) {
          console.log(`  ✅ ${t.fullName}: Already paid for ${currentMonth}/${currentYear}, keeping currentMonthPaid=true`);
        }
        
        return shouldReset;
      });
      
      console.log(`  🔄 Resetting ${tenantsToReset.length} tenants who haven't paid for ${currentMonth}/${currentYear}`);
      
      // Update only the tenants that need resetting
      const tenantIdsToReset = tenantsToReset.map(t => t._id);
      
      const result = await TenantModel.updateMany(
        { _id: { $in: tenantIdsToReset } },
        { $set: { 'rentCycle.currentMonthPaid': false } }
      );
      
      // ALSO: Set currentMonthPaid=true for tenants who HAVE paid for current month
      const tenantsPaid = allTenants.filter(t => {
        const paidForMonth = t.rentCycle?.paidForMonth;
        const paidForYear = t.rentCycle?.paidForYear;
        return paidForMonth === currentMonth && paidForYear === currentYear;
      });
      
      if (tenantsPaid.length > 0) {
        const tenantIdsPaid = tenantsPaid.map(t => t._id);
        await TenantModel.updateMany(
          { _id: { $in: tenantIdsPaid } },
          { $set: { 'rentCycle.currentMonthPaid': true } }
        );
        console.log(`  ✅ Set currentMonthPaid=true for ${tenantsPaid.length} tenants who paid for ${currentMonth}/${currentYear}`);
      }
      
      console.log(`  ✅ Reset currentMonthPaid for ${result.modifiedCount} tenants who haven't paid`);
      console.log(`  📊 Current month: ${currentMonth}/${currentYear}`);
      
      // Update last processed month
      this.lastProcessedMonth = currentMonth;
      
      // Log details for debugging (requery to get updated states)
      const updatedTenants = await TenantModel.find({}).select('fullName rentCycle').lean();
      console.log('  📋 Tenant rent cycle states after reset:');
      updatedTenants.forEach(tenant => {
        console.log(`    - ${tenant.fullName}: currentMonthPaid=${tenant.rentCycle?.currentMonthPaid}, paidFor=${tenant.rentCycle?.paidForMonth}/${tenant.rentCycle?.paidForYear}`);
      });
      
    } catch (error) {
      console.error('❌ Error processing month transition:', error);
    }
  }

  /**
   * Manually trigger a month transition check (for testing)
   */
  async manualTrigger() {
    console.log('🔧 Manual rent cycle check triggered');
    this.lastProcessedMonth = -1; // Force a transition check
    await this.processMonthTransition();
  }
}

// Export singleton instance
export const rentCycleScheduler = new RentCycleScheduler();
