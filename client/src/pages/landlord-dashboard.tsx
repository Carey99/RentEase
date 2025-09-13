import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/dashboard/sidebar";
import DashboardTab from "@/components/dashboard/landlord/tabs/DashboardTab";
import PropertiesTab from "@/components/dashboard/landlord/tabs/PropertiesTab";
import TenantsTab from "@/components/dashboard/landlord/tabs/TenantsTab";
import { SettingsTab } from "@/components/dashboard/landlord/settings";
import AddPropertyDialog from "@/components/dashboard/landlord/properties/AddPropertyDialog";
import { useDashboard, useCurrentUser } from "@/hooks/dashboard/useDashboard";
import type { Property } from "@/types/dashboard";

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setLocation] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);

  const currentUser = useCurrentUser();
  const { properties, createPropertyMutation } = useDashboard();

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
