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
import TenantDashboardTab, { LandlordPaymentDetails } from "@/components/dashboard/tenant/TenantDashboardTab";
import TenantPaymentsTab from "@/components/dashboard/tenant/TenantPaymentsTab";
import TenantApartmentTab from "@/components/dashboard/tenant/TenantApartmentTab";
import { formatRentStatusText, getRentStatusColor } from "@/lib/rent-cycle-utils";
import { sumOutstanding, balanceForCurrentMonth } from "@/lib/payment-utils";

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
    const wsUrl = `${protocol}//${window.location.host}/ws/activities?tenantId=${currentUser.id}`;
    
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
          
          // Invalidate all relevant queries for immediate update
          queryClient.invalidateQueries({ queryKey: ['/api/payment-history/tenant', currentUser.id] });
          queryClient.invalidateQueries({ queryKey: ['/api/tenant-properties/tenant', currentUser.id] });
          
          toast({
            title: "New Bill Created",
            description: `Bill for ${message.data?.forMonth}/${message.data?.forYear} - KSH ${message.data?.amount?.toLocaleString()}`,
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
        return <TenantDashboardTab tenantId={currentUser?.id} tenantProperty={tenantProperty} paymentHistory={paymentHistory} currentUser={currentUser} />;

      case 'payments':
        return <TenantPaymentsTab tenantId={currentUser?.id} paymentHistory={paymentHistory} tenantProperty={tenantProperty} />;

      case 'apartment':
        return <TenantApartmentTab tenantId={currentUser?.id} tenantProperty={tenantProperty} />;

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
        <div className="flex-1 flex flex-col bg-neutral-50 dark:bg-slate-900">
          {/* Header - Fixed */}
          <header className="sticky top-0 z-20 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-normal text-gray-900 dark:text-white">Dashboard</h2>
                  <p className="text-xs text-gray-600 dark:text-neutral-400">
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
