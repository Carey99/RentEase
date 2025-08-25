import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import StepForm from "@/components/onboarding/step-form";
import type { UseFormReturn } from "react-hook-form";
import type { Utility } from "@/types/onboarding";

interface UtilitiesStepProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  onBack: () => void;
  selectedUtilities: Utility[];
  addUtility: (type: string, price: string) => void;
  removeUtility: (type: string) => void;
  updateUtilityPrice: (type: string, price: string) => void;
  onAddAnotherProperty: () => void;
  registeredUserId: string | null;
  isAddingAnotherProperty: boolean;
  isLoading: boolean;
}

export function UtilitiesStep({
  form,
  onSubmit,
  onBack,
  selectedUtilities,
  addUtility,
  removeUtility,
  updateUtilityPrice,
  onAddAnotherProperty,
  registeredUserId,
  isAddingAnotherProperty,
  isLoading
}: UtilitiesStepProps) {
  return (
    <StepForm
      title="Utilities & Final Setup"
      description="Configure utility billing and complete your property setup."
      form={form}
      onSubmit={(data) => {
        console.log('=== STEP FORM SUBMISSION ===');
        console.log('Raw form data from React Hook Form:', data);
        console.log('Form validation state:', form.formState);
        console.log('Form errors:', form.formState.errors);
        onSubmit(data);
      }}
      showBack
      onBack={onBack}
      submitText={isAddingAnotherProperty ? "Add Property" : "Complete Setup"}
      submitIcon={<Check />}
      isLoading={isLoading}
      data-testid="form-landlord-utilities"
    >
      <div className="space-y-6">
        <div>
          <Label>Utility Bills (Price per Unit)</Label>
          <p className="text-sm text-neutral-600 mb-3">Set pricing for utilities that will be charged separately to tenants.</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {['electricity', 'water', 'garbage', 'security', 'internet', 'other'].map((utility) => {
              const isSelected = selectedUtilities.find(ut => ut.type === utility);
              return (
                <div key={utility} className="flex items-center space-x-2">
                  <Checkbox
                    id={utility}
                    checked={!!isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        addUtility(utility, "");
                      } else {
                        removeUtility(utility);
                      }
                    }}
                    data-testid={`checkbox-${utility}`}
                  />
                  <Label htmlFor={utility} className="text-sm capitalize">
                    {utility}
                  </Label>
                </div>
              );
            })}
          </div>

          {selectedUtilities.length > 0 && (
            <div className="mt-4 space-y-3">
              <Label className="text-sm font-medium">Set Prices per Unit</Label>
              <div className="space-y-2">
                {selectedUtilities.map((utility) => (
                  <div key={utility.type} className="flex items-center gap-3 p-3 border rounded-lg">
                    <span className="capitalize min-w-[80px] text-sm">{utility.type}</span>
                    <Input
                      placeholder="Price per unit"
                      value={utility.price}
                      onChange={(e) => updateUtilityPrice(utility.type, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUtility(utility.type)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUtilities.length === 0 && (
            <p className="text-sm text-neutral-500 mt-2">
              Select utilities that will be charged separately per unit.
            </p>
          )}
        </div>

        <Card className="border-dashed">
          <CardContent className="p-4">
            {registeredUserId ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-primary hover:text-secondary"
                data-testid="button-add-property"
                onClick={onAddAnotherProperty}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Property
              </Button>
            ) : (
              <div className="text-center text-neutral-500">
                <p className="text-sm">Complete this property first to add more properties</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StepForm>
  );
}
