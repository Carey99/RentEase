import { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepFormProps {
  title: string;
  description: string;
  children: ReactNode;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  showBack?: boolean;
  onBack?: () => void;
  submitText?: string;
  submitIcon?: ReactNode;
  isLoading?: boolean;
  submitDisabled?: boolean;
  "data-testid"?: string;
}

export default function StepForm({
  title,
  description,
  children,
  form,
  onSubmit,
  showBack,
  onBack,
  submitText = "Continue",
  submitIcon = <ArrowRight className="ml-2 h-4 w-4" />,
  isLoading = false,
  submitDisabled = false,
  "data-testid": testId,
}: StepFormProps) {
  return (
    <div className="step-form" data-testid={testId}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h2>
        <p className="text-neutral-600">{description}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {children}

        <div className={`flex ${showBack ? 'space-x-3' : ''}`}>
          {showBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          
          <Button
            type="submit"
            className={`${showBack ? 'flex-1' : 'w-full'} bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200`}
            disabled={isLoading || submitDisabled}
            data-testid="button-submit"
          >
            {isLoading ? "Processing..." : submitText}
            {!isLoading && submitIcon}
          </Button>
        </div>
      </form>
    </div>
  );
}
