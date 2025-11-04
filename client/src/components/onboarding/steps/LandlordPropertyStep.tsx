import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import StepForm from "@/components/onboarding/step-form";
import type { UseFormReturn } from "react-hook-form";
import type { PropertyType } from "@/types/onboarding";

interface LandlordPropertyStepProps {
  form: UseFormReturn<any>;
  onSubmit: () => void;
  onBack: () => void;
  selectedPropertyTypes: PropertyType[];
  addPropertyType: (type: string, price: string, units?: number) => void;
  removePropertyType: (type: string) => void;
  updatePropertyTypePrice: (type: string, price: string) => void;
  showCustomType: boolean;
  setShowCustomType: (show: boolean) => void;
  isAddingAnotherProperty: boolean;
}

export function LandlordPropertyStep({
  form,
  onSubmit,
  onBack,
  selectedPropertyTypes,
  addPropertyType,
  removePropertyType,
  updatePropertyTypePrice,
  showCustomType,
  setShowCustomType,
  isAddingAnotherProperty
}: LandlordPropertyStepProps) {
  if (isAddingAnotherProperty) {
    // Skip property name when adding another property, go directly to property types
    return (
      <StepForm
        title="Add Another Property"
        description="Let's add another property to your portfolio."
        form={form}
        onSubmit={onSubmit}
        data-testid="form-add-property"
      >
        <div className="space-y-6">
          <div>
            <Label htmlFor="propertyName">Property Name</Label>
            <Input
              id="propertyName"
              {...form.register("propertyName")}
              placeholder="Sunset Apartments"
              data-testid="input-property-name"
            />
            {form.formState.errors.propertyName && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.propertyName.message as string}
              </p>
            )}
          </div>
        </div>
      </StepForm>
    );
  }

  return (
    <StepForm
      title="Property Information"
      description="Tell us about your rental property and available unit types."
      form={form}
      onSubmit={onSubmit}
      showBack
      onBack={onBack}
      submitText="Next"
      submitIcon={<ArrowRight />}
      submitDisabled={selectedPropertyTypes.length === 0 || selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "")}
      data-testid="form-landlord-property"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="propertyName">Property Name</Label>
          <Input
            id="propertyName"
            {...form.register("propertyName")}
            placeholder="Sunset Apartments"
            data-testid="input-property-name"
          />
          {form.formState.errors.propertyName && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.propertyName.message as string}
            </p>
          )}
        </div>

        <div>
          <Label>Property Types & Pricing</Label>
          <p className="text-sm text-neutral-600 mb-4">Select the types of units available in your property and set their monthly rent prices.</p>
          
          {/* Standard Property Types */}
          <div className="space-y-3 mb-4">
            {[
              { value: 'studio', label: 'Studio' },
              { value: 'bedsitter', label: 'Bedsitter' },
              { value: '1bedroom', label: '1 Bedroom' },
              { value: '2bedroom', label: '2 Bedroom' },
              { value: '3bedroom', label: '3 Bedroom' },
              { value: '4bedroom', label: '4 Bedroom' }
            ].map((typeOption) => {
              const isSelected = selectedPropertyTypes.find(pt => pt.type === typeOption.value);
              return (
                <div key={typeOption.value} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={typeOption.value}
                      checked={!!isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addPropertyType(typeOption.value, "", 1);
                        } else {
                          removePropertyType(typeOption.value);
                        }
                      }}
                      data-testid={`checkbox-${typeOption.value}`}
                    />
                    <Label htmlFor={typeOption.value} className="flex-1 font-medium">
                      {typeOption.label}
                    </Label>
                  </div>
                  
                  {isSelected && (
                    <div className="ml-6 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`units-${typeOption.value}`} className="text-sm text-neutral-600 min-w-fit">
                            Units:
                          </Label>
                          <Input
                            id={`units-${typeOption.value}`}
                            type="number"
                            min="1"
                            placeholder="Number of units"
                            value={isSelected.units || 1}
                            onChange={(e) => {
                              const currentType = selectedPropertyTypes.find(pt => pt.type === typeOption.value);
                              if (currentType) {
                                // Update with new units value
                                removePropertyType(typeOption.value);
                                addPropertyType(typeOption.value, currentType.price, parseInt(e.target.value) || 1);
                              }
                            }}
                            className="flex-1"
                            data-testid={`units-${typeOption.value}`}
                          />
                          <span className="text-sm text-neutral-500 min-w-fit">units</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`price-${typeOption.value}`} className="text-sm text-neutral-600 min-w-fit">
                            Monthly Rent:
                          </Label>
                          <Input
                            id={`price-${typeOption.value}`}
                            type="number"
                            placeholder="Enter price"
                            value={isSelected.price}
                            onChange={(e) => updatePropertyTypePrice(typeOption.value, e.target.value)}
                            className="flex-1"
                            data-testid={`price-${typeOption.value}`}
                          />
                          <span className="text-sm text-neutral-500 min-w-fit">KSH/month</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Property Type */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="custom-type"
                checked={showCustomType}
                onCheckedChange={(checked) => setShowCustomType(!!checked)}
                data-testid="checkbox-custom-type"
              />
              <Label htmlFor="custom-type">Custom Property Type (5+ bedrooms)</Label>
            </div>
            
            {showCustomType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="e.g., 5 Bedroom Villa"
                    {...form.register("customType")}
                    data-testid="input-custom-type"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Monthly rent"
                    {...form.register("customPrice")}
                    data-testid="input-custom-price"
                  />
                  <span className="text-sm text-neutral-500">KSH</span>
                </div>
              </div>
            )}
          </div>

          {/* Selected Types Summary */}
          {selectedPropertyTypes.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-green-900 mb-2">Selected Property Types:</h4>
                <div className="space-y-1">
                  {selectedPropertyTypes.map((pt) => (
                    <div key={pt.type} className="flex justify-between text-sm">
                      <span className="text-green-800 capitalize">
                        {pt.type.replace('bedroom', ' Bedroom')} ({pt.units || 1} unit{(pt.units || 1) > 1 ? 's' : ''})
                      </span>
                      <span className="text-green-700 font-medium">KSH {pt.price}/month</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPropertyTypes.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              Please select at least one property type
            </p>
          )}

          {selectedPropertyTypes.length > 0 && selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "") && (
            <p className="text-sm text-red-600 mt-1">
              Please enter prices for all selected property types
            </p>
          )}
        </div>
      </div>
    </StepForm>
  );
}
