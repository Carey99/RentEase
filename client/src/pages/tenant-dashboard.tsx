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

// Component to display landlord's M-Pesa payment details - Ultra minimal design
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

  const { businessShortCode, businessType, accountNumber } = darajaStatus;

  // Display number in spaced circles
  const NumberDisplay = ({ code }: { code: string }) => (
    <div className="flex justify-center items-center gap-2 py-6">
      {code.split('').map((digit, idx) => (
        <div
          key={idx}
          className="h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-mono text-lg font-semibold text-gray-900 dark:text-white"
        >
          {digit}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-2 bg-white dark:bg-slate-950 text-xs text-gray-500 dark:text-gray-400">Or pay manually</span>
        </div>
      </div>

      {/* Simple centered payment details */}
      <div className="text-center space-y-4">
        {/* Label */}
        <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {businessType === 'till' ? 'Till Number' : 'Paybill Number'}
        </p>
        
        {/* Number in circles */}
        <NumberDisplay code={businessShortCode} />
        
        {/* Account number if paybill */}
        {businessType === 'paybill' && accountNumber && (
          <>
            <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Account Number</p>
            <NumberDisplay code={accountNumber} />
          </>
        )}
      </div>
    </>
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
          <div className="space-y-8">
            {/* Key Stats - Redesigned with better emphasis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment Status Card - Most Important */}
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider letter-spacing">Status</p>
                      <div className="mt-3">
                        {tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? (
                          <div>
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">Paid Ahead</p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">You're all caught up</p>
                          </div>
                        ) : tenantProperty?.rentCycle?.rentStatus === 'paid' ? (
                          <div>
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">Current</p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">Payment is up to date</p>
                          </div>
                        ) : tenantProperty?.rentCycle?.rentStatus === 'partial' ? (
                          <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Partial</p>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Payment needed</p>
                          </div>
                        ) : tenantProperty?.rentCycle?.rentStatus === 'active' ? (
                          <div>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Due Soon</p>
                            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">{tenantProperty?.rentCycle?.daysRemaining} days remaining</p>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">N/A</p>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg flex-shrink-0 ${
                      tenantProperty?.rentCycle?.rentStatus === 'paid' || tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance'
                        ? 'bg-green-100 dark:bg-green-950/30'
                        : tenantProperty?.rentCycle?.rentStatus === 'partial'
                        ? 'bg-amber-100 dark:bg-amber-950/30'
                        : 'bg-blue-100 dark:bg-blue-950/30'
                    }`}>
                      {tenantProperty?.rentCycle?.rentStatus === 'paid' || tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Next Due Date Card */}
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Due Date</p>
                      <div className="mt-3">
                        {tenantProperty?.rentCycle?.nextDueDate ? (
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short' })}
                            </p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { day: 'numeric' })}
                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-semibold text-gray-600">N/A</p>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex-shrink-0">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Outstanding Balance Card */}
              <Card className={`border shadow-sm hover:shadow-md transition-shadow ${
                (() => {
                  const now = new Date();
                  const currentMonth = now.getMonth() + 1;
                  const currentYear = now.getFullYear();
                  const balance = balanceForCurrentMonth(
                    paymentHistory as any[], 
                    currentMonth, 
                    currentYear,
                    Number(tenantProperty?.rentAmount || 0)
                  );
                  return balance > 0 
                    ? 'border-red-200 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700';
                })()
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
                      <p className={`text-2xl font-bold mt-3 ${
                        (() => {
                          const now = new Date();
                          const currentMonth = now.getMonth() + 1;
                          const currentYear = now.getFullYear();
                          const balance = balanceForCurrentMonth(
                            paymentHistory as any[], 
                            currentMonth, 
                            currentYear,
                            Number(tenantProperty?.rentAmount || 0)
                          );
                          return balance > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400';
                        })()
                      }`}>
                        {(() => {
                          const now = new Date();
                          const currentMonth = now.getMonth() + 1;
                          const currentYear = now.getFullYear();
                          const balance = balanceForCurrentMonth(
                            paymentHistory as any[], 
                            currentMonth, 
                            currentYear,
                            Number(tenantProperty?.rentAmount || 0)
                          );
                          return balance > 0 ? `KSH ${balance.toLocaleString()}` : 'KSH 0';
                        })()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg flex-shrink-0 ${
                      (() => {
                        const now = new Date();
                        const currentMonth = now.getMonth() + 1;
                        const currentYear = now.getFullYear();
                        const balance = balanceForCurrentMonth(
                          paymentHistory as any[], 
                          currentMonth, 
                          currentYear,
                          Number(tenantProperty?.rentAmount || 0)
                        );
                        return balance > 0 
                          ? 'bg-red-100 dark:bg-red-950/30'
                          : 'bg-green-100 dark:bg-green-950/30';
                      })()
                    }`}>
                      <DollarSign className={`h-5 w-5 ${
                        (() => {
                          const now = new Date();
                          const currentMonth = now.getMonth() + 1;
                          const currentYear = now.getFullYear();
                          const balance = balanceForCurrentMonth(
                            paymentHistory as any[], 
                            currentMonth, 
                            currentYear,
                            Number(tenantProperty?.rentAmount || 0)
                          );
                          return balance > 0 
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400';
                        })()
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid - Payment Section Takes Priority */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Right Side - Payment Information (NOW WIDER & PRIMARY FOCUS) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pay Your Rent Card - Clean and Prominent */}
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <span>Pay Your Rent</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Payment Button - Primary CTA with Safaricom Logo */}
                    <Button 
                      onClick={() => setShowMpesaModal(true)}
                      className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white font-semibold py-6 text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3"
                    >
                      {/* Safaricom Logo */}
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Red arc/swoosh */}
                        <path
                          d="M 20 50 Q 40 20, 60 20 Q 75 20, 85 35"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                        />
                        {/* Green dot */}
                        <circle cx="25" cy="70" r="6" fill="currentColor" />
                      </svg>
                      Send Payment
                    </Button>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                      Secure payment via M-Pesa STK Push
                    </p>

                    {/* Manual Payment Details - Display Landlord's M-Pesa Config */}
                    {tenantProperty?.property?.landlordId && (
                      <LandlordPaymentDetails landlordId={tenantProperty.property.landlordId} />
                    )}
                  </CardContent>
                </Card>

                {/* Recorded Payments */}
                <RecordedPaymentsCard 
                  payments={paymentHistory} 
                  expectedRent={tenantProperty?.rentAmount ? parseFloat(tenantProperty.rentAmount) : 0}
                />
              </div>

              {/* Right Side - Compact Apartment Summary */}
              <div>
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                  <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      My Apartment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                  {!tenantProperty ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">No apartment assigned yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Property Details */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Property</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{tenantProperty.property?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Unit</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.unitNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Type</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.propertyType || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                        {/* Monthly Rent */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Monthly Rent</span>
                          <span className="text-base font-semibold text-gray-900 dark:text-white">KSH {tenantProperty.rentAmount || '0'}</span>
                        </div>
                        
                        {/* Rent Cycle Information */}
                        {tenantProperty.rentCycle && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                tenantProperty.rentCycle.rentStatus === 'paid_in_advance' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                                tenantProperty.rentCycle.rentStatus === 'paid' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                                tenantProperty.rentCycle.rentStatus === 'partial' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                              }`}>
                                {formatRentStatusText(
                                  tenantProperty.rentCycle.daysRemaining, 
                                  tenantProperty.rentCycle.rentStatus,
                                  tenantProperty.rentCycle.advancePaymentDays,
                                  tenantProperty.rentCycle.debtAmount,
                                  tenantProperty.rentCycle.monthsOwed
                                )}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Next Due</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            {tenantProperty.rentCycle.lastPaymentDate && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Last Payment</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {new Date(tenantProperty.rentCycle.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Show advance payment details if applicable */}
                      {tenantProperty.rentCycle?.rentStatus === 'paid_in_advance' && (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
                          <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">Paid Ahead</p>
                          <div className="space-y-1 text-sm">
                            {tenantProperty.rentCycle.advancePaymentMonths && tenantProperty.rentCycle.advancePaymentMonths > 0 && (
                              <div className="flex justify-between">
                                <span className="text-green-600 dark:text-green-400">Months Ahead:</span>
                                <span className="font-semibold text-green-700 dark:text-green-300">
                                  {tenantProperty.rentCycle.advancePaymentMonths} month{tenantProperty.rentCycle.advancePaymentMonths > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            {tenantProperty.rentCycle.advancePaymentDays && (
                              <div className="flex justify-between">
                                <span className="text-green-600 dark:text-green-400">Days Ahead:</span>
                                <span className="font-semibold text-green-700 dark:text-green-300">{tenantProperty.rentCycle.advancePaymentDays} days</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show partial payment debt details if applicable */}
                      {tenantProperty.rentCycle?.rentStatus === 'partial' && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Amount Due</p>
                          <div className="space-y-1 text-sm">
                            {tenantProperty.rentCycle.debtAmount && (
                              <div className="flex justify-between">
                                <span className="text-amber-600 dark:text-amber-400">Outstanding:</span>
                                <span className="font-semibold text-amber-700 dark:text-amber-300">
                                  KSH {tenantProperty.rentCycle.debtAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {tenantProperty.rentCycle.monthsOwed && tenantProperty.rentCycle.monthsOwed > 0 && (
                              <div className="flex justify-between">
                                <span className="text-amber-600 dark:text-amber-400">Months Behind:</span>
                                <span className="font-semibold text-amber-700 dark:text-amber-300">
                                  {tenantProperty.rentCycle.monthsOwed} month{tenantProperty.rentCycle.monthsOwed > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            </div>

            {/* M-Pesa Payment Modal */}
            {tenantProperty && (() => {
              const landlordId = tenantProperty.property?.landlordId || '';
              return (
                <MpesaPaymentModal
                  open={showMpesaModal}
                  onOpenChange={setShowMpesaModal}
                  tenantId={currentUser?.id || ''}
                  landlordId={landlordId}
                  defaultAmount={parseFloat(tenantProperty.rentAmount || '0')}
                  phoneNumber={currentUser?.phone || ''}
                  onSuccess={async () => {
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Apartment</h2>
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
                {/* Property Details Column */}
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Simple key-value rows */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Property Name</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.property?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Unit Number</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.unitNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Property Type</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.propertyType || 'N/A'}</span>
                      </div>
                      {tenantProperty.property?.address && (
                        <div className="flex justify-between items-start py-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-xs">{tenantProperty.property.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Monthly Rent - Highlighted */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Rent</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">KSH {Number(tenantProperty.rentAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Utilities & Charges Column */}
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Utilities & Charges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {tenantProperty.property?.utilities && tenantProperty.property.utilities.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                          The following utility rates are set by your landlord. Actual charges will be calculated based on your usage.
                        </p>
                        <div className="space-y-3">
                          {tenantProperty.property.utilities.map((utility: any, index: number) => (
                            <div key={index} className="flex justify-between items-center py-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{utility.type}</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">KSH {utility.price}/unit</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No utility rates set yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rent Status Section */}
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm md:col-span-2">
                  <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      Rent Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tenantProperty.rentCycle
                            ? formatRentStatusText(
                                tenantProperty.rentCycle.daysRemaining,
                                tenantProperty.rentCycle.rentStatus,
                                tenantProperty.rentCycle.advancePaymentDays,
                                tenantProperty.rentCycle.debtAmount,
                                tenantProperty.rentCycle.monthsOwed
                              )
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Next Due Date</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tenantProperty.rentCycle?.nextDueDate
                            ? new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Days Remaining</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tenantProperty.rentCycle && tenantProperty.rentCycle.nextDueDate
                            ? Math.ceil((new Date(tenantProperty.rentCycle.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            : 'N/A'} days
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Payment</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {tenantProperty.lastPaymentDate
                            ? new Date(tenantProperty.lastPaymentDate).toLocaleDateString()
                            : 'No payments yet'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <TenantSettingsTab tenantId={currentUser?.id} />
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
        <Sidebar 
          role="tenant" 
          userName={currentUser.name || currentUser.fullName || 'User'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header - Fixed */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-normal text-gray-900">Dashboard</h2>
                  <p className="text-xs text-gray-600">
                    Welcome back, {currentUser.name || currentUser.fullName || 'User'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <TenantNotificationBell tenantId={currentUser?.id} />
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {(currentUser.name || currentUser.fullName || 'U').split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
