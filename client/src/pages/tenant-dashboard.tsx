import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DollarSign, Calendar, CheckCircle, AlertTriangle, CreditCard, Smartphone, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCard from "@/components/dashboard/stats-card";
import RecordedPaymentsCard from "@/components/dashboard/tenant/RecordedPaymentsCard";
import TenantNotificationBell from "@/components/dashboard/TenantNotificationBell";
import { MpesaPaymentModal } from "@/components/dashboard/tenant/MpesaPaymentModal";
import MonthlyPaymentBreakdown from "@/components/dashboard/shared/MonthlyPaymentBreakdown";
import TenantSettingsTab from "@/components/dashboard/tenant/TenantSettingsTab";
import { formatRentStatusText, getRentStatusColor } from "@/lib/rent-cycle-utils";
import { sumOutstanding, balanceForCurrentMonth } from "@/lib/payment-utils";

// Component to display landlord's M-Pesa payment details
function LandlordPaymentDetails({ landlordId }: { landlordId: string }) {
  const { data: darajaStatus } = useQuery({
    queryKey: [`/api/landlords/${landlordId}/daraja/status`],
    queryFn: async () => {
      if (!landlordId) return null;
      const response = await fetch(`/api/landlords/${landlordId}/daraja/status`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!landlordId,
  });

  if (!darajaStatus || !darajaStatus.isConfigured) {
    return null; // Don't show if landlord hasn't configured M-Pesa
  }

  const { businessShortCode, businessType, businessName, accountNumber } = darajaStatus;

  return (
    <div className="pt-4 border-t">
      <p className="text-sm font-medium mb-3">Or pay manually via M-Pesa:</p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-600">Payment Method:</span>
          <span className="text-sm font-semibold text-blue-900">
            {businessType === 'paybill' ? 'PayBill' : 'Buy Goods (Till)'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            {businessType === 'paybill' ? 'Business Number:' : 'Till Number:'}
          </span>
          <span className="text-lg font-bold text-blue-900">{businessShortCode}</span>
        </div>
        {businessType === 'paybill' && accountNumber && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Account Number:</span>
            <span className="text-sm font-semibold text-blue-900">{accountNumber}</span>
          </div>
        )}
        {businessName && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">Business Name:</span>
            <span className="text-sm font-medium text-blue-900">{businessName}</span>
          </div>
        )}
        <div className="pt-2 mt-2 border-t border-blue-200">
          <p className="text-xs text-neutral-600 text-center">
            Go to M-Pesa → Lipa na M-Pesa → 
            {businessType === 'paybill' ? ' PayBill' : ' Buy Goods'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TenantDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // Manual payment removed - tenants now use STK Push or manual M-Pesa with displayed payment details
  // const [paymentAmount, setPaymentAmount] = useState('');
  // const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
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

  // Manual payment handler - DISABLED (tenants now use STK Push or pay manually via M-Pesa)
  /* const handleMakePayment = async () => {
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

    // Find the pending bill to pay
    if (!paymentHistory || paymentHistory.length === 0) {
      toast({
        title: "Error",
        description: "No bills found. Please contact your landlord.",
        variant: "destructive",
      });
      return;
    }

    // Find the most recent pending or partial bill
    const pendingBill = paymentHistory.find((p: any) => 
      p.status === 'pending' || p.status === 'partial'
    );
    
    if (!pendingBill) {
      toast({
        title: "Error",
        description: "No pending bills found. You may be all paid up!",
        variant: "destructive",
      });
      return;
    }

    console.log(`� Paying bill ${pendingBill._id} for ${pendingBill.forMonth}/${pendingBill.forYear}`);

    setIsPaymentLoading(true);
    try {
      const response = await fetch(`/api/tenants/${currentUser.id}/make-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: pendingBill._id,
          amount: parseFloat(paymentAmount),
          paymentMethod: 'M-Pesa', // Default payment method
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
  }; */

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

  // WebSocket for real-time payment updates
  useEffect(() => {
    if (!currentUser?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/activities?userId=${currentUser.id}`;
    
    console.log('🔌 Connecting tenant to WebSocket for real-time updates:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Tenant WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Tenant received WebSocket message:', message);

        // Handle different message types
        if (message.type === 'payment_confirmed') {
          console.log('💰 Cash payment confirmed, refreshing data...');
          
          // Invalidate all relevant queries for immediate update
          queryClient.invalidateQueries({ queryKey: ['/api/payment-history/tenant', currentUser.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/tenant-properties/tenant', currentUser.id] });
          
          // Show toast notification
          toast({
            title: "Payment Confirmed",
            description: `Your cash payment of KSH ${message.data?.amount?.toLocaleString()} has been recorded.`,
            variant: "default",
          });
        } else if (message.type === 'bill_created') {
          console.log('📋 New bill created, refreshing data...');
          queryClient.invalidateQueries({ queryKey: ['/api/payment-history/tenant', currentUser.id] });
          
          toast({
            title: "New Bill",
            description: message.data?.message || "A new bill has been created for you.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Tenant WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Tenant WebSocket disconnected');
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [currentUser?.id, queryClient, toast]);

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
          <div className="space-y-6">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Outstanding Debt"
                value={(() => {
                  // Calculate consolidated balance for current month (includes historical debts)
                  const now = new Date();
                  const currentMonth = now.getMonth() + 1; // 1-12
                  const currentYear = now.getFullYear();
                  
                  // Use balanceForCurrentMonth to get consolidated balance
                  const balance = balanceForCurrentMonth(
                    paymentHistory as any[], 
                    currentMonth, 
                    currentYear,
                    Number(tenantProperty?.rentAmount || 0)
                  );
                  
                  return balance > 0 ? `KSH ${balance.toLocaleString()}` : 'KSH 0';
                })()}
                icon={<DollarSign className="h-6 w-6" />}
                color="red"
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
                      tenantProperty.rentCycle.advancePaymentDays,
                      tenantProperty.rentCycle.debtAmount,
                      tenantProperty.rentCycle.monthsOwed
                    )
                  : "N/A"}
                icon={<CheckCircle className="h-6 w-6" />}
                color={tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? 'blue' :
                      tenantProperty?.rentCycle?.rentStatus === 'partial' ? 'orange' :
                      tenantProperty?.rentCycle?.rentStatus === 'active' ? 'green' : 
                      tenantProperty?.rentCycle?.rentStatus === 'grace_period' ? 'orange' : 'accent'}
                data-testid="stat-payment-status"
              />
            </div>

            {/* Main Content Grid - Payments First! */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Side - Apartment Info */}
              <div>
                <Card className="h-full">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      My Apartment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
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
                                tenantProperty.rentCycle.advancePaymentDays,
                                tenantProperty.rentCycle.debtAmount,
                                tenantProperty.rentCycle.monthsOwed
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

                          {/* Show partial payment debt details if applicable */}
                          {tenantProperty.rentCycle.rentStatus === 'partial' && (
                            <>
                              <div className="border-t pt-3 mt-4">
                                <h4 className="font-medium text-orange-800 mb-2">⚠️ Partial Payment</h4>
                              </div>
                              {tenantProperty.rentCycle.debtAmount && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Amount Owed:</span>
                                  <span className="font-medium text-orange-600">
                                    KSH {tenantProperty.rentCycle.debtAmount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {tenantProperty.rentCycle.monthsOwed && tenantProperty.rentCycle.monthsOwed > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Months Behind:</span>
                                  <span className="font-medium text-orange-600">
                                    {tenantProperty.rentCycle.monthsOwed} month{tenantProperty.rentCycle.monthsOwed > 1 ? 's' : ''}
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
              </div>

              {/* Right Side - Payment Information (MORE PROMINENT) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recorded Payments - Featured at Top */}
                <RecordedPaymentsCard 
                  payments={paymentHistory} 
                  expectedRent={tenantProperty?.rentAmount ? parseFloat(tenantProperty.rentAmount) : 0}
                />

                {/* Make Payment Card */}
                <Card className="border-2 border-green-200 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="flex items-center text-green-900">
                      <Smartphone className="mr-2 h-5 w-5" />
                      Pay Rent via M-Pesa
                    </CardTitle>
                  </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tenantProperty && (
                      <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md">
                        <p><strong>Expected Rent:</strong> KSH {tenantProperty.rentAmount || '0'}</p>
                        <p><strong>Property:</strong> {tenantProperty.property?.name}</p>
                        <p><strong>Unit:</strong> {tenantProperty.propertyType} - {tenantProperty.unitNumber}</p>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => setShowMpesaModal(true)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      Pay with M-Pesa
                    </Button>
                    
                    <p className="text-xs text-neutral-500 text-center">
                      Secure payment via M-Pesa STK Push
                    </p>

                    {/* Landlord Payment Details */}
                    <LandlordPaymentDetails landlordId={tenantProperty?.property?.landlordId || ''} />
                  </div>
                </CardContent>
              </Card>

              {/* M-Pesa Payment Modal */}
              {tenantProperty && (() => {
                console.log('TenantProperty data:', tenantProperty);
                const landlordId = tenantProperty.property?.landlordId || '';
                console.log('Landlord ID:', landlordId);
                return (
                  <MpesaPaymentModal
                    open={showMpesaModal}
                    onOpenChange={setShowMpesaModal}
                    tenantId={currentUser?.id || ''}
                    landlordId={landlordId}
                    defaultAmount={parseFloat(tenantProperty.rentAmount || '0')}
                    phoneNumber={currentUser?.phone || ''}
                    onSuccess={async () => {
                      // Refresh all tenant data after successful payment
                      console.log('Payment successful - refreshing dashboard data...');
                      await queryClient.invalidateQueries({ 
                        queryKey: ['tenant-property', currentUser?.id] 
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['payment-history', currentUser?.id]
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['tenant-activities', currentUser?.id]
                      });
                      await queryClient.invalidateQueries({ 
                        queryKey: ['/api/tenant-properties/tenant', currentUser?.id] 
                      });
                      await queryClient.invalidateQueries({
                        queryKey: ['/api/payment-history/tenant', currentUser?.id]
                      });
                    }}
                  />
                );
              })()}
            </div>
          </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
            </div>
            
            {/* Monthly Payment Breakdown */}
            <MonthlyPaymentBreakdown 
              tenantId={currentUser?.id}
              title="My Payment History"
            />
          </div>
        );

      case 'apartment':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-neutral-900">My Apartment</h2>
            </div>

            {!tenantProperty ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <svg className="h-16 w-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Apartment Assigned</h3>
                      <p className="text-neutral-600 mb-4">
                        You haven't been assigned to an apartment yet.
                      </p>
                      <p className="text-sm text-neutral-500">
                        Contact your landlord to get registered for an apartment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Property Information Card */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600 font-medium">Property Name</span>
                          <span className="text-neutral-900 font-semibold">{tenantProperty.property?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600 font-medium">Unit Number</span>
                          <span className="text-neutral-900 font-semibold">{tenantProperty.unitNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600 font-medium">Property Type</span>
                          <span className="text-neutral-900 font-semibold">{tenantProperty.propertyType || 'N/A'}</span>
                        </div>
                        {tenantProperty.property?.address && (
                          <div className="flex justify-between items-start">
                            <span className="text-neutral-600 font-medium">Address</span>
                            <span className="text-neutral-900 text-right">{tenantProperty.property.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700 font-semibold text-base">Monthly Rent</span>
                          <span className="text-green-700 font-bold text-2xl">KSH {Number(tenantProperty.rentAmount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Utilities & Charges Card */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
                    <CardTitle className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Utilities & Charges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {tenantProperty.property?.utilities && tenantProperty.property.utilities.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-neutral-600 mb-4">
                          The following utility rates are set by your landlord. Actual charges will be calculated based on your usage.
                        </p>
                        {tenantProperty.property.utilities.map((utility: any, index: number) => (
                          <div key={index} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                <span className="font-semibold text-neutral-900">{utility.type}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-amber-700 font-bold text-lg">KSH {Number(utility.price || 0).toLocaleString()}</span>
                                <span className="text-neutral-600 text-sm ml-1">per unit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700">
                              <strong>Note:</strong> Your landlord may update utility rates from time to time. You will be notified of any changes.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="h-12 w-12 text-neutral-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-neutral-500">No utilities configured</p>
                        <p className="text-sm text-neutral-400 mt-1">Your landlord hasn't set up utility charges yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rent Status Card */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Rent Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {tenantProperty.rentCycle ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-neutral-600 font-medium">Status</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRentStatusColor(tenantProperty.rentCycle.rentStatus)}`}>
                            {formatRentStatusText(
                              tenantProperty.rentCycle.daysRemaining,
                              tenantProperty.rentCycle.rentStatus,
                              tenantProperty.rentCycle.advancePaymentDays,
                              tenantProperty.rentCycle.debtAmount,
                              tenantProperty.rentCycle.monthsOwed
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-neutral-600 font-medium">Next Due Date</span>
                          <span className="text-neutral-900 font-semibold">
                            {tenantProperty.rentCycle.nextDueDate 
                              ? new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-neutral-600 font-medium">Days Remaining</span>
                          <span className={`font-bold ${
                            tenantProperty.rentCycle.daysRemaining < 0 ? 'text-red-600' :
                            tenantProperty.rentCycle.daysRemaining <= 7 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {tenantProperty.rentCycle.daysRemaining < 0 
                              ? `${Math.abs(tenantProperty.rentCycle.daysRemaining)} days overdue`
                              : `${tenantProperty.rentCycle.daysRemaining} days`}
                          </span>
                        </div>
                        {tenantProperty.rentCycle.lastPaymentDate && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-neutral-600 font-medium">Last Payment</span>
                            <span className="text-neutral-900 font-semibold">
                              {new Date(tenantProperty.rentCycle.lastPaymentDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-neutral-500 text-center py-8">No rent cycle information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Landlord Information Card */}
                {tenantProperty.landlord && (
                  <Card className="md:col-span-2">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-purple-600" />
                        Landlord Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-neutral-600 font-medium">Name</span>
                          <span className="text-neutral-900 font-semibold">{tenantProperty.landlord.fullName || 'N/A'}</span>
                        </div>
                        {tenantProperty.landlord.email && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-neutral-600 font-medium">Email</span>
                            <a href={`mailto:${tenantProperty.landlord.email}`} className="text-blue-600 hover:underline">
                              {tenantProperty.landlord.email}
                            </a>
                          </div>
                        )}
                        {tenantProperty.landlord.phone && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-neutral-600 font-medium">Phone</span>
                            <a href={`tel:${tenantProperty.landlord.phone}`} className="text-blue-600 hover:underline">
                              {tenantProperty.landlord.phone}
                            </a>
                          </div>
                        )}
                        {tenantProperty.landlord.company && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-neutral-600 font-medium">Company</span>
                            <span className="text-neutral-900 font-semibold">{tenantProperty.landlord.company}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      case 'settings':
        return <TenantSettingsTab tenantId={currentUser?.id} />;

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
        <Sidebar 
          role="tenant" 
          userName={currentUser.name || currentUser.fullName || 'User'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

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
                  <TenantNotificationBell tenantId={currentUser?.id} />
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
