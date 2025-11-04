import { Request, Response } from 'express';
import { TenantActivityLog } from '../database';
import type { InsertTenantActivityLog } from '../../shared/schema';
import { activityNotificationService } from '../websocket';

/**
 * Tenant Activity Controller
 * Handles tenant notification logging and retrieval
 */

// Create a new tenant activity log entry
export async function logTenantActivity(data: InsertTenantActivityLog): Promise<void> {
  try {
    const activity = await TenantActivityLog.create(data);
    console.log(`✅ Tenant activity logged: ${data.activityType} - ${data.title}`);
    
    // Broadcast to connected WebSocket clients (tenant)
    activityNotificationService.broadcastActivity(data.tenantId, {
      _id: activity._id,
      ...data,
      createdAt: activity.createdAt
    }, 'tenant');
  } catch (error) {
    console.error('❌ Failed to log tenant activity:', error);
    // Don't throw error - activity logging should not break main operations
  }
}

// Get recent activities for a tenant
export async function getRecentTenantActivities(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { limit = 50, includeRead = true } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const query: any = { tenantId };
    
    // Optionally filter out read activities
    if (includeRead === 'false') {
      query.isRead = false;
    }

    const activities = await TenantActivityLog
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('Error fetching tenant activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}

// Mark activity as read
export async function markTenantActivityAsRead(req: Request, res: Response) {
  try {
    const { activityId } = req.params;
    const { isRead } = req.body;

    const readStatus = isRead !== undefined ? isRead : true;

    const activity = await TenantActivityLog.findByIdAndUpdate(
      activityId,
      { isRead: readStatus },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    console.error('Error marking tenant activity as read:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
}

// Mark all activities as read for a tenant
export async function markAllTenantActivitiesAsRead(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    await TenantActivityLog.updateMany(
      { tenantId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All activities marked as read' });
  } catch (error) {
    console.error('Error marking all tenant activities as read:', error);
    res.status(500).json({ error: 'Failed to update activities' });
  }
}

// Get unread activity count
export async function getTenantUnreadCount(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    const count = await TenantActivityLog.countDocuments({
      tenantId,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting tenant unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/**
 * Helper function to create standardized tenant activity log entries
 */
export function createTenantActivityLog(
  tenantId: string,
  activityType: InsertTenantActivityLog['activityType'],
  title: string,
  description: string,
  metadata?: InsertTenantActivityLog['metadata'],
  priority: InsertTenantActivityLog['priority'] = 'medium'
): InsertTenantActivityLog {
  // Map activity types to icons
  const iconMap: Record<InsertTenantActivityLog['activityType'], InsertTenantActivityLog['icon']> = {
    'bill_created': 'file-text',
    'bill_reminder': 'bell',
    'bill_overdue': 'alert-circle',
    'grace_period_warning': 'clock',
    'payment_processed': 'check-circle',
    'payment_failed': 'x-circle',
    'partial_payment_received': 'dollar-sign',
    'final_notice': 'alert-triangle',
    'system_alert': 'bell'
  };

  return {
    tenantId,
    activityType,
    title,
    description,
    metadata,
    icon: iconMap[activityType],
    priority
  };
}
