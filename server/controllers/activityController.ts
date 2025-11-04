import { Request, Response } from 'express';
import { ActivityLog } from '../database';
import type { InsertActivityLog } from '../../shared/schema';
import { activityNotificationService } from '../websocket';

/**
 * Activity Controller
 * Handles activity logging and retrieval for landlord dashboard
 */

// Create a new activity log entry
export async function logActivity(data: InsertActivityLog): Promise<void> {
  try {
    const activity = await ActivityLog.create(data);
    console.log(`✅ Activity logged: ${data.activityType} - ${data.title}`);
    
    // Broadcast to connected WebSocket clients (landlord)
    activityNotificationService.broadcastActivity(data.landlordId, {
      _id: activity._id,
      ...data,
      createdAt: activity.createdAt
    }, 'landlord');
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Don't throw error - activity logging should not break main operations
  }
}

// Get recent activities for a landlord
export async function getRecentActivities(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;
    const { limit = 5, includeRead = true } = req.query;

    if (!landlordId) {
      return res.status(400).json({ error: 'Landlord ID is required' });
    }

    const query: any = { landlordId };
    
    // Optionally filter out read activities
    if (includeRead === 'false') {
      query.isRead = false;
    }

    const activities = await ActivityLog
      .find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}

// Mark activity as read
export async function markActivityAsRead(req: Request, res: Response) {
  try {
    const { activityId } = req.params;
    const { isRead } = req.body;

    // If isRead is provided in body, use it (for toggle), otherwise default to true
    const readStatus = isRead !== undefined ? isRead : true;

    const activity = await ActivityLog.findByIdAndUpdate(
      activityId,
      { isRead: readStatus },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activity);
  } catch (error) {
    console.error('Error marking activity as read:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
}

// Mark all activities as read for a landlord
export async function markAllActivitiesAsRead(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;

    await ActivityLog.updateMany(
      { landlordId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All activities marked as read' });
  } catch (error) {
    console.error('Error marking all activities as read:', error);
    res.status(500).json({ error: 'Failed to update activities' });
  }
}

// Get unread activity count
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const { landlordId } = req.params;

    const count = await ActivityLog.countDocuments({
      landlordId,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

// Delete old activities (cleanup function)
export async function cleanupOldActivities(landlordId: string, daysToKeep: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await ActivityLog.deleteMany({
      landlordId,
      createdAt: { $lt: cutoffDate }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old activities for landlord ${landlordId}`);
  } catch (error) {
    console.error('Error cleaning up old activities:', error);
  }
}

/**
 * Helper function to create standardized activity log entries
 */
export function createActivityLog(
  landlordId: string,
  activityType: InsertActivityLog['activityType'],
  title: string,
  description: string,
  metadata?: InsertActivityLog['metadata'],
  priority: InsertActivityLog['priority'] = 'medium'
): InsertActivityLog {
  // Map activity types to icons
  const iconMap: Record<InsertActivityLog['activityType'], InsertActivityLog['icon']> = {
    'tenant_registered': 'user-plus',
    'tenant_removed': 'user-minus',
    'payment_received': 'dollar-sign',
    'payment_failed': 'alert-circle',
    'property_added': 'building',
    'property_updated': 'building',
    'property_removed': 'building-minus',
    'debt_created': 'file-text',
    'debt_cleared': 'check-circle',
    'rent_overdue': 'alert-circle',
    'utility_bill_added': 'zap',
    'system_alert': 'bell'
  };

  return {
    landlordId,
    activityType,
    title,
    description,
    metadata,
    icon: iconMap[activityType],
    priority
  };
}
