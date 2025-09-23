import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, DollarSign, Calendar, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCard from "@/components/dashboard/stats-card";
import PaymentHistoryByProperty from "@/components/dashboard/tenant/PaymentHistoryByProperty";
import { formatRentStatusText, getRentStatusColor } from "@/lib/rent-cycle-utils";

export default function TenantDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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
  const { toast } = useToast();

  // Handle rent payment
  const handleMakePayment = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error", 
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    setIsPaymentLoading(true);
    try {
      const response = await fetch(`/api/tenants/${currentUser.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentAmount: parseFloat(paymentAmount),
          paymentDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment recorded successfully!",
        });
        setPaymentAmount('');
        
        // Invalidate tenant property query to refresh the data
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/tenant-properties/tenant', currentUser?.id] 
        });
        
        // Also invalidate payment history
        await queryClient.invalidateQueries({
          queryKey: ['/api/payment-history/tenant', currentUser?.id]
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive",
      });
    } finally {
      setIsPaymentLoading(false);
    }
  };

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

  // Query for payment history
  const { data: paymentHistory = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/payment-history/tenant', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/payment-history/tenant/${currentUser?.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error('Failed to fetch payment history');
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
                value={tenantProperty ? `KSH ${tenantProperty.rentAmount || '0'}` : "N/A"}
                icon={<DollarSign className="h-6 w-6" />}
                data-testid="stat-rent"
              />
              <StatsCard
                title="Next Due Date"
                value={tenantProperty?.rentCycle?.nextDueDate 
                  ? new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString() 
                  : "N/A"}
                icon={<Calendar className="h-6 w-6" />}
                color="orange"
                data-testid="stat-due-date"
              />
              <StatsCard
                title="Payment Status"
                value={tenantProperty?.rentCycle 
                  ? formatRentStatusText(
                      tenantProperty.rentCycle.daysRemaining, 
                      tenantProperty.rentCycle.rentStatus,
                      tenantProperty.rentCycle.advancePaymentDays
                    )
                  : "N/A"}
                icon={<CheckCircle className="h-6 w-6" />}
                color={tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? 'blue' :
                      tenantProperty?.rentCycle?.rentStatus === 'active' ? 'green' : 
                      tenantProperty?.rentCycle?.rentStatus === 'grace_period' ? 'orange' : 'accent'}
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
                        <span className="font-medium">{tenantProperty.propertyType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Monthly Rent:</span>
                        <span className="font-medium">KSH {tenantProperty.rentAmount || '0'}</span>
                      </div>
                      
                      {/* Rent Cycle Information */}
                      {tenantProperty.rentCycle && (
                        <>
                          <div className="border-t pt-3 mt-4">
                            <h4 className="font-medium text-neutral-800 mb-2">Rent Status</h4>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Status:</span>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRentStatusColor(tenantProperty.rentCycle.rentStatus)}`}>
                              {formatRentStatusText(
                                tenantProperty.rentCycle.daysRemaining, 
                                tenantProperty.rentCycle.rentStatus,
                                tenantProperty.rentCycle.advancePaymentDays
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Next Due:</span>
                            <span className="font-medium">
                              {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString()}
                            </span>
                          </div>
                          {tenantProperty.rentCycle.lastPaymentDate && (
                            <div className="flex justify-between">
                              <span className="text-neutral-600">Last Payment:</span>
                              <span className="font-medium">
                                {new Date(tenantProperty.rentCycle.lastPaymentDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          {/* Show advance payment details if applicable */}
                          {tenantProperty.rentCycle.rentStatus === 'paid_in_advance' && (
                            <>
                              <div className="border-t pt-3 mt-4">
                                <h4 className="font-medium text-blue-800 mb-2">🎉 Advance Payment</h4>
                              </div>
                              {tenantProperty.rentCycle.advancePaymentDays && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Days Paid Ahead:</span>
                                  <span className="font-medium text-blue-600">
                                    {tenantProperty.rentCycle.advancePaymentDays} days
                                  </span>
                                </div>
                              )}
                              {tenantProperty.rentCycle.advancePaymentMonths && tenantProperty.rentCycle.advancePaymentMonths > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Months Paid Ahead:</span>
                                  <span className="font-medium text-blue-600">
                                    {tenantProperty.rentCycle.advancePaymentMonths} month{tenantProperty.rentCycle.advancePaymentMonths > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Make Rent Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="paymentAmount">Payment Amount (KSH)</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        disabled={isPaymentLoading}
                      />
                    </div>
                    
                    {tenantProperty && (
                      <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md">
                        <p><strong>Expected Rent:</strong> KSH {tenantProperty.rentAmount || '0'}</p>
                        <p><strong>Property:</strong> {tenantProperty.property?.name}</p>
                        <p><strong>Unit:</strong> {tenantProperty.propertyType} - {tenantProperty.unitNumber}</p>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleMakePayment}
                      disabled={isPaymentLoading || !paymentAmount}
                      className="w-full"
                    >
                      {isPaymentLoading ? "Processing..." : "Make Payment"}
                    </Button>
                    
                    <p className="text-xs text-neutral-500 text-center">
                      Payment will be recorded immediately and your landlord will be notified
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
            </div>
            <PaymentHistoryByProperty paymentHistory={paymentHistory} />
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
                        {(currentUser.name || currentUser.fullName || 'U').split(' ').map((n: string) => n[0]).join('')}
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
