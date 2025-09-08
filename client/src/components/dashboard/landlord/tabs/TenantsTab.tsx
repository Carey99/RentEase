import { useState } from "react";
import { Plus, Users, Search, Filter, MoreHorizontal, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import AddTenantDialog from "@/components/dashboard/landlord/AddTenantDialog";
import type { Tenant } from "@/types/dashboard";

export default function TenantsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [showAddTenantDialog, setShowAddTenantDialog] = useState(false);
  
  const { tenants, tenantsQuery } = useDashboard();

  const filteredTenants = tenants.filter((tenant: Tenant) => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.propertyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || tenant.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
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
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            placeholder="Search tenants by name, email, or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Status: {filterStatus === "all" ? "All" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                All Tenants
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("inactive")}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tenants Stats */}
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
                <p className="text-2xl font-bold text-green-600">
                  {tenants.filter((t: Tenant) => t.status === "active").length}
                </p>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {tenants.filter((t: Tenant) => t.status === "pending").length}
                </p>
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
                  KSH {tenants.filter((t: Tenant) => t.status === "active").reduce((sum: number, t: Tenant) => sum + t.rentAmount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
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
                onClick={() => setShowAddTenantDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Tenant
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTenants.map((tenant: Tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={tenant.avatar} alt={tenant.name} />
                      <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{tenant.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600 mt-1">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {tenant.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {tenant.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center text-sm text-neutral-600 mb-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {tenant.propertyName}
                      </div>
                      <p className="text-sm font-medium">{tenant.unitType}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-green-600">KSH {tenant.rentAmount.toLocaleString()}/month</p>
                      <Badge className={`${getStatusColor(tenant.status)} mt-1`}>
                        {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Send Message</DropdownMenuItem>
                        <DropdownMenuItem>Edit Lease</DropdownMenuItem>
                        <DropdownMenuItem>View Payments</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Remove Tenant</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-sm text-neutral-600">
                    <span>Lease: {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}</span>
                    <span>
                      {tenant.status === "active" && "Current tenant"}
                      {tenant.status === "pending" && "Pending move-in"}
                      {tenant.status === "inactive" && "Lease expired"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Tenant Dialog */}
      <AddTenantDialog 
        open={showAddTenantDialog}
        onOpenChange={setShowAddTenantDialog}
      />
    </div>
  );
}
