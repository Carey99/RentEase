import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Save, X, Plus, Building, AlertTriangle, Home, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePropertyActions } from "@/hooks/dashboard/useDashboardActions";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertyType, Utility } from "@/types/dashboard";

// Same image pool and hash function as PropertyListView
const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=400&fit=crop",
];

function getPropertyImage(propertyId: string): string {
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    hash = ((hash << 5) - hash) + propertyId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % PROPERTY_IMAGES.length;
  return PROPERTY_IMAGES[index];
}

interface PropertyDetailViewProps {
  selectedProperty: Property;
  setSelectedProperty: (property: Property | null) => void;
}

export default function PropertyDetailView({ 
  selectedProperty, 
  setSelectedProperty 
}: PropertyDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPropertyTypes, setEditingPropertyTypes] = useState<PropertyType[]>([]);
  const [editingUtilities, setEditingUtilities] = useState<Utility[]>([]);
  const [newPropertyType, setNewPropertyType] = useState({ type: '', price: '', units: 1 });
  const [newUtility, setNewUtility] = useState({ type: '', price: '' });
  const [rentSettings, setRentSettings] = useState({
    paymentDay: 1,
    gracePeriodDays: 3
  });
  const { toast } = useToast();

  const { updatePropertyMutation } = useDashboard();

  // Save rent settings
  const saveRentSettings = async () => {
    try {
      const response = await fetch(`/api/properties/${selectedProperty.id}/rent-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentDay: rentSettings.paymentDay,
          gracePeriodDays: rentSettings.gracePeriodDays
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rent settings updated successfully",
        });
      } else {
        throw new Error('Failed to update rent settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rent settings",
        variant: "destructive",
      });
    }
  };

  const {
    handleBackToList,
    handleStartEditing,
    handleCancelEditing,
    handleSaveChanges,
    handleUpdatePropertyType,
    handleRemovePropertyType,
    handleAddPropertyType,
    handleUpdateUtility,
    handleRemoveUtility,
    handleAddUtility,
  } = usePropertyActions({
    setSelectedProperty,
    setIsEditing,
    setEditingPropertyTypes,
    setEditingUtilities,
    setNewPropertyType,
    setNewUtility,
    selectedProperty,
    editingPropertyTypes,
    editingUtilities,
    newPropertyType,
    newUtility,
    updatePropertyMutation,
  });

  // Initialize editing state when property is selected
  useEffect(() => {
    if (selectedProperty) {
      // Ensure property types have units field (default to 1 for old data)
      const propertyTypesWithUnits = (selectedProperty.propertyTypes || []).map(pt => ({
        ...pt,
        units: pt.units || 1
      }));
      setEditingPropertyTypes(propertyTypesWithUnits);
      
      // Convert utilities object to array format for editing
      if (selectedProperty.utilities && typeof selectedProperty.utilities === 'object' && !Array.isArray(selectedProperty.utilities)) {
        const utilitiesArray = Object.entries(selectedProperty.utilities).map(([key, included]) => ({
          type: key,
          price: included ? 'Included' : 'Not Included'
        }));
        setEditingUtilities(utilitiesArray);
      } else {
        setEditingUtilities(selectedProperty.utilities || []);
      }

      // Load rent settings if they exist
      if (selectedProperty.rentSettings) {
        setRentSettings({
          paymentDay: selectedProperty.rentSettings.paymentDay || 1,
          gracePeriodDays: selectedProperty.rentSettings.gracePeriodDays || 3
        });
      }
    }
  }, [selectedProperty]);

  const onBackToList = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setEditingPropertyTypes([]);
    setEditingUtilities([]);
    setNewPropertyType({ type: '', price: '', units: 1 });
    setNewUtility({ type: '', price: '' });
  };

  const onStartEditing = () => {
    setIsEditing(true);
  };

  const onCancelEditing = () => {
    setIsEditing(false);
    setEditingPropertyTypes(selectedProperty?.propertyTypes || []);
    
    // Convert utilities object to array format for editing
    if (selectedProperty?.utilities && typeof selectedProperty.utilities === 'object' && !Array.isArray(selectedProperty.utilities)) {
      const utilitiesArray = Object.entries(selectedProperty.utilities).map(([key, included]) => ({
        type: key,
        price: included ? 'Included' : 'Not Included'
      }));
      setEditingUtilities(utilitiesArray);
    } else {
      setEditingUtilities(selectedProperty?.utilities || []);
    }
    
    setNewPropertyType({ type: '', price: '', units: 1 });
    setNewUtility({ type: '', price: '' });
  };

  const onSaveChanges = async () => {
    if (selectedProperty) {
      // Ensure all property types have units field (default to 1 if missing)
      const propertyTypesWithUnits = editingPropertyTypes.map(pt => ({
        ...pt,
        units: pt.units || 1
      }));

      console.log('Saving property types with units:', propertyTypesWithUnits);

      // Save property types and utilities
      updatePropertyMutation.mutate({
        propertyId: selectedProperty.id,
        propertyTypes: propertyTypesWithUnits,
        utilities: editingUtilities
      });

      // Save rent settings
      await saveRentSettings();
    }
  };

  const onUpdatePropertyType = (index: number, field: 'type' | 'price' | 'units', value: string | number) => {
    const updated = [...editingPropertyTypes];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPropertyTypes(updated);
  };

  const onRemovePropertyType = (index: number) => {
    const updated = editingPropertyTypes.filter((_, i) => i !== index);
    setEditingPropertyTypes(updated);
  };

  const onAddPropertyType = () => {
    if (newPropertyType.type && newPropertyType.price) {
      setEditingPropertyTypes([...editingPropertyTypes, newPropertyType]);
      setNewPropertyType({ type: '', price: '', units: 1 });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both property type and price",
        variant: "destructive",
      });
    }
  };

  const onUpdateUtility = (index: number, field: 'type' | 'price', value: string) => {
    const updated = [...editingUtilities];
    updated[index] = { ...updated[index], [field]: value };
    setEditingUtilities(updated);
  };

  const onRemoveUtility = (index: number) => {
    const updated = editingUtilities.filter((_, i) => i !== index);
    setEditingUtilities(updated);
  };

  const onAddUtility = () => {
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToList}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-neutral-500">Property Management</p>
            <h2 className="text-2xl font-semibold text-neutral-900">{selectedProperty.name}</h2>
          </div>
        </div>
        
        {!isEditing && (
          <Button
            onClick={onStartEditing}
            className="bg-primary hover:bg-primary/90 h-10"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={onSaveChanges}
              className="bg-green-600 hover:bg-green-700 h-10"
              disabled={updatePropertyMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            <Button
              onClick={onCancelEditing}
              variant="outline"
              className="h-10"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Hero Image & Quick Stats */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden mb-6">
        <div className="relative h-64">
          <img 
            src={getPropertyImage(selectedProperty.id)} 
            alt={selectedProperty.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-medium text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                Active
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <Home className="h-4 w-4" />
                  <span className="text-xs font-medium">Unit Types</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{editingPropertyTypes.length}</p>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <Building className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Units</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {editingPropertyTypes.reduce((sum, pt) => sum + (pt.units || 0), 0)}
                </p>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 text-neutral-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Utilities</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{editingUtilities.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Unit Types & Utilities */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Unit Types & Pricing */}
          <div className="bg-white rounded-xl border border-neutral-200/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Unit Types & Pricing</h3>
                <p className="text-sm text-neutral-500 mt-1">Manage different unit types and rental prices</p>
              </div>
              {isEditing && (
                <Button
                  onClick={onAddPropertyType}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9"
                  disabled={!newPropertyType.type || !newPropertyType.price}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Type
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {editingPropertyTypes.map((propertyType, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-lg border border-neutral-200/60 hover:border-neutral-300 transition-colors">
                  <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                    <div>
                      {isEditing ? (
                        <Input
                          value={propertyType.type}
                          onChange={(e) => onUpdatePropertyType(index, 'type', e.target.value)}
                          placeholder="e.g., 1 Bedroom"
                          className="h-9"
                        />
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">Type</p>
                          <p className="font-medium text-neutral-900 capitalize">
                            {propertyType.type.replace('bedroom', ' Bedroom')}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={propertyType.units || 1}
                            onChange={(e) => onUpdatePropertyType(index, 'units', parseInt(e.target.value) || 1)}
                            placeholder="Units"
                            min="1"
                            className="w-20 h-9"
                          />
                          <span className="text-xs text-neutral-500">units</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">Units</p>
                          <p className="font-medium text-neutral-900">
                            {propertyType.units || 1} unit{(propertyType.units || 1) > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500">KSH</span>
                          <Input
                            type="number"
                            value={propertyType.price}
                            onChange={(e) => onUpdatePropertyType(index, 'price', e.target.value)}
                            placeholder="Rent"
                            className="flex-1 h-9"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">Monthly Rent</p>
                          <p className="font-semibold text-green-600">
                            KSH {propertyType.price?.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePropertyType(index)}
                      className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {isEditing && (
                <div className="pt-3 border-t border-neutral-200/60">
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="e.g., Studio"
                      value={newPropertyType.type}
                      onChange={(e) => setNewPropertyType({ ...newPropertyType, type: e.target.value })}
                      className="h-9"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Units"
                        value={newPropertyType.units || 1}
                        onChange={(e) => setNewPropertyType({ ...newPropertyType, units: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="flex-1 h-9"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Rent"
                        value={newPropertyType.price}
                        onChange={(e) => setNewPropertyType({ ...newPropertyType, price: e.target.value })}
                        className="flex-1 h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingPropertyTypes.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 mb-3">
                    <Building className="h-6 w-6 text-neutral-400" />
                  </div>
                  <p className="text-sm">No unit types configured yet</p>
                  {isEditing && (
                    <p className="text-xs mt-1 text-neutral-400">Add your first unit type above</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Utilities Section */}
          <div className="bg-white rounded-xl border border-neutral-200/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Utilities</h3>
                <p className="text-sm text-neutral-500 mt-1">Manage utilities and pricing per unit</p>
              </div>
              {isEditing && (
                <Button
                  onClick={onAddUtility}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 h-9"
                  disabled={!newUtility.type || !newUtility.price}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Utility
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {editingUtilities.map((utility, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-lg border border-neutral-200/60 hover:border-neutral-300 transition-colors">
                  <div className="flex-1 grid grid-cols-2 gap-4 items-center">
                    <div>
                      {isEditing ? (
                        <Input
                          value={utility.type}
                          onChange={(e) => onUpdateUtility(index, 'type', e.target.value)}
                          placeholder="e.g., Electricity"
                          className="h-9"
                        />
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">Utility</p>
                          <p className="font-medium text-neutral-900 capitalize">{utility.type}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500">KSH</span>
                          <Input
                            type="number"
                            value={utility.price}
                            onChange={(e) => onUpdateUtility(index, 'price', e.target.value)}
                            placeholder="Price"
                            className="flex-1 h-9"
                          />
                          <span className="text-xs text-neutral-500">/unit</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">Price per Unit</p>
                          <p className="font-semibold text-green-600">
                            KSH {utility.price?.toLocaleString()}/unit
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveUtility(index)}
                      className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {isEditing && (
                <div className="pt-3 border-t border-neutral-200/60">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="e.g., Water"
                      value={newUtility.type}
                      onChange={(e) => setNewUtility({ ...newUtility, type: e.target.value })}
                      className="h-9"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Price per unit"
                        value={newUtility.price}
                        onChange={(e) => setNewUtility({ ...newUtility, price: e.target.value })}
                        className="flex-1 h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingUtilities.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 mb-3">
                    <AlertTriangle className="h-6 w-6 text-neutral-400" />
                  </div>
                  <p className="text-sm">No utilities configured yet</p>
                  {isEditing && (
                    <p className="text-xs mt-1 text-neutral-400">Add your first utility above</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Rent Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200/60 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">Rent Payment Settings</h3>
            
            <div className="space-y-5">
              <div>
                <Label htmlFor="paymentDay" className="text-sm font-medium text-neutral-700">
                  Payment Due Date
                </Label>
                <div className="mt-2">
                  <Input
                    id="paymentDay"
                    type="number"
                    min="1"
                    max="31"
                    value={rentSettings.paymentDay}
                    onChange={(e) => setRentSettings({
                      ...rentSettings,
                      paymentDay: parseInt(e.target.value) || 1
                    })}
                    disabled={!isEditing}
                    className={`h-10 ${!isEditing ? "bg-neutral-50/80 border-neutral-200/60" : ""}`}
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Day of month rent is due (1-31)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="gracePeriod" className="text-sm font-medium text-neutral-700">
                  Grace Period
                </Label>
                <div className="mt-2">
                  <Input
                    id="gracePeriod"
                    type="number"
                    min="0"
                    max="30"
                    value={rentSettings.gracePeriodDays}
                    onChange={(e) => setRentSettings({
                      ...rentSettings,
                      gracePeriodDays: parseInt(e.target.value) || 3
                    })}
                    disabled={!isEditing}
                    className={`h-10 ${!isEditing ? "bg-neutral-50/80 border-neutral-200/60" : ""}`}
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Days before marking overdue
                  </p>
                </div>
              </div>

              {!isEditing && (
                <div className="pt-4 mt-4 border-t border-neutral-200/60">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{rentSettings.paymentDay}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Due on the {rentSettings.paymentDay}
                          {rentSettings.paymentDay === 1 ? 'st' : 
                           rentSettings.paymentDay === 2 ? 'nd' : 
                           rentSettings.paymentDay === 3 ? 'rd' : 'th'}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">Monthly payment date</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-600">{rentSettings.gracePeriodDays}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{rentSettings.gracePeriodDays} day grace period</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Before overdue status</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
