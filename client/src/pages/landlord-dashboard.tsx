import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building, Users, DollarSign, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCard from "@/components/dashboard/stats-card";

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock user data - in a real app this would come from authentication
  const currentUser = {
    id: "1",
    name: "John Doe",
    role: "landlord" as const,
  };

  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties/landlord', currentUser.id],
    enabled: !!currentUser.id,
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
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

      case 'properties':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">Your Properties</h2>
              <Button className="bg-primary hover:bg-secondary" data-testid="button-add-property">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">No properties yet</h3>
                  <p className="text-neutral-600 mb-6">Get started by adding your first rental property.</p>
                  <Button className="bg-primary hover:bg-secondary" data-testid="button-add-first-property">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Property
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property: any) => (
                  <Card key={property.id} className="overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400" 
                      alt={`${property.name} exterior`}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{property.name}</h3>
                      <p className="text-neutral-600 text-sm mb-4">{property.type}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-neutral-600">Active</span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-secondary">
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <p className="text-neutral-600">This section is coming soon!</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex">
        <Sidebar role="landlord" userName={currentUser.name} />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-neutral-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h1>
                  <p className="text-neutral-600 mt-1">
                    Welcome back, {currentUser.name}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      0
                    </span>
                  </Button>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="p-6">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
