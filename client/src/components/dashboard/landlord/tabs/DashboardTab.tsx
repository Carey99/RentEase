import { Building, Users, DollarSign, UserPlus, UserMinus, CheckCircle, AlertCircle, Zap, Bell, FileText, ChevronDown, ChevronRight, Eye, Home } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import { useIsMobile } from "@/hooks/use-mobile";
import StatsCard from "@/components/dashboard/stats-card";
import type { Property } from "@/types/dashboard";
import { formatDistanceToNow } from "date-fns";
import { paidForBill, isTransactionRecord } from "@/lib/payment-utils";
import { cn } from "@/lib/utils";

interface DashboardTabProps {
  properties: Property[];
}

export default function DashboardTab({ properties }: DashboardTabProps) {
  const currentUser = useCurrentUser();
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Enable real-time activity notifications via WebSocket
  const { isConnected } = useActivityNotifications(
    currentUser?.id,
    'landlord',
    !!currentUser?.id
  );

  // Fetch all tenants for active count
  const { data: allTenants = [] } = useQuery({
    queryKey: [`/api/tenants/landlord/${currentUser?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/landlord/${currentUser?.id}`);
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch payment history for monthly revenue and pending bills
  const { data: paymentHistory = [] } = useQuery({
    queryKey: [`/api/payment-history/landlord/${currentUser?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/payment-history/landlord/${currentUser?.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: [`/api/activities/landlord/${currentUser?.id}`, 5],
    queryFn: async () => {
      const response = await fetch(`/api/activities/landlord/${currentUser?.id}?limit=5`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Calculate stats
  const stats = {
    activeTenants: allTenants.filter((t: any) => t.status === 'active').length,
    
    // Monthly Revenue: Sum of all actual payments for current month (use paidForBill helper)
    monthlyRevenue: paymentHistory
      .filter((p: any) => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        // Filter to current month bills (not transactions) that have payments
        return p.forMonth === currentMonth && 
               p.forYear === currentYear &&
               !isTransactionRecord(p);
      })
      .reduce((sum: number, p: any) => sum + paidForBill(p), 0),
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatsCard
          title="Total Properties"
          value={properties.length || 0}
          icon={<Building className="h-5 w-5" />}
          color="blue"
          compact={isMobile}
        />
        
        <StatsCard
          title="Active Tenants"
          value={stats.activeTenants}
          icon={<Users className="h-5 w-5" />}
          color="green"
          compact={isMobile}
        />
        
        <StatsCard
          title="Monthly Revenue"
          value={`KSH ${stats.monthlyRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="orange"
          compact={isMobile}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Recent Activity (2/3 width on desktop, full width on mobile) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/60 dark:border-slate-700">
            <div className="p-4 md:p-5 flex items-center justify-between border-b border-neutral-100 dark:border-slate-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white text-base md:text-lg">Recent Activity</h2>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="p-3 md:p-4">
              {recentActivities.length === 0 ? (
                <p className="text-neutral-500 text-center py-8 text-sm md:text-base">
                  No recent activity yet. Activity will appear here as you manage your properties and tenants.
                </p>
              ) : (
                <div className="space-y-1">
                  {recentActivities.map((activity: any) => {
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

                    const IconComponent = iconMap[activity.icon] || Bell;

                    const priorityColors: Record<string, string> = {
                      low: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
                      medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                      urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                    };

                    const colorClass = priorityColors[activity.priority] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

                    return (
                      <div key={activity._id} className="flex items-start gap-2 md:gap-3 py-2.5 md:py-3 px-2 md:px-0 hover:bg-neutral-50/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                        <div className={`p-1.5 md:p-2 rounded-full ${colorClass} flex-shrink-0`}>
                          <IconComponent className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">{activity.title}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">{activity.description}</p>
                          {activity.metadata?.amount && (
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-0.5 md:mt-1">
                              KSH {activity.metadata.amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] md:text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap flex-shrink-0">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {recentActivities.length > 0 && (
                <button className="w-full mt-4 text-sm text-primary hover:text-primary/80 font-medium">
                  View All Activity
                </button>
              )}
            </div>
          </div>

          {/* Property Overview Section Below Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/60 dark:border-slate-700">
            <div className="p-4 md:p-5 border-b border-neutral-100 dark:border-slate-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2 text-base md:text-lg">
                <Home className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                Property Overview
              </h2>
            </div>
            
            <div className="p-3 md:p-4">
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-10 w-10 md:h-12 md:w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400 mb-2 text-sm md:text-base">No properties yet</p>
                  <p className="text-xs md:text-sm text-neutral-400 dark:text-neutral-500">Add your first property to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                  {properties.map((property: any) => {
                    const totalUnits = property.propertyTypes?.reduce((sum: number, pt: any) => sum + (pt.units || 0), 0) || 0;
                    const occupiedUnits = allTenants.filter((tenant: any) => tenant.propertyId === property.id).length;
                    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

                    return (
                      <div key={property.id} className="p-3 md:p-4 bg-neutral-50/50 dark:bg-slate-800/50 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-slate-800 transition-colors">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 text-sm md:text-base truncate">{property.name}</h3>
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-neutral-600 dark:text-neutral-400 mb-2 md:mb-3 flex-wrap">
                          <span>{totalUnits} Total</span>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">{occupiedUnits} Occupied</span>
                          <span>•</span>
                          <span className="text-orange-600 dark:text-orange-400">{totalUnits - occupiedUnits} Vacant</span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-1.5 md:h-2">
                          <div 
                            className={cn(
                              "h-1.5 md:h-2 rounded-full transition-all",
                              occupancyRate >= 80 ? "bg-green-500" :
                              occupancyRate >= 50 ? "bg-blue-500" :
                              "bg-orange-500"
                            )}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Tracked Properties (1/3 width on desktop, full width on mobile) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/60 dark:border-slate-700 max-h-[600px] flex flex-col">
            <div className="p-4 md:p-5 flex items-center justify-between flex-shrink-0 border-b border-neutral-100 dark:border-slate-800">
              <h2 className="font-semibold text-neutral-900 dark:text-white text-base md:text-lg">Tracked Properties</h2>
              <Badge variant="secondary" className="text-xs">{properties.length}</Badge>
            </div>
            
            <div className="overflow-y-auto flex-1 max-h-[500px]">
              {properties.length === 0 ? (
                <div className="p-3 md:p-4 text-center">
                  <Building className="h-7 w-7 md:h-8 md:w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400">No properties to track</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-slate-700">
                  {properties.map((property: any) => {
                    const totalUnits = property.propertyTypes?.reduce((sum: number, pt: any) => sum + (pt.units || 0), 0) || 0;
                    const occupiedUnits = allTenants.filter((tenant: any) => tenant.propertyId === property.id).length;
                    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
                    const vacantUnits = totalUnits - occupiedUnits;

                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();
                    
                    const propertyRevenue = paymentHistory
                      .filter((p: any) => 
                        p.propertyId === property.id &&
                        p.forMonth === currentMonth &&
                        p.forYear === currentYear &&
                        !isTransactionRecord(p)
                      )
                      .reduce((sum: number, p: any) => sum + paidForBill(p), 0);

                    const isExpanded = expandedProperty === property.id;

                    return (
                      <div key={property.id}>
                        {/* Collapsed Row */}
                        <button
                          onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                          className="w-full p-3 md:p-4 hover:bg-neutral-50/50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-xs md:text-sm text-neutral-900 dark:text-white truncate">{property.name}</h3>
                              <div className="flex items-center gap-1.5 md:gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 py-0">{totalUnits} units</Badge>
                                <Badge variant="secondary" className="text-[10px] md:text-xs bg-green-50 text-green-700 border-green-200 px-1.5 py-0">
                                  {occupancyRate}%
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0">
                                  KSH {(propertyRevenue / 1000).toFixed(1)}k
                                </Badge>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-3 pb-4 bg-neutral-50/50 dark:bg-slate-800/30">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 text-center">
                                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Total</div>
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalUnits}</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 text-center">
                                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Occupied</div>
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">{occupiedUnits}</div>
                              </div>
                              <div className="bg-white dark:bg-slate-900 rounded-lg p-2 text-center">
                                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Vacant</div>
                                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{vacantUnits}</div>
                              </div>
                            </div>

                            {/* Occupancy Bar */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Occupancy Rate</span>
                                <span className="text-xs font-semibold text-neutral-900 dark:text-white">{occupancyRate}%</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                  className={cn(
                                    "h-2 rounded-full transition-all",
                                    occupancyRate >= 80 ? "bg-green-500" :
                                    occupancyRate >= 50 ? "bg-blue-500" :
                                    "bg-orange-500"
                                  )}
                                  style={{ width: `${occupancyRate}%` }}
                                />
                              </div>
                            </div>

                            {/* Revenue */}
                            <div className="bg-white dark:bg-slate-900 rounded-lg p-2 mb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">Monthly Revenue</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  KSH {propertyRevenue.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
