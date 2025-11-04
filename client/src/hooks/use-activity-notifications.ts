import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface ActivityNotification {
  type: 'activity' | 'connected' | 'pong';
  data?: any;
  message?: string;
  timestamp: string;
}

/**
 * Custom hook for real-time activity notifications via WebSocket
 * Automatically refetches activities when new ones arrive
 * 
 * @param userId - The landlord or tenant ID
 * @param userType - Either 'landlord' or 'tenant'
 * @param enabled - Whether to enable the WebSocket connection
 * @param onActivity - Optional callback when new activity arrives
 */
export function useActivityNotifications(
  userId: string | undefined,
  userType: 'landlord' | 'tenant' = 'landlord',
  enabled: boolean = true,
  onActivity?: (activity: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!userId || !enabled) {
      console.log('⏸️  WebSocket connection skipped:', { userId, enabled });
      return;
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    try {
      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const paramName = userType === 'landlord' ? 'landlordId' : 'tenantId';
      const wsUrl = `${protocol}//${host}/ws/activities?${paramName}=${userId}`;

      console.log(`🔌 Connecting to WebSocket (${userType}): ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket connected successfully (${userType})`);
        reconnectAttemptsRef.current = 0; // Reset reconnection attempts
      };

      ws.onmessage = (event) => {
        try {
          const notification: ActivityNotification = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', notification);

          if (notification.type === 'connected') {
            console.log('🎉 WebSocket connection confirmed:', notification.message);
          } else if (notification.type === 'activity') {
            // New activity received
            console.log('🔔 New activity:', notification.data);
            
            // Invalidate ALL activity-related queries for this user
            const apiPath = userType === 'landlord' 
              ? `/api/activities/landlord/${userId}`
              : `/api/tenant-activities/tenant/${userId}`;
            
            queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKey = query.queryKey as string[];
                return queryKey.some((key) => 
                  typeof key === 'string' && 
                  key.includes(apiPath)
                );
              }
            });

            // Show toast notification
            toast({
              title: notification.data.title,
              description: notification.data.description,
              duration: 5000,
            });

            // Call custom handler if provided
            if (onActivity) {
              onActivity(notification.data);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log(`👋 WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current + 1}/5)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 5) {
          console.log('❌ Max reconnection attempts reached. Giving up.');
          toast({
            title: "Connection Lost",
            description: "Real-time updates unavailable. Please refresh the page.",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
    }
  }, [userId, userType, enabled, queryClient, toast, onActivity]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('🛑 Closing WebSocket connection');
      wsRef.current.close(1000, 'Component unmounted');
      wsRef.current = null;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Send ping every 25 seconds to keep connection alive
  useEffect(() => {
    if (!enabled || !userId) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
    };
  }, [enabled, userId]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect,
    disconnect,
  };
}
