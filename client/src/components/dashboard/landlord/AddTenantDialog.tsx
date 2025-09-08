import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import type { Property } from "@/types/dashboard";

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TenantFormData {
  fullName: string;
  email: string;
  phone: string;
  propertyId: string;
  unitType: string;
  unitNumber: string;
  rentAmount: string;
}

export default function AddTenantDialog({ open, onOpenChange }: AddTenantDialogProps) {
  const { properties } = useDashboard();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const [formData, setFormData] = useState<TenantFormData>({
    fullName: "",
    email: "",
    phone: "",
    propertyId: "",
    unitType: "",
    unitNumber: "",
    rentAmount: "",
  });

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setSelectedProperty(property || null);
    setFormData(prev => ({
      ...prev,
      propertyId,
      unitType: "",
      rentAmount: "",
    }));
  };

  const handleUnitTypeChange = (unitType: string) => {
    if (selectedProperty) {
      const propertyType = selectedProperty.propertyTypes.find(pt => pt.type === unitType);
      const rentAmount = propertyType?.price || "";
      
      setFormData(prev => ({
        ...prev,
        unitType,
        rentAmount,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.propertyId || !formData.unitType) {
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Register the tenant user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: 'temporary123', // Default password - tenant should change this
          role: 'tenant',
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register tenant');
      }

      const { user } = await registerResponse.json();

      // Step 2: Assign tenant to property
      const assignResponse = await fetch('/api/tenant-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.id,
          propertyId: formData.propertyId,
          propertyType: formData.unitType,
          unitNumber: formData.unitNumber,
          rentAmount: formData.rentAmount,
        }),
      });

      if (!assignResponse.ok) {
        throw new Error('Failed to assign tenant to property');
      }

      // Reset form and close dialog
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        propertyId: "",
        unitType: "",
        unitNumber: "",
        rentAmount: "",
      });
      setSelectedProperty(null);
      onOpenChange(false);

      // Refresh tenants list (this will be handled by react-query refetch)
      window.location.reload(); // Temporary - we can improve this later

    } catch (error) {
      console.error('Error adding tenant:', error);
      alert('Failed to add tenant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Tenant</DialogTitle>
          <DialogDescription>
            Add a new tenant and assign them to one of your properties.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tenant Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter tenant's full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="tenant@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>
          </div>

          {/* Property Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Property Assignment</h3>
            
            <div>
              <Label htmlFor="property">Select Property *</Label>
              <Select value={formData.propertyId} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProperty && (
              <>
                <div>
                  <Label htmlFor="unitType">Unit Type *</Label>
                  <Select value={formData.unitType} onValueChange={handleUnitTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose unit type" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProperty.propertyTypes.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
                          {type.type.charAt(0).toUpperCase() + type.type.slice(1)} - KSH {parseInt(type.price).toLocaleString()}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unitNumber">Unit Number</Label>
                    <Input
                      id="unitNumber"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
                      placeholder="e.g., A101, 2B, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="rentAmount">Monthly Rent (KSH)</Label>
                    <Input
                      id="rentAmount"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, rentAmount: e.target.value }))}
                      placeholder="0"
                      readOnly
                      className="bg-neutral-50"
                    />
                  </div>
                </div>

                {/* Property Details Preview */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Property Details</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Property:</strong> {selectedProperty.name}</p>
                      <p><strong>Total Units:</strong> {selectedProperty.totalUnits}</p>
                      <p><strong>Occupied Units:</strong> {selectedProperty.occupiedUnits}</p>
                      {selectedProperty.utilities && (
                        <p><strong>Included Utilities:</strong> {
                          Object.entries(selectedProperty.utilities)
                            .filter(([, included]) => included)
                            .map(([utility]) => utility)
                            .join(', ') || 'None'
                        }</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.fullName || !formData.email || !formData.propertyId || !formData.unitType}
              className="bg-primary hover:bg-secondary"
            >
              {isLoading ? "Adding Tenant..." : "Add Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
