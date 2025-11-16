import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { ActivityLog } from '../shared/schema';

interface AuthenticatedWebSocket extends WebSocket {
  landlordId?: string;
  tenantId?: string;
  userType?: 'landlord' | 'tenant';
  isAlive?: boolean;
}

class ActivityNotificationService {
  private wss: WebSocketServer | null = null;
  private landlordClients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private tenantClients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws/activities'
    });

    console.log('🔌 WebSocket server initialized on path: /ws/activities');

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('📱 New WebSocket connection attempt');
      
      // Extract landlordId or tenantId from query parameters
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const landlordId = url.searchParams.get('landlordId');
      const tenantId = url.searchParams.get('tenantId');

      // Must provide either landlordId or tenantId
      if (!landlordId && !tenantId) {
        console.log('❌ WebSocket connection rejected: No landlordId or tenantId provided');
        ws.close(1008, 'Landlord ID or Tenant ID required');
        return;
      }

      // Determine user type and set appropriate ID
      if (landlordId) {
        ws.landlordId = landlordId;
        ws.userType = 'landlord';
        ws.isAlive = true;

        // Add client to the landlord's set
        if (!this.landlordClients.has(landlordId)) {
          this.landlordClients.set(landlordId, new Set());
        }
        this.landlordClients.get(landlordId)!.add(ws);

        console.log(`✅ WebSocket connected for landlord: ${landlordId}`);
        console.log(`📊 Active connections for landlord ${landlordId}: ${this.landlordClients.get(landlordId)!.size}`);
      } else if (tenantId) {
        ws.tenantId = tenantId;
        ws.userType = 'tenant';
        ws.isAlive = true;

        // Add client to the tenant's set
        if (!this.tenantClients.has(tenantId)) {
          this.tenantClients.set(tenantId, new Set());
        }
        this.tenantClients.get(tenantId)!.add(ws);

        console.log(`✅ WebSocket connected for tenant: ${tenantId}`);
        console.log(`📊 Active connections for tenant ${tenantId}: ${this.tenantClients.get(tenantId)!.size}`);
      }

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: `Successfully connected to activity notifications as ${ws.userType}`,
        timestamp: new Date().toISOString()
      }));

      // Handle pong responses (heartbeat)
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          const userId = ws.landlordId || ws.tenantId;
          console.log(`📨 Received message from ${ws.userType} ${userId}:`, data);

          // Handle ping/pong
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        if (ws.landlordId) {
          console.log(`👋 WebSocket disconnected for landlord: ${ws.landlordId}`);
          const landlordClientSet = this.landlordClients.get(ws.landlordId);
          if (landlordClientSet) {
            landlordClientSet.delete(ws);
            if (landlordClientSet.size === 0) {
              this.landlordClients.delete(ws.landlordId);
              console.log(`🧹 Removed landlord ${ws.landlordId} from active connections`);
            } else {
              console.log(`📊 Remaining connections for landlord ${ws.landlordId}: ${landlordClientSet.size}`);
            }
          }
        } else if (ws.tenantId) {
          console.log(`👋 WebSocket disconnected for tenant: ${ws.tenantId}`);
          const tenantClientSet = this.tenantClients.get(ws.tenantId);
          if (tenantClientSet) {
            tenantClientSet.delete(ws);
            if (tenantClientSet.size === 0) {
              this.tenantClients.delete(ws.tenantId);
              console.log(`🧹 Removed tenant ${ws.tenantId} from active connections`);
            } else {
              console.log(`📊 Remaining connections for tenant ${ws.tenantId}: ${tenantClientSet.size}`);
            }
          }
        }
      });

      // Handle errors
      ws.on('error', (error) => {
        const userId = ws.landlordId || ws.tenantId;
        console.error(`❌ WebSocket error for ${ws.userType} ${userId}:`, error);
      });
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();
  }

  /**
   * Start heartbeat to detect and remove dead connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Check landlord connections
      this.landlordClients.forEach((clientSet, landlordId) => {
        clientSet.forEach((ws) => {
          if (ws.isAlive === false) {
            console.log(`💀 Terminating dead connection for landlord ${landlordId}`);
            ws.terminate();
            clientSet.delete(ws);
            return;
          }

          ws.isAlive = false;
          ws.ping();
        });

        // Clean up empty landlord entries
        if (clientSet.size === 0) {
          this.landlordClients.delete(landlordId);
        }
      });

      // Check tenant connections
      this.tenantClients.forEach((clientSet, tenantId) => {
        clientSet.forEach((ws) => {
          if (ws.isAlive === false) {
            console.log(`💀 Terminating dead connection for tenant ${tenantId}`);
            ws.terminate();
            clientSet.delete(ws);
            return;
          }

          ws.isAlive = false;
          ws.ping();
        });

        // Clean up empty tenant entries
        if (clientSet.size === 0) {
          this.tenantClients.delete(tenantId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Broadcast activity notification to all connected clients for a specific landlord
   */
  broadcastActivity(userId: string, activity: any, userType: 'landlord' | 'tenant' = 'landlord') {
    const clients = userType === 'landlord' 
      ? this.landlordClients.get(userId)
      : this.tenantClients.get(userId);
    
    if (!clients || clients.size === 0) {
      console.log(`📭 No active WebSocket clients for ${userType} ${userId}`);
      return;
    }

    const message = JSON.stringify({
      type: 'activity',
      data: activity,
      timestamp: new Date().toISOString()
    });

    let successCount = 0;
    let failCount = 0;

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error(`❌ Error sending to client:`, error);
          failCount++;
        }
      } else {
        failCount++;
      }
    });

    console.log(`📤 Broadcast activity to ${userType} ${userId}: ${successCount} sent, ${failCount} failed`);
  }

  /**
   * Get number of active connections for a user
   */
  getConnectionCount(userId: string, userType: 'landlord' | 'tenant' = 'landlord'): number {
    const clients = userType === 'landlord' 
      ? this.landlordClients.get(userId)
      : this.tenantClients.get(userId);
    return clients?.size || 0;
  }

  /**
   * Get total number of active connections
   */
  getTotalConnections(): number {
    let total = 0;
    this.landlordClients.forEach((clientSet) => {
      total += clientSet.size;
    });
    this.tenantClients.forEach((clientSet) => {
      total += clientSet.size;
    });
    return total;
  }

  /**
   * Cleanup on server shutdown
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.landlordClients.forEach((clientSet) => {
      clientSet.forEach((client) => {
        client.close(1001, 'Server shutting down');
      });
    });

    this.tenantClients.forEach((clientSet) => {
      clientSet.forEach((client) => {
        client.close(1001, 'Server shutting down');
      });
    });

    this.landlordClients.clear();
    this.tenantClients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('🛑 WebSocket server cleaned up');
  }
}

// Export singleton instance
export const activityNotificationService = new ActivityNotificationService();

/**
 * Helper function to broadcast a custom message to a specific user
 * Detects userType automatically (landlord or tenant)
 */
export function broadcastToUser(userId: string, message: any) {
  // Try both landlord and tenant
  const isLandlord = activityNotificationService.getConnectionCount(userId, 'landlord') > 0;
  const isTenant = activityNotificationService.getConnectionCount(userId, 'tenant') > 0;
  
  if (isLandlord) {
    activityNotificationService.broadcastActivity(userId, message, 'landlord');
  }
  if (isTenant) {
    activityNotificationService.broadcastActivity(userId, message, 'tenant');
  }
  
  if (!isLandlord && !isTenant) {
    console.log(`📭 No active WebSocket connections for user ${userId}`);
  }
}
