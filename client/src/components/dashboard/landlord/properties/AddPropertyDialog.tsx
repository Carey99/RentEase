import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePropertyFormState } from "@/hooks/dashboard/useDashboard";
import type { NewPropertyForm, PropertyType, Utility, CurrentUser } from "@/types/dashboard";

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createPropertyMutation: any;
  currentUser: CurrentUser | null;
}

export default function AddPropertyDialog({ 
  open, 
  onOpenChange, 
  createPropertyMutation,
  currentUser 
}: AddPropertyDialogProps) {
  const {
    newPropertyForm,
    setNewPropertyForm,
    tempPropertyType,
    setTempPropertyType,
    tempUtility,
    setTempUtility,
    resetNewPropertyForm,
  } = usePropertyFormState();

  const handleAddPropertyTypeToNew = () => {
    if (tempPropertyType.type && tempPropertyType.price) {
      setNewPropertyForm({
        ...newPropertyForm,
        propertyTypes: [...newPropertyForm.propertyTypes, tempPropertyType]
      });
      setTempPropertyType({ type: '', price: '' });
    }
  };

  const handleRemovePropertyTypeFromNew = (index: number) => {
    setNewPropertyForm({
      ...newPropertyForm,
      propertyTypes: newPropertyForm.propertyTypes.filter((_, i) => i !== index)
    });
  };

  const handleAddUtilityToNew = () => {
    if (tempUtility.type && tempUtility.price) {
      setNewPropertyForm({
        ...newPropertyForm,
        utilities: [...newPropertyForm.utilities, tempUtility]
      });
      setTempUtility({ type: '', price: '' });
    }
  };

  const handleRemoveUtilityFromNew = (index: number) => {
    setNewPropertyForm({
      ...newPropertyForm,
      utilities: newPropertyForm.utilities.filter((_, i) => i !== index)
    });
  };

  const handleCreateProperty = () => {
    if (!newPropertyForm.propertyName.trim()) {
      return;
    }

    if (newPropertyForm.propertyTypes.length === 0) {
      return;
    }

    const propertyData = {
      landlordId: currentUser?.id,
      name: newPropertyForm.propertyName,
      propertyTypes: newPropertyForm.propertyTypes,
      utilities: newPropertyForm.utilities,
    };

    createPropertyMutation.mutate(propertyData);
    onOpenChange(false);
    resetNewPropertyForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Property Name */}
          <div>
            <Label htmlFor="propertyName" className="text-sm font-medium">Property Name</Label>
            <Input
              id="propertyName"
              placeholder="Enter property name (e.g., Sunset Apartments)"
              value={newPropertyForm.propertyName}
              onChange={(e) => setNewPropertyForm({ ...newPropertyForm, propertyName: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Property Types Section */}
          <div>
            <Label className="text-sm font-medium">Unit Types & Pricing</Label>
            <p className="text-sm text-neutral-600 mb-4">Add the different unit types available in this property.</p>
            
            <div className="space-y-4">
              {newPropertyForm.propertyTypes.map((propertyType, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg bg-neutral-50">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{propertyType.type}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-600">KSH {propertyType.price}/month</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePropertyTypeFromNew(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add Property Type Form */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-3 block">Add Unit Type</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Unit type (e.g., 1 Bedroom, Studio)"
                    value={tempPropertyType.type}
                    onChange={(e) => setTempPropertyType({ ...tempPropertyType, type: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Monthly rent"
                      value={tempPropertyType.price}
                      onChange={(e) => setTempPropertyType({ ...tempPropertyType, price: e.target.value })}
                    />
                    <span className="text-sm text-neutral-500">KSH</span>
                  </div>
                  <Button
                    onClick={handleAddPropertyTypeToNew}
                    className="bg-primary hover:bg-secondary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Utilities Section */}
          <div>
            <Label className="text-sm font-medium">Utilities (Optional)</Label>
            <p className="text-sm text-neutral-600 mb-4">Add utilities available for this property.</p>
            
            <div className="space-y-4">
              {newPropertyForm.utilities.map((utility, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg bg-neutral-50">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{utility.type}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-600">KSH {utility.price}/unit</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUtilityFromNew(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add Utility Form */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-3 block">Add Utility</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Utility type (e.g., Electricity, Water)"
                    value={tempUtility.type}
                    onChange={(e) => setTempUtility({ ...tempUtility, type: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Price per unit"
                      value={tempUtility.price}
                      onChange={(e) => setTempUtility({ ...tempUtility, price: e.target.value })}
                    />
                    <span className="text-sm text-neutral-500">KSH</span>
                  </div>
                  <Button
                    onClick={handleAddUtilityToNew}
                    className="bg-primary hover:bg-secondary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetNewPropertyForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProperty}
              className="bg-primary hover:bg-secondary"
              disabled={createPropertyMutation.isPending}
            >
              {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
