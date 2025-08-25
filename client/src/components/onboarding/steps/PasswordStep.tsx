import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepForm from "@/components/onboarding/step-form";
import type { UseFormReturn } from "react-hook-form";

interface PasswordStepProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  onBack: () => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
}

export function PasswordStep({ 
  form, 
  onSubmit, 
  onBack, 
  showPassword, 
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword 
}: PasswordStepProps) {
  return (
    <StepForm
      title="Create Your Password"
      description="Choose a strong password to secure your account."
      form={form}
      onSubmit={onSubmit}
      showBack
      onBack={onBack}
      data-testid="form-password"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
              placeholder="Enter your password"
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.password.message as string}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              {...form.register("confirmPassword")}
              placeholder="Confirm your password"
              data-testid="input-confirm-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              data-testid="button-toggle-confirm-password"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">
              {form.formState.errors.confirmPassword.message as string}
            </p>
          )}
        </div>
      </div>
    </StepForm>
  );
}
