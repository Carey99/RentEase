import { Building, Users, DollarSign, UserPlus, UserMinus, CheckCircle, AlertCircle, Zap, Bell, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/dashboard/stats-card";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { useActivityNotifications } from "@/hooks/use-activity-notifications";
import type { Property } from "@/types/dashboard";
import { formatDistanceToNow } from "date-fns";
import { calculateTotalDebt, calculateMonthlyRevenueFromBills } from "@/lib/payment-calculations";
import { paidForBill, isTransactionRecord } from "@/lib/payment-utils";

interface DashboardTabProps {
  properties: Property[];
}

export default function DashboardTab({ properties }: DashboardTabProps) {
  const currentUser = useCurrentUser();

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
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Properties"
          value={properties.length || 0}
          icon={<Building className="h-6 w-6" />}
          data-testid="stat-properties"
        />
        <StatsCard
          title="Active Tenants"
          value={stats.activeTenants}
          icon={<Users className="h-6 w-6" />}
          color="accent"
          data-testid="stat-tenants"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`KSH ${stats.monthlyRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          data-testid="stat-revenue"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">
                  No recent activity yet. Activity will appear here as you manage your properties and tenants.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity: any) => {
                    // Map icon names to components
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

                    // Priority color mapping
                    const priorityColors: Record<string, string> = {
                      low: 'bg-neutral-100 text-neutral-600',
                      medium: 'bg-blue-100 text-blue-600',
                      high: 'bg-orange-100 text-orange-600',
                      urgent: 'bg-red-100 text-red-600',
                    };

                    const colorClass = priorityColors[activity.priority] || 'bg-neutral-100 text-neutral-600';

                    return (
                      <div key={activity._id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                        <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900">{activity.title}</p>
                          <p className="text-xs text-neutral-600 truncate">{activity.description}</p>
                          {activity.metadata?.amount && (
                            <p className="text-xs font-medium text-green-600 mt-1">
                              KSH {activity.metadata.amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-neutral-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Property Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 mb-2">No properties yet</p>
                  <p className="text-sm text-neutral-400">Add your first property to get started!</p>
                </div>
              ) : (
                properties.map((property: any) => {
                  // Calculate total units from property types
                  const totalUnits = property.propertyTypes?.reduce((sum: number, pt: any) => sum + (pt.units || 0), 0) || 0;
                  
                  // Calculate occupied units from real tenant data
                  // The API returns tenants with propertyId at root level (not nested in apartmentInfo)
                  const occupiedUnits = allTenants.filter((tenant: any) => {
                    return tenant.propertyId === property.id;
                  }).length;
                  
                  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
                  const vacantUnits = totalUnits - occupiedUnits;

                  // Calculate monthly revenue for this property from real payment data
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

                  // Get property types for display
                  const propertyTypesList = property.propertyTypes?.map((pt: any) => pt.type).join(', ') || 'N/A';

                  return (
                    <div 
                      key={property.id} 
                      className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                    >
                      {/* Property Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                            {property.name}
                          </h4>
                          <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                            <Building className="h-3 w-3" />
                            {propertyTypesList}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </div>
                      </div>

                      {/* Property Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-blue-600 mb-1">Total Units</div>
                          <div className="text-lg font-bold text-blue-700">{totalUnits}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-green-600 mb-1">Occupied</div>
                          <div className="text-lg font-bold text-green-700">{occupiedUnits}</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-orange-600 mb-1">Vacant</div>
                          <div className="text-lg font-bold text-orange-700">{vacantUnits}</div>
                        </div>
                      </div>

                      {/* Occupancy Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-600">Occupancy Rate</span>
                          <span className="text-xs font-semibold text-neutral-900">{occupancyRate}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              occupancyRate >= 80 ? 'bg-green-500' :
                              occupancyRate >= 50 ? 'bg-blue-500' :
                              occupancyRate >= 25 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Monthly Revenue */}
                      <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                        <span className="text-xs text-neutral-600">Monthly Revenue</span>
                        <span className="text-sm font-bold text-green-600">
                          KSH {propertyRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
