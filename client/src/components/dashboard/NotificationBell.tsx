import { Bell, UserPlus, UserMinus, DollarSign, AlertCircle, Building, FileText, CheckCircle, Zap } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { useState } from "react";

export function NotificationBell() {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Enable real-time notifications
  const { isConnected } = useActivityNotifications(
    currentUser?.id,
    'landlord',
    !!currentUser?.id
  );

  // Debug: Log connection status
  console.log('🔌 WebSocket connected:', isConnected);

  // Fetch all activities (both read and unread)
  const { data: allActivities = [] } = useQuery({
    queryKey: [`/api/activities/landlord/${currentUser?.id}/all`],
    queryFn: async () => {
      const response = await fetch(
        `/api/activities/landlord/${currentUser?.id}?limit=50&includeRead=true`
      );
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch unread count
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: [`/api/activities/landlord/${currentUser?.id}/unread-count`],
    queryFn: async () => {
      const response = await fetch(
        `/api/activities/landlord/${currentUser?.id}/unread-count`
      );
      if (!response.ok) throw new Error("Failed to fetch unread count");
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const unreadCount = unreadData?.count || 0;

  // Toggle read/unread status
  const toggleReadStatus = async (activityId: string, currentIsRead: boolean) => {
    try {
      await fetch(`/api/activities/${activityId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !currentIsRead }),
      });
      
      // Refetch both queries to update the UI
      queryClient.invalidateQueries({ 
        queryKey: [`/api/activities/landlord/${currentUser?.id}/all`] 
      });
      refetchUnreadCount();
    } catch (error) {
      console.error("Failed to toggle read status:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/activities/landlord/${currentUser?.id}/read-all`, {
        method: "PUT",
      });
      
      // Refetch queries to update the UI
      queryClient.invalidateQueries({ 
        queryKey: [`/api/activities/landlord/${currentUser?.id}/all`] 
      });
      refetchUnreadCount();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'user-plus': UserPlus,
      'user-minus': UserMinus,
      'dollar-sign': DollarSign,
      'alert-circle': AlertCircle,
      'building': Building,
      'building-minus': Building,
      'file-text': FileText,
      'check-circle': CheckCircle,
      'zap': Zap,
      'bell': Bell,
    };
    return iconMap[iconName] || Bell;
  };

  // Group activities: unread first, then read
  const unreadActivities = allActivities.filter((a: any) => !a.isRead);
  const readActivities = allActivities.filter((a: any) => a.isRead);
  const sortedActivities = [...unreadActivities, ...readActivities];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">Notifications</h3>
            {/* Connection indicator */}
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-xs text-gray-400">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[500px]">
          {sortedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground text-center">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                You'll see activity updates here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedActivities.map((activity: any) => {
                const IconComponent = getIconComponent(activity.icon);
                const isUnread = !activity.isRead;
                
                // Priority color mapping
                const priorityColors: Record<string, string> = {
                  low: 'bg-gray-100 text-gray-600',
                  medium: 'bg-blue-100 text-blue-600',
                  high: 'bg-orange-100 text-orange-600',
                  urgent: 'bg-red-100 text-red-600',
                };

                const iconColorClass = priorityColors[activity.priority] || 'bg-gray-100 text-gray-600';
                
                return (
                  <div
                    key={activity._id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      isUnread ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                    onClick={() => toggleReadStatus(activity._id, activity.isRead)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-full flex-shrink-0 ${iconColorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-700'}`}>
                            {activity.title}
                          </p>
                          {/* Unread indicator dot */}
                          {isUnread && (
                            <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        
                        <p className={`text-xs ${isUnread ? 'text-gray-700' : 'text-gray-500'} line-clamp-2 mb-1`}>
                          {activity.description}
                        </p>
                        
                        {activity.metadata?.amount && (
                          <p className="text-xs font-semibold text-green-600 mb-1">
                            KSH {activity.metadata.amount.toLocaleString()}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with count */}
        {sortedActivities.length > 0 && (
          <div className="p-3 border-t bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? (
                <span className="font-medium text-blue-600">{unreadCount} unread</span>
              ) : (
                <span>All caught up! 🎉</span>
              )}
              {' · '}
              <span>{sortedActivities.length} total</span>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
