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
      setTempPropertyType({ type: '', price: '', units: 1 });
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-neutral-100">
          <DialogTitle className="text-2xl font-semibold">Add New Property</DialogTitle>
          <p className="text-sm text-neutral-500 mt-1">Create a new property and define its units</p>
        </DialogHeader>
        
        <div className="px-8 py-6 space-y-8">
          {/* Property Name */}
          <div>
            <Label htmlFor="propertyName" className="text-sm font-medium text-neutral-700">Property Name</Label>
            <Input
              id="propertyName"
              placeholder="e.g., Sunset Apartments"
              value={newPropertyForm.propertyName}
              onChange={(e) => setNewPropertyForm({ ...newPropertyForm, propertyName: e.target.value })}
              className="mt-2 h-11"
            />
          </div>

          {/* Property Types Section */}
          <div>
            <Label className="text-sm font-medium text-neutral-700">Unit Types & Pricing</Label>
            <p className="text-xs text-neutral-500 mt-1 mb-4">Define the different unit types in this property</p>
            
            <div className="space-y-3">
              {newPropertyForm.propertyTypes.map((propertyType, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-xl border border-neutral-100">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 capitalize">{propertyType.type}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{propertyType.units || 1} unit{(propertyType.units || 1) > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">KSH {parseInt(propertyType.price).toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">per month</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePropertyTypeFromNew(index)}
                    className="ml-4 p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add Property Type Form */}
              <div className="mt-4 p-4 bg-white rounded-xl border border-dashed border-neutral-300">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5">
                    <Input
                      placeholder="Unit type (e.g., 1 Bedroom)"
                      value={tempPropertyType.type}
                      onChange={(e) => setTempPropertyType({ ...tempPropertyType, type: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Units"
                      value={tempPropertyType.units || 1}
                      onChange={(e) => setTempPropertyType({ ...tempPropertyType, units: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="h-10"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Monthly rent"
                      value={tempPropertyType.price}
                      onChange={(e) => setTempPropertyType({ ...tempPropertyType, price: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button
                      onClick={handleAddPropertyTypeToNew}
                      className="w-full h-10 bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Utilities Section */}
          <div>
            <Label className="text-sm font-medium text-neutral-700">Utilities (Optional)</Label>
            <p className="text-xs text-neutral-500 mt-1 mb-4">Add utilities available for this property</p>
            
            <div className="space-y-3">
              {newPropertyForm.utilities.map((utility, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50/80 rounded-xl border border-neutral-100">
                  <div className="flex items-center gap-4 flex-1">
                    <p className="font-medium text-neutral-900 capitalize flex-1">{utility.type}</p>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">KSH {parseInt(utility.price).toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">per unit</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUtilityFromNew(index)}
                    className="ml-4 p-2 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add Utility Form */}
              <div className="mt-4 p-4 bg-white rounded-xl border border-dashed border-neutral-300">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Utility type (e.g., Electricity)"
                    value={tempUtility.type}
                    onChange={(e) => setTempUtility({ ...tempUtility, type: e.target.value })}
                    className="flex-1 h-10"
                  />
                  <Input
                    type="number"
                    placeholder="Price per unit"
                    value={tempUtility.price}
                    onChange={(e) => setTempUtility({ ...tempUtility, price: e.target.value })}
                    className="w-32 h-10"
                  />
                  <Button
                    onClick={handleAddUtilityToNew}
                    className="h-10 bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Action Buttons - Sticky Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-8 py-5 bg-neutral-50/80 border-t border-neutral-100 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetNewPropertyForm();
            }}
            className="h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateProperty}
            className="bg-primary hover:bg-primary/90 h-11 px-6"
            disabled={createPropertyMutation.isPending}
          >
            {createPropertyMutation.isPending ? 'Creating...' : 'Create Property'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
