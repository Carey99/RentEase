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
      
      console.log(`  🔄 New month detected! Resetting all currentMonthPaid flags...`);
      
      // Update all tenants: reset currentMonthPaid to false
      const result = await TenantModel.updateMany(
        {}, // All tenants
        {
          $set: {
            'rentCycle.currentMonthPaid': false,
            // Don't update paidForMonth/paidForYear - keep history
          }
        }
      );
      
      console.log(`  ✅ Reset currentMonthPaid for ${result.modifiedCount} tenants`);
      console.log(`  📊 Current month: ${currentMonth}/${currentYear}`);
      
      // Update last processed month
      this.lastProcessedMonth = currentMonth;
      
      // Log details for debugging
      const allTenants = await TenantModel.find({}).select('fullName rentCycle').lean();
      console.log('  📋 Tenant rent cycle states after reset:');
      allTenants.forEach(tenant => {
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
