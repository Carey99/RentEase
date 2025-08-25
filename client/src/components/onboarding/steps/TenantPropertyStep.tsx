import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import StepForm from "@/components/onboarding/step-form";
import type { UseFormReturn } from "react-hook-form";

interface TenantPropertyStepProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  onBack: () => void;
  availableProperties: any[];
  propertyTypes: any[];
  selectedPropertyId?: string;
  isLoading: boolean;
}

export function TenantPropertyStep({
  form,
  onSubmit,
  onBack,
  availableProperties,
  propertyTypes,
  selectedPropertyId,
  isLoading
}: TenantPropertyStepProps) {
  return (
    <StepForm
      title="Find Your Apartment"
      description="Select your apartment from available properties."
      form={form}
      onSubmit={onSubmit}
      showBack
      onBack={onBack}
      submitText="Complete Setup"
      submitIcon={<Check />}
      isLoading={isLoading}
      submitDisabled={!form.watch("propertyId") || form.watch("propertyId") === "no-properties" || !form.watch("propertyType") || !form.watch("unitNumber")}
      data-testid="form-tenant-property"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="propertyId">Select Property</Label>
          <Select onValueChange={(value) => {
            form.setValue("propertyId", value);
            form.setValue("propertyType", ""); // Reset property type when property changes
          }}>
            <SelectTrigger data-testid="select-property">
              <SelectValue placeholder="Choose a property" />
            </SelectTrigger>
            <SelectContent>
              {availableProperties.length > 0 ? (
                availableProperties.map((property: any) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-properties" disabled>
                  No properties available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.propertyId && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.propertyId.message as string}
            </p>
          )}
        </div>

        {selectedPropertyId && selectedPropertyId !== "no-properties" && (
          <div>
            <Label htmlFor="propertyType">Select Unit Type</Label>
            <Select onValueChange={(value) => form.setValue("propertyType", value)}>
              <SelectTrigger data-testid="select-property-type">
                <SelectValue placeholder="Choose unit type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.length > 0 ? (
                  propertyTypes.map((type: any) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex justify-between items-center w-full">
                        <span className="capitalize">
                          {type.type.replace('bedroom', ' Bedroom')}
                        </span>
                        <span className="ml-4 text-sm text-neutral-600">
                          KSH {type.price}/month
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-types" disabled>
                    No unit types available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.propertyType && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.propertyType.message as string}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="unitNumber">Unit Number / House Number</Label>
          <Input
            id="unitNumber"
            {...form.register("unitNumber")}
            placeholder="e.g., 101, A1, House 5"
            data-testid="input-unit-number"
          />
          {form.formState.errors.unitNumber && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.unitNumber.message as string}
            </p>
          )}
        </div>

        {/* Show selected unit details */}
        {form.watch("propertyType") && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Selected Unit</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {propertyTypes.find((pt: any) => pt.type === form.watch("propertyType"))?.type.replace('bedroom', ' Bedroom')} - 
                    KSH {propertyTypes.find((pt: any) => pt.type === form.watch("propertyType"))?.price}/month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {availableProperties.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    No Properties Available
                  </p>
                  <p className="text-sm text-yellow-700">
                    Ask your landlord to register the property first, then you can join.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPropertyId && selectedPropertyId !== "no-properties" && propertyTypes.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <div>
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    No Unit Types Available
                  </p>
                  <p className="text-sm text-yellow-700">
                    The landlord hasn't set up unit types for this property yet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-xs">i</span>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Important</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You must be assigned to an apartment to access your tenant dashboard. 
                  Contact your landlord if you don't see your property listed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StepForm>
  );
}
