import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepForm from "@/components/onboarding/step-form";
import type { UseFormReturn } from "react-hook-form";

interface PersonalInfoStepProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isAddingAnotherProperty: boolean;
}

export function PersonalInfoStep({ form, onSubmit, isAddingAnotherProperty }: PersonalInfoStepProps) {
  if (isAddingAnotherProperty) {
    return null; // Skip this step when adding another property
  }

  return (
    <StepForm
      title="Welcome to RentEase!"
      description="Let's start with your basic information."
      form={form}
      onSubmit={onSubmit}
      data-testid="form-personal-info"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            {...form.register("fullName")}
            placeholder="John Doe"
            data-testid="input-fullname"
          />
          {form.formState.errors.fullName && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.fullName.message as string}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="john@example.com"
            data-testid="input-email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.email.message as string}
            </p>
          )}
        </div>
      </div>
    </StepForm>
  );
}
