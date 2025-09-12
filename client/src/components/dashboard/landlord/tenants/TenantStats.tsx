import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Tenant } from "@/types/dashboard";

interface TenantStatsProps {
  tenants: Tenant[];
}

export default function TenantStats({ tenants }: TenantStatsProps) {
  const activeTenants = tenants.filter(t => t.status === "active");
  const pendingTenants = tenants.filter(t => t.status === "pending");
  const monthlyRevenue = activeTenants.reduce((sum, t) => sum + t.rentAmount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Total Tenants</p>
              <p className="text-2xl font-bold text-neutral-900">{tenants.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-green-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{activeTenants.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingTenants.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-neutral-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">
                KSH {monthlyRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
