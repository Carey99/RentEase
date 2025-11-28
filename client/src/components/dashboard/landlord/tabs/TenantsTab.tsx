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
import BulkReminderButton from "@/components/dashboard/landlord/tenants/BulkReminderButton";
import type { Tenant } from "@/types/dashboard";

export default function TenantsTab() {
  const [activeTab, setActiveTab] = useState<"all" | "overdue">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  
  const { tenants, tenantsQuery, properties } = useDashboard();

  // Refresh tenant data when details are updated in the dialog
  const handleTenantUpdate = (updatedTenant: Tenant) => {
    // Fetch latest data from API
    tenantsQuery.refetch();
    
    // Keep dialog in sync if the same tenant is selected
    if (selectedTenant?.id === updatedTenant.id) {
      setSelectedTenant(updatedTenant);
    }
  };

  // Calculate overdue count for badge
  const overdueCount = tenants.filter((tenant: Tenant) => 
    tenant.status === "overdue" || tenant.rentCycle?.rentStatus === "overdue"
  ).length;

  // Filter tenants based on active tab, search, property, and status
  const filteredTenants = tenants.filter((tenant: Tenant) => {
    // Tab filtering (All or Overdue)
    const matchesTab = activeTab === "all" || 
      (activeTab === "overdue" && (tenant.status === "overdue" || tenant.rentCycle?.rentStatus === "overdue"));
    
    // Search filtering
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filtering
    const matchesFilter = filterStatus === "all" || tenant.status === filterStatus;
    
    // Property filtering
    const matchesProperty = filterProperty === "all" || tenant.propertyId === filterProperty;
    
    return matchesTab && matchesSearch && matchesFilter && matchesProperty;
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
    <div className="relative h-full flex flex-col">
      {/* Sticky Tabs and Filters */}
      <div className="sticky top-0 z-20 bg-white">
        <div className="flex justify-between items-center pt-6 px-2">
          <h2 className="text-xl font-semibold text-neutral-900">Tenants</h2>
          <div className="flex gap-2">
            <BulkReminderButton tenants={filteredTenants} />
            <Button 
              className="bg-primary hover:bg-primary/90 h-10"
              onClick={() => setShowAddTenantDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </div>
        </div>
        {/* Chrome-style Tabs */}
        <div className="flex items-center gap-1 mt-4 mb-2 px-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            All Tenants
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`relative px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "overdue"
                ? "text-primary border-b-2 border-primary -mb-px"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Overdue
            {overdueCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                {overdueCount}
              </span>
            )}
          </button>
        </div>
        {/* Filters Bar */}
        <div className="px-2 pb-2">
          <TenantFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            filterProperty={filterProperty}
            onFilterPropertyChange={setFilterProperty}
            properties={properties}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-8">
        <TenantStats tenants={tenants} />
        <TenantsList
          tenants={tenants}
          filteredTenants={filteredTenants}
          onViewDetails={handleViewDetails}
          onAddTenant={() => setShowAddTenantDialog(true)}
          onTenantDeleted={handleTenantDeleted}
          viewMode={viewMode}
        />
        <AddTenantDialog 
          open={showAddTenantDialog}
          onOpenChange={setShowAddTenantDialog}
        />
        <TenantDetailsDialog 
          open={showTenantDetails}
          onOpenChange={setShowTenantDetails}
          tenant={selectedTenant}
          onTenantUpdate={handleTenantUpdate}
        />
      </div>
    </div>
  );
}
