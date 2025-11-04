import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Save, X, Plus, Building, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePropertyActions } from "@/hooks/dashboard/useDashboardActions";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import { useToast } from "@/hooks/use-toast";
import type { Property, PropertyType, Utility } from "@/types/dashboard";

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
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          onClick={onBackToList}
          className="text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
        <h2 className="text-xl font-semibold text-neutral-900">{selectedProperty.name}</h2>
        {!isEditing && (
          <Button
            onClick={onStartEditing}
            className="bg-primary hover:bg-secondary"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Property
          </Button>
        )}
        {isEditing && (
          <div className="flex space-x-2">
            <Button
              onClick={onSaveChanges}
              className="bg-green-600 hover:bg-green-700"
              disabled={updatePropertyMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
            <Button
              onClick={onCancelEditing}
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
            <div>
              <Label className="text-sm font-medium">Total Units</Label>
              <p className="text-lg font-semibold text-blue-600">
                {editingPropertyTypes.reduce((sum, pt) => sum + (pt.units || 0), 0)} units
              </p>
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
                      onChange={(e) => onUpdatePropertyType(index, 'type', e.target.value)}
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
                        value={propertyType.units || 1}
                        onChange={(e) => onUpdatePropertyType(index, 'units', parseInt(e.target.value) || 1)}
                        placeholder="Units"
                        min="1"
                        className="w-24"
                      />
                      <span className="text-sm text-neutral-500">units</span>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">
                      {propertyType.units || 1} unit{(propertyType.units || 1) > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={propertyType.price}
                        onChange={(e) => onUpdatePropertyType(index, 'price', e.target.value)}
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
                    onClick={() => onRemovePropertyType(index)}
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
                      placeholder="Units"
                      value={newPropertyType.units || 1}
                      onChange={(e) => setNewPropertyType({ ...newPropertyType, units: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-24"
                    />
                    <span className="text-sm text-neutral-500">units</span>
                  </div>
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
                    onClick={onAddPropertyType}
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
                      onChange={(e) => onUpdateUtility(index, 'type', e.target.value)}
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
                        onChange={(e) => onUpdateUtility(index, 'price', e.target.value)}
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
                    onClick={() => onRemoveUtility(index)}
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
                    onClick={onAddUtility}
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

      {/* Rent Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Rent Payment Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentDay">Monthly Payment Due Date</Label>
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
                className={!isEditing ? "bg-neutral-50" : ""}
              />
              <p className="text-xs text-neutral-600 mt-1">
                Day of the month when rent is due (1-31)
              </p>
            </div>
            <div>
              <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
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
                className={!isEditing ? "bg-neutral-50" : ""}
              />
              <p className="text-xs text-neutral-600 mt-1">
                Days after due date before marking overdue
              </p>
            </div>
          </div>
          
          {isEditing && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Payment Day:</strong> Tenants will be due on the {rentSettings.paymentDay}
                {rentSettings.paymentDay === 1 ? 'st' : 
                 rentSettings.paymentDay === 2 ? 'nd' : 
                 rentSettings.paymentDay === 3 ? 'rd' : 'th'} of each month.
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Grace Period:</strong> Tenants have {rentSettings.gracePeriodDays} days after the due date before being marked overdue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
