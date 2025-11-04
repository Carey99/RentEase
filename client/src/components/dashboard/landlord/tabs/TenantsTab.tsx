import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import { 
  TenantsList, 
  TenantStats, 
  TenantFilters,
  AddTenantDialog,
  TenantDetailsDialog
} from "@/components/dashboard/landlord/tenants";
import type { Tenant } from "@/types/dashboard";

export default function TenantsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  
  const { tenants, tenantsQuery } = useDashboard();

  // Refresh tenant data when details are updated in the dialog
  const handleTenantUpdate = (updatedTenant: Tenant) => {
    // Fetch latest data from API
    tenantsQuery.refetch();
    
    // Keep dialog in sync if the same tenant is selected
    if (selectedTenant?.id === updatedTenant.id) {
      setSelectedTenant(updatedTenant);
    }
  };

  // Filter tenants based on search and status
  const filteredTenants = tenants.filter((tenant: Tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || tenant.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Handle viewing tenant details
  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantDetails(true);
  };

  // Handle tenant deletion (refresh data)
  const handleTenantDeleted = () => {
    tenantsQuery.refetch();
    
    // Close tenant details dialog if the deleted tenant was selected
    if (selectedTenant) {
      setShowTenantDetails(false);
      setSelectedTenant(null);
    }
  };

  // Show loading state
  if (tenantsQuery.isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (tenantsQuery.isError) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Error Loading Tenants</h2>
        <p className="text-neutral-600 mb-4">There was an error loading your tenants. Please try again.</p>
        <Button onClick={() => tenantsQuery.refetch()} className="bg-primary hover:bg-secondary">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">Tenants</h2>
        <Button 
          className="bg-primary hover:bg-secondary"
          onClick={() => setShowAddTenantDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <TenantFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Tenants Stats */}
      <TenantStats tenants={tenants} />

      {/* Tenants List */}
      <TenantsList
        tenants={tenants}
        filteredTenants={filteredTenants}
        onViewDetails={handleViewDetails}
        onAddTenant={() => setShowAddTenantDialog(true)}
        onTenantDeleted={handleTenantDeleted}
        viewMode={viewMode}
      />

      {/* Add Tenant Dialog */}
      <AddTenantDialog 
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
      />

      {/* Tenant Details Dialog */}
      <TenantDetailsDialog 
        open={showTenantDetails}
        onOpenChange={setShowTenantDetails}
        tenant={selectedTenant}
        onTenantUpdate={handleTenantUpdate}
      />
    </div>
  );
}
