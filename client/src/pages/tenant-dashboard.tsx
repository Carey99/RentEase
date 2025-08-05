import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, DollarSign, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCard from "@/components/dashboard/stats-card";

export default function TenantDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setLocation] = useLocation();

  // Get user data from localStorage (set during registration/signin)
  const getCurrentUser = () => {
    try {
      // Try both keys for compatibility
      let userData = localStorage.getItem('rentease_user');
      if (!userData) {
        userData = localStorage.getItem('currentUser');
      }
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const currentUser = getCurrentUser();

  const { data: tenantProperty, isLoading, error } = useQuery({
    queryKey: ['/api/tenant-properties/tenant', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenant-properties/tenant/${currentUser?.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No apartment assigned
        }
        throw new Error('Failed to fetch tenant property');
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Only redirect if we're sure there's an issue
  useEffect(() => {
    if (!currentUser) {
      console.log('No user data found, redirecting to landing...');
      setLocation('/');
      return;
    }
  }, [currentUser, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if apartment assignment failed
  if (!tenantProperty && !isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              No Apartment Assigned
            </h2>
            <p className="text-neutral-600 mb-6">
              You need to be assigned to an apartment to access your dashboard. 
              Please complete the registration process.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatsCard
                title="Current Rent"
                value="$0"
                icon={<DollarSign className="h-6 w-6" />}
                data-testid="stat-rent"
              />
              <StatsCard
                title="Next Due Date"
                value="N/A"
                icon={<Calendar className="h-6 w-6" />}
                color="orange"
                data-testid="stat-due-date"
              />
              <StatsCard
                title="Payment Status"
                value="N/A"
                icon={<CheckCircle className="h-6 w-6" />}
                color="green"
                data-testid="stat-payment-status"
              />
            </div>

            {/* Apartment Info and Recent Bills */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Apartment</CardTitle>
                </CardHeader>
                <CardContent>
                  {!tenantProperty ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-500 mb-4">No apartment assigned yet</p>
                      <p className="text-sm text-neutral-400">
                        Contact your landlord to get registered for an apartment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Property:</span>
                        <span className="font-medium">{tenantProperty.property?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Unit:</span>
                        <span className="font-medium">{tenantProperty.unitNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Type:</span>
                        <span className="font-medium">{tenantProperty.property?.type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Rent:</span>
                        <span className="font-medium">${tenantProperty.rentAmount || '0'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center py-8">
                      <p className="text-neutral-500">No bills yet</p>
                      <p className="text-sm text-neutral-400 mt-2">
                        Your billing history will appear here once available.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
        <Sidebar role="tenant" userName={currentUser.name || currentUser.fullName || 'User'} />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-neutral-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
                  <p className="text-neutral-600 mt-1">
                    Welcome back, {currentUser.name || currentUser.fullName || 'User'}
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
                        {(currentUser.name || currentUser.fullName || 'U').split(' ').map(n => n[0]).join('')}
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
