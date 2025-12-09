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
    return null;
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
          <Label htmlFor="fullName" className="mb-1.5 block">Full Name</Label>
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
          <Label htmlFor="email" className="mb-1.5 block">Email Address</Label>
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

        <div>
          <Label htmlFor="phone" className="mb-1.5 block">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            {...form.register("phone")}
            placeholder="0712345678"
            data-testid="input-phone"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.phone.message as string}
            </p>
          )}
        </div>
      </div>
    </StepForm>
  );
}
