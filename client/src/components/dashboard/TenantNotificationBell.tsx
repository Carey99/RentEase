import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import {
  FileText,
  Bell as BellIcon,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
} from "lucide-react";

interface TenantActivity {
  _id: string;
  tenantId: string;
  activityType: string;
  title: string;
  description: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    landlordId?: string;
    propertyId?: string;
    propertyName?: string;
    paymentId?: string;
    amount?: number;
    dueDate?: string;
    daysOverdue?: number;
  };
  isRead: boolean;
  createdAt: string;
}

interface TenantNotificationBellProps {
  tenantId: string;
}

const iconMap: Record<string, any> = {
  "file-text": FileText,
  "bell": BellIcon,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  "dollar-sign": DollarSign,
  "clock": Clock,
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function TenantNotificationBell({ tenantId }: TenantNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // WebSocket connection for real-time notifications
  const { isConnected } = useActivityNotifications(tenantId, 'tenant', !!tenantId);

  // Fetch all tenant activities (both read and unread)
  const { data: activities = [] } = useQuery<TenantActivity[]>({
    queryKey: [`/api/tenant-activities/tenant/${tenantId}/all`],
    queryFn: async () => {
      const response = await fetch(
        `/api/tenant-activities/tenant/${tenantId}?limit=50&includeRead=true`
      );
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!tenantId,
  });

  // Fetch unread count
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery<{ count: number }>({
    queryKey: [`/api/tenant-activities/tenant/${tenantId}/unread-count`],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-activities/tenant/${tenantId}/unread-count`);
      if (!response.ok) throw new Error('Failed to fetch unread count');
      return response.json();
    },
    enabled: !!tenantId,
  });

  const unreadCount = unreadData?.count || 0;

  // Toggle read/unread status
  const toggleReadStatus = async (activityId: string, currentIsRead: boolean) => {
    try {
      await fetch(`/api/tenant-activities/${activityId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !currentIsRead }),
      });
      
      // Refetch both queries to update the UI
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenant-activities/tenant/${tenantId}/all`] 
      });
      refetchUnreadCount();
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`/api/tenant-activities/tenant/${tenantId}/read-all`, {
        method: 'PUT',
      });
      
      // Refetch queries to update the UI
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenant-activities/tenant/${tenantId}/all`] 
      });
      refetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Sort activities: unread first, then by date
  const unreadActivities = activities.filter((a) => !a.isRead);
  const readActivities = activities.filter((a) => a.isRead);
  const sortedActivities = [...unreadActivities, ...readActivities];

  const handleActivityClick = (activityId: string, currentIsRead: boolean) => {
    toggleReadStatus(activityId, currentIsRead);
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {isConnected && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[500px]">
          {sortedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            sortedActivities.map((activity) => {
              const IconComponent = iconMap[activity.icon] || BellIcon;
              const priorityColor = priorityColors[activity.priority] || "text-gray-500";
              
              return (
                <DropdownMenuItem
                  key={activity._id}
                  className={`flex flex-col items-start gap-2 p-4 cursor-pointer ${
                    !activity.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleActivityClick(activity._id, activity.isRead)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${priorityColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!activity.isRead ? 'font-bold' : 'font-normal'}`}>
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                      {activity.metadata?.amount && (
                        <p className="text-xs font-medium mt-1 text-green-600">
                          Amount: KSH {activity.metadata.amount.toLocaleString()}
                        </p>
                      )}
                      {activity.metadata?.daysOverdue !== undefined && activity.metadata.daysOverdue > 0 && (
                        <p className="text-xs font-medium mt-1 text-red-600">
                          {activity.metadata.daysOverdue} {activity.metadata.daysOverdue === 1 ? 'day' : 'days'} overdue
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="px-4 py-2 text-center">
          {unreadCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread · {activities.length} total
            </p>
          ) : activities.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              All caught up! 🎉
            </p>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
