import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/dashboard/sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import MobileHeader from "@/components/dashboard/MobileHeader";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import DashboardTab from "@/components/dashboard/landlord/tabs/DashboardTab";
import PropertiesTab from "@/components/dashboard/landlord/tabs/PropertiesTab";
import TenantsTab from "@/components/dashboard/landlord/tabs/TenantsTab";
import { SettingsTab } from "@/components/dashboard/landlord/settings";
import AddPropertyDialog from "@/components/dashboard/landlord/properties/AddPropertyDialog";
import RecordCashPayment from "@/components/dashboard/landlord/RecordCashPayment";
import DebtTrackingTab from "@/components/dashboard/landlord/DebtTrackingTab";
import { PaymentsTab } from "@/components/dashboard/landlord/tabs/PaymentsTab";
import { useDashboard, useCurrentUser, useLandlordDetailsQuery } from "@/hooks/dashboard/useDashboard";
import type { Property } from "@/types/dashboard";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setLocation] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);

  const currentUser = useCurrentUser();
  const { properties, createPropertyMutation } = useDashboard();
  const { data: landlordDetails } = useLandlordDetailsQuery(currentUser);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  console.log('👤 Current User:', currentUser);
  console.log('🏠 Landlord Details:', landlordDetails);
  console.log('📋 Properties:', properties);

  // WebSocket for real-time payment notifications
  useEffect(() => {
    if (!currentUser?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/activities?landlordId=${currentUser.id}`;
    
    console.log('🔌 Connecting landlord to WebSocket for real-time updates:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ Landlord WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Landlord received WebSocket message:', message);

        // Handle different message types
        if (message.type === 'payment_received') {
          console.log('💰 Payment received, refreshing data...');
          
          // Invalidate all relevant queries for immediate update
          queryClient.invalidateQueries({ queryKey: [`/api/tenants/landlord/${currentUser.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/payment-history/landlord/${currentUser.id}`] });
          queryClient.invalidateQueries({ queryKey: ['payment-history'] });
          queryClient.invalidateQueries({ queryKey: ['tenants'] });
          
          // Show toast notification
          toast({
            title: "Payment Received",
            description: `${message.data?.tenantName} paid KSH ${message.data?.amount?.toLocaleString()} via ${message.data?.paymentMethod}`,
            variant: "default",
          });
        } else if (message.type === 'bill_created') {
          console.log('📄 Bill created, refreshing data...');
          
          // Invalidate all relevant queries for immediate update
          queryClient.invalidateQueries({ queryKey: [`/api/tenants/landlord/${currentUser.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/payment-history/landlord/${currentUser.id}`] });
          queryClient.invalidateQueries({ queryKey: ['payment-history'] });
          queryClient.invalidateQueries({ queryKey: ['tenants'] });
          
          // Show toast notification
          toast({
            title: "Bill Created",
            description: `Bill for ${message.data?.tenantName} - KSH ${message.data?.amount?.toLocaleString()} (${message.data?.forMonth}/${message.data?.forYear})`,
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Landlord WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Landlord WebSocket disconnected');
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [currentUser?.id, queryClient, toast]);

  // Fetch all tenants and payment history for debt tracking
  const { data: allTenants = [], isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: [`/api/tenants/landlord/${currentUser?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/landlord/${currentUser?.id}`);
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
    enabled: !!currentUser?.id && activeTab === 'debt-tracking',
  });

  const { data: allPaymentHistory = [], isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: [`/api/payment-history/landlord/${currentUser?.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/payment-history/landlord/${currentUser?.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!currentUser?.id && activeTab === 'debt-tracking',
  });

  console.log('🔍 Debt Tracking Data:', {
    currentUserId: currentUser?.id,
    activeTab,
    tenantsLoading,
    paymentsLoading,
    tenantsError,
    paymentsError,
    allTenants,
    allTenantsLength: allTenants.length,
    firstTenant: allTenants[0],
    allPaymentHistory,
    allPaymentHistoryLength: allPaymentHistory.length,
    firstPayment: allPaymentHistory[0]
  });

  // Transform data for DebtTrackingTab
  const debtTrackingData = allTenants.map((tenant: any) => {
    const tenantPayments = allPaymentHistory.filter((p: any) => {
      // Compare both _id and tenantId to handle different data structures
      const paymentTenantId = p.tenantId || p.tenant?._id || p.tenant?.id;
      // API returns tenant.id (not tenant._id)
      const matchesById = paymentTenantId === tenant.id || paymentTenantId === tenant._id;
      const matchesByIdString = paymentTenantId?.toString() === tenant.id?.toString() || paymentTenantId?.toString() === tenant._id?.toString();
      return matchesById || matchesByIdString;
    });

    console.log(`🔎 Tenant ${tenant.name}:`, {
      tenantId: tenant.id,
      paymentsFound: tenantPayments.length,
      payments: tenantPayments
    });

    // CRITICAL: Get BASE RENT from property type, not from apartmentInfo.rentAmount
    // apartmentInfo.rentAmount may have been saved with utilities included (wrong)
    // We need the pure base rent so we can add utilities from bills correctly
    const property = properties.find((p: Property) => p.id === tenant.propertyId);
    const propertyType = property?.propertyTypes?.find((pt: any) => pt.type === tenant.propertyType);
    const baseRent = propertyType ? parseFloat(propertyType.price) : (tenant.rentAmount || tenant.monthlyRent || 0);
    
    console.log(`💰 Tenant ${tenant.name} base rent calculation:`, {
      propertyType: tenant.propertyType,
      foundPropertyType: !!propertyType,
      baseRentFromProperty: propertyType?.price,
      fallbackRent: tenant.rentAmount,
      finalBaseRent: baseRent
    });
    
    return {
      tenantId: tenant.id || tenant._id,
      tenantName: tenant.name || tenant.fullName,
      propertyName: tenant.propertyName || tenant.property?.name || 'N/A',
      unitNumber: tenant.unitNumber || 'N/A',
      monthlyRent: baseRent,
      payments: tenantPayments
    };
  });

  console.log('🎯 Transformed debt tracking data:', debtTrackingData);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab properties={properties} />;
      
      case 'properties':
        return (
          <PropertiesTab 
            properties={properties}
            selectedProperty={selectedProperty}
            setSelectedProperty={setSelectedProperty}
            setShowAddPropertyDialog={setShowAddPropertyDialog}
          />
        );
      
      case 'tenants':
        return <TenantsTab />;
      
      case 'payments':
      case 'mpesa-statements': // Redirect old route to unified payments tab
        return currentUser ? <PaymentsTab landlordId={currentUser.id} /> : null;
      
      case 'debt-tracking':
        return <DebtTrackingTab tenants={debtTrackingData} />;
      
      case 'settings':
        return <SettingsTab />;
      
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
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar 
          role="landlord" 
          userName={currentUser?.name || 'Landlord'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          role="landlord"
          userName={landlordDetails?.fullName || currentUser?.name || 'Landlord'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showNotifications={<NotificationBell />}
        />
      )}

      {/* Main Content */}
      <main className={`min-h-screen ${!isMobile ? 'ml-64' : ''}`}>
        {/* Desktop Top Bar */}
        {!isMobile && (
          <div className="bg-white dark:bg-slate-950 border-b border-neutral-100 dark:border-slate-800 px-6 lg:px-8 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
                  {activeTab === 'dashboard' ? 'Dashboard' :
                   activeTab === 'properties' ? 'Properties' :
                   activeTab === 'tenants' ? 'Tenants' :
                   activeTab === 'payments' ? 'Payments' :
                   activeTab === 'debt-tracking' ? 'Debt Tracking' :
                   activeTab === 'settings' ? 'Settings' :
                   activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Welcome back, {landlordDetails?.fullName || currentUser?.name || 'Landlord'}!
                  {landlordDetails?.email && (
                    <span className="ml-2 text-neutral-400 dark:text-neutral-500">• {landlordDetails.email}</span>
                  )}
                  {landlordDetails?.phone && (
                    <span className="ml-2 text-neutral-400 dark:text-neutral-500">• {landlordDetails.phone}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`${isMobile ? 'pb-20 px-4 pt-4' : 'p-6 lg:p-8'}`}>
          {renderTabContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <BottomNav
          role="landlord"
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Add Property Dialog */}
      <AddPropertyDialog 
        open={showAddPropertyDialog}
        onOpenChange={setShowAddPropertyDialog}
        createPropertyMutation={createPropertyMutation}
        currentUser={currentUser}
      />

      {/* Record Cash Payment Dialog */}
      {currentUser && (
        <RecordCashPayment
          open={showCashPaymentDialog}
          onOpenChange={setShowCashPaymentDialog}
          tenants={allTenants}
          landlordId={currentUser.id}
        />
      )}
    </div>
  );
}
