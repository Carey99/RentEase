import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TenantCard from "./TenantCard";
import type { Tenant } from "@/types/dashboard";

interface TenantsListProps {
  tenants: Tenant[];
  filteredTenants: Tenant[];
  onViewDetails: (tenant: Tenant) => void;
  onAddTenant: () => void;
  onTenantDeleted?: () => void;
}

export default function TenantsList({
  tenants,
  filteredTenants,
  onViewDetails,
  onAddTenant,
  onTenantDeleted
}: TenantsListProps) {
  if (filteredTenants.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {tenants.length === 0 ? "No tenants yet" : "No tenants found"}
          </h3>
          <p className="text-neutral-600 mb-6">
            {tenants.length === 0 
              ? "Start managing your tenants by adding the first one."
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {tenants.length === 0 && (
            <Button 
              className="bg-primary hover:bg-secondary"
              onClick={onAddTenant}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Tenant
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {filteredTenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          onViewDetails={onViewDetails}
          onTenantDeleted={onTenantDeleted}
        />
      ))}
    </div>
  );
}
