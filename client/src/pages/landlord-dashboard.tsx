import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/dashboard/sidebar";
import DashboardTab from "@/components/dashboard/landlord/tabs/DashboardTab";
import PropertiesTab from "@/components/dashboard/landlord/tabs/PropertiesTab";
import TenantsWithPropertyFilter from "@/components/dashboard/landlord/TenantsWithPropertyFilter";
import PaymentHistoryWithPropertyFilter from "@/components/dashboard/landlord/PaymentHistoryWithPropertyFilter";
import PaymentOverview from "@/components/dashboard/landlord/payments/PaymentOverview";
import MonthlyPaymentBreakdown from "@/components/dashboard/shared/MonthlyPaymentBreakdown";
import { SettingsTab } from "@/components/dashboard/landlord/settings";
import AddPropertyDialog from "@/components/dashboard/landlord/properties/AddPropertyDialog";
import DebtTrackingTab from "@/components/dashboard/landlord/DebtTrackingTab";
import { useDashboard, useCurrentUser } from "@/hooks/dashboard/useDashboard";
import type { Property } from "@/types/dashboard";

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setLocation] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);

  const currentUser = useCurrentUser();
  const { properties, createPropertyMutation } = useDashboard();

  console.log('👤 Current User:', currentUser);

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

    return {
      tenantId: tenant.id || tenant._id,
      tenantName: tenant.name || tenant.fullName,
      propertyName: tenant.propertyName || tenant.property?.name || 'N/A',
      unitNumber: tenant.unitNumber || 'N/A',
      monthlyRent: tenant.rentAmount || tenant.monthlyRent || 0,
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
        return <TenantsWithPropertyFilter />;
      
      case 'payments':
        return currentUser ? (
          <div className="space-y-6">
            <PaymentOverview landlordId={currentUser.id} />
            <MonthlyPaymentBreakdown 
              landlordId={currentUser.id}
              title="All Payments Collected"
            />
          </div>
        ) : null;
      
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
    <div className="min-h-screen bg-neutral-50">
      <div className="flex">
        <Sidebar 
          role="landlord" 
          userName={currentUser?.name || 'Landlord'}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="flex-1">
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h1>
                  <p className="text-neutral-600 mt-1">
                    Welcome back, {currentUser?.name || 'Landlord'}!
                  </p>
                </div>
              </div>
            </div>

            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Add Property Dialog */}
      <AddPropertyDialog 
        open={showAddPropertyDialog}
        onOpenChange={setShowAddPropertyDialog}
        createPropertyMutation={createPropertyMutation}
        currentUser={currentUser}
      />
    </div>
  );
}
