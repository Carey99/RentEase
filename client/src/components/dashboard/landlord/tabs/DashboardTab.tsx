import { Building, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/dashboard/stats-card";
import type { Property } from "@/types/dashboard";

interface DashboardTabProps {
  properties: Property[];
}

export default function DashboardTab({ properties }: DashboardTabProps) {
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Properties"
          value={properties.length || 0}
          icon={<Building className="h-6 w-6" />}
          data-testid="stat-properties"
        />
        <StatsCard
          title="Active Tenants"
          value="0"
          icon={<Users className="h-6 w-6" />}
          color="accent"
          data-testid="stat-tenants"
        />
        <StatsCard
          title="Monthly Revenue"
          value="$0"
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          data-testid="stat-revenue"
        />
        <StatsCard
          title="Pending Bills"
          value="0"
          icon={<AlertTriangle className="h-6 w-6" />}
          color="orange"
          data-testid="stat-pending-bills"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {properties.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">
                  No recent activity. Start by adding your first property!
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm text-neutral-600">Property added successfully</p>
                    <span className="text-xs text-neutral-400 ml-auto">Just now</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {properties.length === 0 ? (
                <p className="text-neutral-500 text-center py-4">
                  No properties yet. Add your first property to get started!
                </p>
              ) : (
                properties.map((property: any) => (
                  <div key={property.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium text-neutral-900">{property.name}</p>
                      <p className="text-sm text-neutral-600">{property.type}</p>
                    </div>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
