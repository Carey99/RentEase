import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, Building, Users, DollarSign, AlertTriangle, Plus, Edit, Save, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCard from "@/components/dashboard/stats-card";

export default function LandlordDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setLocation] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPropertyTypes, setEditingPropertyTypes] = useState<Array<{type: string, price: string}>>([]);
  const [newPropertyType, setNewPropertyType] = useState({ type: '', price: '' });
  const [editingUtilities, setEditingUtilities] = useState<Array<{type: string, price: string}>>([]);
  const [newUtility, setNewUtility] = useState({ type: '', price: '' });
  const { toast } = useToast();
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

  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties/landlord', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/properties/landlord/${currentUser?.id}`);
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ propertyId, propertyTypes, utilities }: { propertyId: string, propertyTypes: Array<{type: string, price: string}>, utilities: Array<{type: string, price: string}> }) => {
      console.log('Updating property:', propertyId, 'with data:', { propertyTypes, utilities });
      const response = await apiRequest('PUT', `/api/properties/${propertyId}`, { propertyTypes, utilities });
      
      // Check if response is ok
      if (!response.ok) {
        const text = await response.text();
        console.error('Server response:', text);
        throw new Error(`Server error: ${response.status} - ${text}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties/landlord', currentUser?.id] });
      toast({
        title: "Property Updated",
        description: "Property types and prices have been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive",
      });
    },
  });

  // Only redirect if we're sure there's no user data
  useEffect(() => {
    if (!currentUser) {
      console.log('No user data found, redirecting to landing...');
      setLocation('/');
      return;
    }
  }, [currentUser, setLocation]);

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setEditingPropertyTypes(property.propertyTypes || []);
    setEditingUtilities(property.utilities || []);
  };

  const handleBackToList = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setEditingPropertyTypes([]);
    setNewPropertyType({ type: '', price: '' });
    setEditingUtilities([]);
    setNewUtility({ type: '', price: '' });
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditingPropertyTypes(selectedProperty?.propertyTypes || []);
    setNewPropertyType({ type: '', price: '' });
    setEditingUtilities(selectedProperty?.utilities || []);
    setNewUtility({ type: '', price: '' });
  };

  const handleSaveChanges = () => {
    if (selectedProperty) {
      updatePropertyMutation.mutate({
        propertyId: selectedProperty.id,
        propertyTypes: editingPropertyTypes,
        utilities: editingUtilities
      });
    }
  };

  const handleUpdatePropertyType = (index: number, field: 'type' | 'price', value: string) => {
    const updated = [...editingPropertyTypes];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPropertyTypes(updated);
  };

  const handleRemovePropertyType = (index: number) => {
    const updated = editingPropertyTypes.filter((_, i) => i !== index);
    setEditingPropertyTypes(updated);
  };

  const handleAddPropertyType = () => {
    if (newPropertyType.type && newPropertyType.price) {
      setEditingPropertyTypes([...editingPropertyTypes, newPropertyType]);
      setNewPropertyType({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both property type and price",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUtility = (index: number, field: 'type' | 'price', value: string) => {
    const updated = [...editingUtilities];
    updated[index] = { ...updated[index], [field]: value };
    setEditingUtilities(updated);
  };

  const handleRemoveUtility = (index: number) => {
    const updated = editingUtilities.filter((_, i) => i !== index);
    setEditingUtilities(updated);
  };

  const handleAddUtility = () => {
    if (newUtility.type && newUtility.price) {
      setEditingUtilities([...editingUtilities, newUtility]);
      setNewUtility({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both utility type and price",
        variant: "destructive",
      });
    }
  };

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
        // If a property is selected, show property details
        if (selectedProperty) {
          return (
            <div>
              <div className="flex items-center space-x-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={handleBackToList}
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Properties
                </Button>
                <h2 className="text-xl font-semibold text-neutral-900">{selectedProperty.name}</h2>
                {!isEditing && (
                  <Button
                    onClick={handleStartEditing}
                    className="bg-primary hover:bg-secondary"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Property
                  </Button>
                )}
                {isEditing && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSaveChanges}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={updatePropertyMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button
                      onClick={handleCancelEditing}
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Property Image */}
                <Card>
                  <CardContent className="p-0">
                    <img 
                      src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400" 
                      alt={`${selectedProperty.name} exterior`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </CardContent>
                </Card>

                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Property Name</Label>
                      <p className="text-lg font-semibold text-neutral-900">{selectedProperty.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <span className="text-sm text-neutral-600">Active</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Unit Types</Label>
                      <p className="text-lg font-semibold text-neutral-900">{editingPropertyTypes.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Property Types Management */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Unit Types & Pricing</CardTitle>
                  <p className="text-sm text-neutral-600">
                    Manage the different unit types available in this property and their rental prices.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editingPropertyTypes.map((propertyType, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          {isEditing ? (
                            <Input
                              value={propertyType.type}
                              onChange={(e) => handleUpdatePropertyType(index, 'type', e.target.value)}
                              placeholder="Property type (e.g., 1 Bedroom)"
                            />
                          ) : (
                            <p className="font-medium capitalize">
                              {propertyType.type.replace('bedroom', ' Bedroom')}
                            </p>
                          )}
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={propertyType.price}
                                onChange={(e) => handleUpdatePropertyType(index, 'price', e.target.value)}
                                placeholder="Monthly rent"
                              />
                              <span className="text-sm text-neutral-500">KSH</span>
                            </div>
                          ) : (
                            <p className="font-semibold text-green-600">
                              KSH {propertyType.price}/month
                            </p>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePropertyType(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {isEditing && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-3 block">Add New Unit Type</Label>
                        <div className="flex items-center space-x-4">
                          <Input
                            placeholder="Property type (e.g., Studio)"
                            value={newPropertyType.type}
                            onChange={(e) => setNewPropertyType({ ...newPropertyType, type: e.target.value })}
                            className="flex-1"
                          />
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Monthly rent"
                              value={newPropertyType.price}
                              onChange={(e) => setNewPropertyType({ ...newPropertyType, price: e.target.value })}
                            />
                            <span className="text-sm text-neutral-500">KSH</span>
                          </div>
                          <Button
                            onClick={handleAddPropertyType}
                            className="bg-primary hover:bg-secondary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </div>
                    )}

                    {editingPropertyTypes.length === 0 && (
                      <div className="text-center py-8 text-neutral-500">
                        <Building className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                        <p>No unit types configured yet.</p>
                        {isEditing && (
                          <p className="text-sm mt-2">Add your first unit type above.</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Utilities Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Utilities</CardTitle>
                  <p className="text-sm text-neutral-600">
                    Manage the utilities available for this property and their prices per unit.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editingUtilities.map((utility, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          {isEditing ? (
                            <Input
                              value={utility.type}
                              onChange={(e) => handleUpdateUtility(index, 'type', e.target.value)}
                              placeholder="Utility type (e.g., Electricity)"
                            />
                          ) : (
                            <p className="font-medium capitalize">{utility.type}</p>
                          )}
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                value={utility.price}
                                onChange={(e) => handleUpdateUtility(index, 'price', e.target.value)}
                                placeholder="Price per unit"
                              />
                              <span className="text-sm text-neutral-500">KSH/unit</span>
                            </div>
                          ) : (
                            <p className="font-semibold text-green-600">
                              KSH {utility.price}/unit
                            </p>
                          )}
                        </div>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUtility(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {isEditing && (
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium mb-3 block">Add New Utility</Label>
                        <div className="flex items-center space-x-4">
                          <Input
                            placeholder="Utility type (e.g., Water)"
                            value={newUtility.type}
                            onChange={(e) => setNewUtility({ ...newUtility, type: e.target.value })}
                            className="flex-1"
                          />
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Price per unit"
                              value={newUtility.price}
                              onChange={(e) => setNewUtility({ ...newUtility, price: e.target.value })}
                            />
                            <span className="text-sm text-neutral-500">KSH/unit</span>
                          </div>
                          <Button
                            onClick={handleAddUtility}
                            className="bg-primary hover:bg-secondary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </div>
                    )}

                    {editingUtilities.length === 0 && (
                      <div className="text-center py-8 text-neutral-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                        <p>No utilities configured yet.</p>
                        {isEditing && (
                          <p className="text-sm mt-2">Add your first utility above.</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }

        // Default properties list view
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
                      <p className="text-neutral-600 text-sm mb-4">
                        {property.propertyTypes?.length || 0} unit type(s) available
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-neutral-600">Active</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-secondary"
                          onClick={() => handleViewProperty(property)}
                        >
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
        <Sidebar 
          role="landlord" 
          userName={currentUser?.name || currentUser?.fullName || 'User'} 
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
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h1>
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
