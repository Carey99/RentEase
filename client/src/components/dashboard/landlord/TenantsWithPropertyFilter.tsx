import { useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TenantCard from "./tenants/TenantCard";
import TenantListItem from "./tenants/TenantListItem";
import AddTenantDialog from "./tenants/AddTenantDialog";
import TenantDetailsDialog from "./tenants/TenantDetailsDialog";
import PropertySelector from "./PropertySelector";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import type { Tenant } from "@/types/dashboard";

interface TenantsWithPropertyFilterProps {
  className?: string;
}

export default function TenantsWithPropertyFilter({ className }: TenantsWithPropertyFilterProps) {
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const currentUser = useCurrentUser();

  // Fetch landlord's properties
  const propertiesQuery = useQuery({
    queryKey: ['properties', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/properties/landlord/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch all tenants for the landlord  
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

  // Filter tenants based on selected property
  const filteredTenants = React.useMemo(() => {
    if (!tenantsQuery.data) return [];
    if (selectedPropertyId === "all") {
      return tenantsQuery.data;
    }
    // Always compare as strings and handle missing propertyId
    return tenantsQuery.data.filter((tenant: any) => {
      const propId = tenant.propertyId;
      return propId && String(propId) === String(selectedPropertyId);
    });
  }, [tenantsQuery.data, selectedPropertyId]);

  // Get stats for current filter
  const stats = React.useMemo(() => {
    const total = filteredTenants.length;
    const active = filteredTenants.filter((t: any) => t.status === 'active').length;
    const overdue = filteredTenants.filter((t: any) => t.rentCycle?.rentStatus === 'overdue').length;
    
    return { total, active, overdue };
  }, [filteredTenants]);

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

  const selectedProperty = propertiesQuery.data?.find((p: any) => p.id === selectedPropertyId);

  if (tenantsQuery.isLoading || propertiesQuery.isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading tenants...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-neutral-900">Tenants</h2>
          <PropertySelector
            properties={propertiesQuery.data || []}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            placeholder="Filter by property"
            isLoading={propertiesQuery.isLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={() => setShowAddTenantDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Tenants</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 text-neutral-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="h-3 w-3 bg-red-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Property</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {selectedPropertyId === "all" 
                    ? "All Properties" 
                    : selectedProperty?.name || "Unknown"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedPropertyId === "all" 
                ? "All Tenants" 
                : `${selectedProperty?.name || "Property"} Tenants`
              }
            </span>
            <span className="text-sm font-normal text-neutral-600">
              {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">
                {selectedPropertyId === "all" 
                  ? "No tenants found" 
                  : `No tenants found for ${selectedProperty?.name || "this property"}`
                }
              </p>
            </div>
          ) : (
            <div className={`${
              viewMode === "grid" 
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[calc(6*220px)]" 
                : "space-y-3 max-h-[calc(10*80px)]"
            } overflow-y-auto pr-2 scroll-smooth`}>
              {filteredTenants.map((tenant: Tenant) => (
                viewMode === "grid" ? (
                  <TenantCard
                    key={tenant.id}
                    tenant={tenant}
                    onViewDetails={handleViewDetails}
                  />
                ) : (
                  <TenantListItem
                    key={tenant.id}
                    tenant={tenant}
                    onViewDetails={handleViewDetails}
                  />
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddTenantDialog
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
      />

      {selectedTenant && (
        <TenantDetailsDialog
          tenant={selectedTenant}
          open={showTenantDetails}
          onOpenChange={setShowTenantDetails}
          onTenantUpdate={handleTenantUpdate}
        />
      )}
    </div>
  );
}