import { useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TenantCard from "./tenants/TenantCard";
import AddTenantDialog from "./tenants/AddTenantDialog";
import TenantDetailsDialog from "./tenants/TenantDetailsDialog";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import type { Tenant } from "@/types/dashboard";

interface TenantsTabByPropertyProps {
  className?: string;
}

export default function TenantsTabByProperty({ className }: TenantsTabByPropertyProps) {
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  
  const currentUser = useCurrentUser();

  // Fetch tenants and group by property on frontend  
  const tenantsQuery = useQuery({
    queryKey: ['tenants', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/tenants/landlord/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Group tenants by property on the frontend
  const tenantsByProperty = React.useMemo(() => {
    if (!tenantsQuery.data || tenantsQuery.data.length === 0) return [];
    
    const grouped = tenantsQuery.data.reduce((acc: any, tenant: any) => {
      const propertyId = tenant.apartmentInfo?.propertyId || 'unassigned';
      const propertyName = tenant.apartmentInfo?.propertyName || 'Unassigned';
      
      if (!acc[propertyId]) {
        acc[propertyId] = {
          propertyId,
          propertyName,
          tenants: []
        };
      }
      
      acc[propertyId].tenants.push(tenant);
      return acc;
    }, {});
    
    return Object.values(grouped);
  }, [tenantsQuery.data]);

  // Handle viewing tenant details
  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantDetails(true);
  };

  // Handle tenant update
  const handleTenantUpdate = () => {
    tenantsQuery.refetch();
  };

  // Handle tenant deletion
  const handleTenantDeleted = () => {
    tenantsQuery.refetch();
    if (selectedTenant) {
      setShowTenantDetails(false);
      setSelectedTenant(null);
    }
  };

  if (tenantsQuery.isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
          <Button 
            className="bg-primary hover:bg-secondary"
            onClick={() => setShowAddTenantDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading tenants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (tenantsQuery.isError) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
          <Button 
            className="bg-primary hover:bg-secondary"
            onClick={() => setShowAddTenantDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </div>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">Error Loading Tenants</h3>
          <p className="text-neutral-600 mb-4">There was an error loading your tenants. Please try again.</p>
          <Button onClick={() => tenantsQuery.refetch()} className="bg-primary hover:bg-secondary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Use the grouped data from useMemo
  if (tenantsByProperty.length === 0) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
          <Button 
            className="bg-primary hover:bg-secondary"
            onClick={() => setShowAddTenantDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No tenants yet</h3>
            <p className="text-neutral-600 mb-6">Start managing your tenants by adding the first one.</p>
            <Button 
              className="bg-primary hover:bg-secondary"
              onClick={() => setShowAddTenantDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Tenant
            </Button>
          </CardContent>
        </Card>

        <AddTenantDialog
          open={showAddTenantDialog}
          onClose={() => setShowAddTenantDialog(false)}
          onTenantAdded={handleTenantUpdate}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
        <Button 
          className="bg-primary hover:bg-secondary"
          onClick={() => setShowAddTenantDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      <Tabs defaultValue={tenantsByProperty[0]?.propertyId} className="w-full">
        <TabsList className="grid w-full grid-cols-auto">
          {tenantsByProperty.map((property: any) => (
            <TabsTrigger key={property.propertyId} value={property.propertyId} className="text-sm">
              {property.propertyName}
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                {property.tenants.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tenantsByProperty.map((property: any) => (
          <TabsContent key={property.propertyId} value={property.propertyId} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{property.propertyName}</CardTitle>
              </CardHeader>
              <CardContent>
                {property.tenants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-600 mb-4">No tenants in this property yet.</p>
                    <Button 
                      className="bg-primary hover:bg-secondary"
                      onClick={() => setShowAddTenantDialog(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tenant to {property.propertyName}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-[calc(6*220px)] overflow-y-auto pr-2">
                    {property.tenants.map((tenant: Tenant) => (
                      <TenantCard
                        key={tenant.id}
                        tenant={tenant}
                        onViewDetails={handleViewDetails}
                        onTenantDeleted={handleTenantDeleted}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <AddTenantDialog
        open={showAddTenantDialog}
        onClose={() => setShowAddTenantDialog(false)}
        onTenantAdded={handleTenantUpdate}
      />

      <TenantDetailsDialog
        open={showTenantDetails}
        onClose={() => setShowTenantDetails(false)}
        tenant={selectedTenant}
        onTenantUpdated={handleTenantUpdate}
        onTenantDeleted={handleTenantDeleted}
      />
    </div>
  );
}
