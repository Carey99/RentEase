import { PaymentHistory, Tenant as TenantModel } from "../database";
import { logTenantActivity, createTenantActivityLog } from "../controllers/tenantActivityController";

/**
 * Bill Notification Scheduler
 * 
 * This job runs daily to check for:
 * 1. Overdue bills (past due date + grace period) - Send overdue warnings
 * 2. Bills unpaid for 10+ days - Send final notices
 */
export class BillNotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler - runs every day at 8:00 AM
   */
  start() {
    console.log('🔔 Bill Notification Scheduler started');
    
    // Run immediately on startup to catch any overdue bills
    this.processBillNotifications();
    
    // Calculate milliseconds until next 8:00 AM
    const now = new Date();
    const next8AM = new Date(now);
    next8AM.setHours(8, 0, 0, 0);
    
    // If it's already past 8 AM today, schedule for tomorrow 8 AM
    if (now.getHours() >= 8) {
      next8AM.setDate(next8AM.getDate() + 1);
    }
    
    const msUntil8AM = next8AM.getTime() - now.getTime();
    
    // Schedule first run at 8:00 AM
    setTimeout(() => {
      this.processBillNotifications();
      
      // Then run every 24 hours
      this.intervalId = setInterval(() => {
        this.processBillNotifications();
      }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }, msUntil8AM);
    
    console.log(`⏰ Next bill notification check scheduled for: ${next8AM.toISOString()}`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Bill Notification Scheduler stopped');
    }
  }

  /**
   * Process all pending bills and send appropriate notifications
   */
  private async processBillNotifications() {
    try {
      const now = new Date();
      console.log(`📋 Checking for overdue bills: ${now.toISOString()}`);
      
      // Find all pending bills (not fully paid)
      const pendingBills = await PaymentHistory.find({
        status: 'pending'
      }).lean();
      
      console.log(`  Found ${pendingBills.length} pending bills to check`);
      
      let overdueCount = 0;
      let finalNoticeCount = 0;
      
      for (const bill of pendingBills) {
        // Get tenant for logging
        const tenant = await TenantModel.findById(bill.tenantId).select('fullName').lean();
        
        // Get property for grace period settings
        const { Property } = await import("../database");
        const property = await Property.findById(bill.propertyId)
          .select('rentSettings')
          .lean();
        
        const gracePeriod = property?.rentSettings?.gracePeriodDays || 3;
        const dueDate = new Date(bill.paymentDate);
        const overdueDate = new Date(dueDate);
        overdueDate.setDate(overdueDate.getDate() + gracePeriod);
        
        const daysSinceCreation = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceOverdue = Math.floor((now.getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const totalBillAmount = (bill.monthlyRent || 0) + (bill.totalUtilityCost || 0);
        const amountPaid = bill.amount || 0;
        
        // Check for 10-day final notice (created 10+ days ago, no payment at all)
        if (daysSinceCreation >= 10 && amountPaid === 0) {
          // Check if we already sent final notice
          const existingFinalNotice = await this.hasRecentNotification(
            bill.tenantId.toString(),
            'final_notice',
            bill._id?.toString(),
            1 // Within last 1 day
          );
          
          if (!existingFinalNotice) {
            await logTenantActivity(createTenantActivityLog(
              bill.tenantId.toString(),
              'final_notice',
              'Final Notice - Immediate Action Required',
              `Your bill for ${bill.forMonth}/${bill.forYear} has been unpaid for ${daysSinceCreation} days. Total due: KSH ${totalBillAmount.toLocaleString()}. Please pay immediately to avoid further action.`,
              {
                landlordId: bill.landlordId.toString(),
                propertyId: bill.propertyId.toString(),
                paymentId: bill._id?.toString(),
                amount: totalBillAmount,
                dueDate: dueDate.toISOString(),
                daysOverdue: daysSinceCreation,
              },
              'urgent'
            ));
            
            finalNoticeCount++;
            console.log(`  🚨 Final notice sent to tenant ${tenant?.fullName || 'Unknown'} - ${daysSinceCreation} days unpaid`);
          }
        }
        // Check for overdue bills (past due date + grace period)
        else if (daysSinceOverdue >= 0 && amountPaid < totalBillAmount) {
          // Check if we already sent overdue notification today
          const existingOverdue = await this.hasRecentNotification(
            bill.tenantId.toString(),
            'bill_overdue',
            bill._id?.toString(),
            1 // Within last 1 day
          );
          
          if (!existingOverdue) {
            const remainingAmount = totalBillAmount - amountPaid;
            const paymentStatus = amountPaid > 0 ? 'partially paid' : 'unpaid';
            
            await logTenantActivity(createTenantActivityLog(
              bill.tenantId.toString(),
              'bill_overdue',
              'Bill Overdue - Payment Required',
              `Your bill for ${bill.forMonth}/${bill.forYear} is now ${daysSinceOverdue} days overdue (${paymentStatus}). Remaining balance: KSH ${remainingAmount.toLocaleString()}`,
              {
                landlordId: bill.landlordId.toString(),
                propertyId: bill.propertyId.toString(),
                paymentId: bill._id?.toString(),
                amount: remainingAmount,
                dueDate: dueDate.toISOString(),
                daysOverdue: daysSinceOverdue,
              },
              'high'
            ));
            
            overdueCount++;
            console.log(`  ⚠️ Overdue notification sent to tenant ${tenant?.fullName || 'Unknown'} - ${daysSinceOverdue} days past grace period`);
          }
        }
      }
      
      console.log(`  ✅ Notifications sent: ${overdueCount} overdue, ${finalNoticeCount} final notices`);
      
    } catch (error) {
      console.error('❌ Error processing bill notifications:', error);
    }
  }

  /**
   * Check if a notification was recently sent to avoid spam
   */
  private async hasRecentNotification(
    tenantId: string,
    activityType: string,
    paymentId: string | undefined,
    withinDays: number
  ): Promise<boolean> {
    try {
      // Import here to avoid circular dependency
      const { TenantActivityLog } = await import("../database");
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - withinDays);
      
      const existingNotification = await TenantActivityLog.findOne({
        tenantId,
        activityType,
        'metadata.paymentId': paymentId,
        createdAt: { $gte: cutoffDate }
      }).lean();
      
      return !!existingNotification;
    } catch (error) {
      console.error('Error checking recent notifications:', error);
      return false;
    }
  }
}

// Export singleton instance
export const billNotificationScheduler = new BillNotificationScheduler();
