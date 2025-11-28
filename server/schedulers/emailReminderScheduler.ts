/**
 * Email Reminder Scheduler
 * Automatically sends rent reminder emails based on landlord settings
 */

import cron from 'node-cron';
import { Landlord, Tenant } from '../database';
import { sendRentReminderEmail } from '../services/emailService';
import { addDays, startOfDay, differenceInDays, format } from 'date-fns';

/**
 * Calculate next due date for a tenant
 */
function calculateNextDueDate(tenant: any): Date {
  const rentCycle = tenant.apartmentInfo?.rentCycle || 'monthly';
  const rentCycleStartDay = tenant.apartmentInfo?.rentCycleStartDay || 1;
  const lastPaymentDate = tenant.apartmentInfo?.lastPaymentDate 
    ? new Date(tenant.apartmentInfo.lastPaymentDate)
    : null;

  const today = startOfDay(new Date());
  let nextDueDate: Date;

  if (lastPaymentDate) {
    // Calculate based on last payment
    switch (rentCycle) {
      case 'weekly':
        nextDueDate = addDays(lastPaymentDate, 7);
        break;
      case 'biweekly':
        nextDueDate = addDays(lastPaymentDate, 14);
        break;
      case 'monthly':
      default:
        nextDueDate = new Date(lastPaymentDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
    }
  } else {
    // No payment yet, use rent cycle start day
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    nextDueDate = new Date(currentYear, currentMonth, rentCycleStartDay);
    
    // If the due date has passed this month, move to next month
    if (nextDueDate < today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
  }

  return startOfDay(nextDueDate);
}

/**
 * Check and send reminder emails
 */
async function checkAndSendReminders() {
  console.log('\n⏰ Running automatic email reminder check...');
  const startTime = Date.now();

  try {
    // Get all landlords with email reminders enabled
    const landlords = await Landlord.find({
      'emailSettings.enabled': true,
      'emailSettings.autoRemindersEnabled': true
    });

    console.log(`📊 Found ${landlords.length} landlord(s) with auto-reminders enabled`);

    let totalReminders = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const landlord of landlords) {
      try {
        const reminderDaysBefore = landlord.emailSettings?.reminderDaysBefore || 3;
        
        // Get all tenants for THIS SPECIFIC landlord
        const tenants = await Tenant.find({
          'apartmentInfo.landlordId': landlord.id
        });

        console.log(`\n👥 Processing landlord ${landlord.fullName} (${landlord.email}): ${tenants.length} tenant(s)`);

        for (const tenant of tenants) {
          try {
            // Use tenant's actual rent cycle data (already correctly calculated)
            const nextDueDate = tenant.rentCycle?.nextDueDate || new Date();
            const daysRemaining = tenant.rentCycle?.daysRemaining ?? 0;
            const rentStatus = tenant.rentCycle?.rentStatus || 'unknown';
            const today = startOfDay(new Date());

            console.log(`  📅 Tenant ${tenant.fullName}:`);
            console.log(`     Due: ${format(nextDueDate, 'MMM dd, yyyy')}`);
            console.log(`     Days remaining: ${daysRemaining}`);
            console.log(`     Status: ${rentStatus}`);
            console.log(`     Reminder threshold: ${reminderDaysBefore} days before`);

            // Check if reminder should be sent
            if (daysRemaining === reminderDaysBefore && daysRemaining >= 0) {
              console.log(`    ✅ MATCH! Sending reminder to ${tenant.fullName} from landlord ${landlord.fullName}`);
              
              await sendRentReminderEmail({
                tenantId: tenant.id,
                tenantName: tenant.fullName,
                tenantEmail: tenant.email,
                landlordId: landlord.id,
                landlordName: landlord.fullName,
                landlordEmail: landlord.email,
                landlordPhone: landlord.phone ?? undefined,
                amountDue: Number(tenant.apartmentInfo?.rentAmount) || 0,
                dueDate: format(nextDueDate, 'MMMM dd, yyyy'),
                daysRemaining: daysRemaining, // Use actual value, can be negative for overdue
                propertyName: tenant.apartmentInfo?.propertyName || 'Property',
                unitNumber: tenant.apartmentInfo?.unitNumber || 'N/A',
                customMessage: landlord.emailSettings?.templates?.rentReminder?.customMessage,
              });

              totalReminders++;
              successCount++;
              console.log(`    ✅ Reminder sent successfully to ${tenant.email}`);
            } else if (daysRemaining < 0) {
              console.log(`    ⚠️  Payment overdue by ${Math.abs(daysRemaining)} days - not sending reminder`);
            } else {
              console.log(`    ⏭️  Skipping - not matching reminder threshold (${daysRemaining} != ${reminderDaysBefore})`);
            }
          } catch (tenantError) {
            console.error(`    ❌ Failed to process tenant ${tenant.fullName}:`, tenantError);
            failureCount++;
          }
        }
      } catch (landlordError) {
        console.error(`❌ Error processing landlord ${landlord.fullName}:`, landlordError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Email reminder check completed in ${duration}ms`);
    console.log(`📊 Summary: ${totalReminders} reminders checked, ${successCount} sent, ${failureCount} failed`);

  } catch (error) {
    console.error('❌ Error in email reminder scheduler:', error);
  }
}

/**
 * Initialize the scheduler
 * Runs daily at 8:00 AM East Africa Time (UTC+3)
 */
export function startEmailReminderScheduler() {
  // Run every day at 8:00 AM
  // Cron format: minute hour day month weekday
  const cronSchedule = '0 8 * * *';

  console.log('\n⏰ Initializing email reminder scheduler...');
  console.log(`📅 Schedule: Daily at 8:00 AM EAT (cron: ${cronSchedule})`);
  console.log(`🌍 Current time: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} EAT`);

  const task = cron.schedule(cronSchedule, checkAndSendReminders, {
    timezone: 'Africa/Nairobi'
  });

  console.log('✅ Email reminder scheduler started');
  console.log('📝 To manually trigger: POST /api/emails/trigger-scheduler\n');

  // Run immediately on startup for testing (optional - remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Development mode: Scheduler will run 5 seconds after startup...\n');
    setTimeout(() => checkAndSendReminders(), 5000); // Wait 5 seconds after startup
  }

  return task;
}

/**
 * Manual trigger for testing
 */
export async function triggerManualReminderCheck() {
  console.log('🧪 Manual reminder check triggered');
  await checkAndSendReminders();
}
