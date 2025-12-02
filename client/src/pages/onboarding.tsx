import { useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonalInfoStep } from "@/components/onboarding/steps/PersonalInfoStep";
import { PasswordStep } from "@/components/onboarding/steps/PasswordStep";
import { LandlordPropertyStep } from "@/components/onboarding/steps/LandlordPropertyStep";
import { TenantPropertyStep } from "@/components/onboarding/steps/TenantPropertyStep";
import { UtilitiesStep } from "@/components/onboarding/steps/UtilitiesStep";
import { 
  useOnboardingForms,
  useOnboardingState,
  usePropertyManagement,
  useOnboardingMutations,
  usePropertyQueries
} from "@/hooks/onboarding/useOnboarding";
import { useOnboardingLogic } from "@/hooks/onboarding/useOnboardingLogic";
import { getMotivationalContent, getBackgroundImage } from "@/lib/onboarding-utils";
import type { UserRole } from "@/types/onboarding";

export default function OnboardingPage() {
  const [, params] = useRoute("/onboarding/:role");
  const role = params?.role as UserRole;

  // Initialize all hooks
  const state = useOnboardingState();
  const forms = useOnboardingForms(role);
  const propertyManagement = usePropertyManagement();
  const mutations = useOnboardingMutations();
  const queries = usePropertyQueries(role, state.currentStep, forms.propertyForm.watch("propertyId"));

  // Business logic
  const logic = useOnboardingLogic({
    role,
    formData: forms.formData,
    setFormData: forms.setFormData,
    selectedPropertyTypes: state.selectedPropertyTypes,
    selectedUtilities: state.selectedUtilities,
    showCustomType: state.showCustomType,
    isAddingAnotherProperty: state.isAddingAnotherProperty,
    registeredUserId: state.registeredUserId,
    setRegisteredUserId: state.setRegisteredUserId,
    registerMutation: mutations.registerMutation,
    createPropertyMutation: mutations.createPropertyMutation,
    createTenantPropertyMutation: mutations.createTenantPropertyMutation,
    propertyTypes: queries.propertyTypes,
    resetForNewProperty: state.resetForNewProperty,
    propertyForm: forms.propertyForm,
    setCurrentStep: state.setCurrentStep,
  });

  // Property management functions with state
  const propertyMgmt = {
    addPropertyType: propertyManagement.addPropertyType(state.selectedPropertyTypes, state.setSelectedPropertyTypes),
    removePropertyType: propertyManagement.removePropertyType(state.selectedPropertyTypes, state.setSelectedPropertyTypes),
    updatePropertyTypePrice: propertyManagement.updatePropertyTypePrice(state.selectedPropertyTypes, state.setSelectedPropertyTypes),
    updatePropertyTypeUnits: propertyManagement.updatePropertyTypeUnits(state.selectedPropertyTypes, state.setSelectedPropertyTypes),
    addUtility: propertyManagement.addUtility(state.selectedUtilities, state.setSelectedUtilities),
    removeUtility: propertyManagement.removeUtility(state.selectedUtilities, state.setSelectedUtilities),
    updateUtilityPrice: propertyManagement.updateUtilityPrice(state.selectedUtilities, state.setSelectedUtilities),
  };

  const getStepContent = () => {
    switch (state.currentStep) {
      case 1:
        if (state.isAddingAnotherProperty) {
          return (
            <LandlordPropertyStep
              form={forms.propertyForm}
              onSubmit={state.nextStep}
              onBack={state.previousStep}
              selectedPropertyTypes={state.selectedPropertyTypes}
              addPropertyType={propertyMgmt.addPropertyType}
              removePropertyType={propertyMgmt.removePropertyType}
              updatePropertyTypePrice={propertyMgmt.updatePropertyTypePrice}
              updatePropertyTypeUnits={propertyMgmt.updatePropertyTypeUnits}
              showCustomType={state.showCustomType}
              setShowCustomType={state.setShowCustomType}
              isAddingAnotherProperty={state.isAddingAnotherProperty}
            />
          );
        }
        
        return (
          <PersonalInfoStep
            form={forms.personalInfoForm}
            onSubmit={(data) => {
              logic.onPersonalInfoSubmit(data);
              state.nextStep();
            }}
            isAddingAnotherProperty={state.isAddingAnotherProperty}
          />
        );

      case 2:
        return (
          <PasswordStep
            form={forms.passwordForm}
            onSubmit={(data) => {
              logic.onPasswordSubmit(data);
              state.nextStep();
            }}
            onBack={state.previousStep}
            showPassword={state.showPassword}
            setShowPassword={state.setShowPassword}
            showConfirmPassword={state.showConfirmPassword}
            setShowConfirmPassword={state.setShowConfirmPassword}
          />
        );

      case 3:
        if (role === 'landlord') {
          return (
            <LandlordPropertyStep
              form={forms.propertyForm}
              onSubmit={state.nextStep}
              onBack={state.previousStep}
              selectedPropertyTypes={state.selectedPropertyTypes}
              addPropertyType={propertyMgmt.addPropertyType}
              removePropertyType={propertyMgmt.removePropertyType}
              updatePropertyTypePrice={propertyMgmt.updatePropertyTypePrice}
              updatePropertyTypeUnits={propertyMgmt.updatePropertyTypeUnits}
              showCustomType={state.showCustomType}
              setShowCustomType={state.setShowCustomType}
              isAddingAnotherProperty={state.isAddingAnotherProperty}
            />
          );
        } else {
          return (
            <TenantPropertyStep
              form={forms.propertyForm}
              onSubmit={logic.onPropertySubmit}
              onBack={state.previousStep}
              availableProperties={queries.availableProperties}
              propertyTypes={queries.propertyTypes}
              selectedPropertyId={forms.propertyForm.watch("propertyId")}
              isLoading={mutations.registerMutation.isPending || mutations.createTenantPropertyMutation.isPending}
            />
          );
        }

      case 4:
        if (role === 'landlord') {
          return (
            <UtilitiesStep
              form={forms.propertyForm}
              onSubmit={logic.onPropertySubmit}
              onBack={state.previousStep}
              selectedUtilities={state.selectedUtilities}
              addUtility={propertyMgmt.addUtility}
              removeUtility={propertyMgmt.removeUtility}
              updateUtilityPrice={propertyMgmt.updateUtilityPrice}
              onAddAnotherProperty={logic.handleAddAnotherProperty}
              registeredUserId={state.registeredUserId}
              isAddingAnotherProperty={state.isAddingAnotherProperty}
              isLoading={mutations.registerMutation.isPending || mutations.createPropertyMutation.isPending}
            />
          );
        } else {
          return null; // Tenants don't have a step 4
        }

      default:
        return null;
    }
  };

  const motivationalContent = getMotivationalContent(state.currentStep);
  const maxSteps = role === 'landlord' ? 4 : 3;

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="max-w-md w-full">
          {/* Logo and Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-neutral-900">RentEase</span>
            </div>
            <Button
              variant="ghost"
              onClick={logic.goBack}
              className="text-neutral-500 hover:text-neutral-700"
              data-testid="button-back-to-landing"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-neutral-500">
                Step {state.currentStep} of {maxSteps}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(state.currentStep / maxSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          {getStepContent()}
        </div>
      </div>

      {/* Right Side - Motivational Content */}
      <div className="flex-1 relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/50"></div>
        <img 
          src={getBackgroundImage(state.currentStep)}
          alt="Onboarding background" 
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-8 max-w-md">
            <div className="text-6xl mb-6 opacity-90">
              {motivationalContent.icon}
            </div>
            <h2 className="text-3xl font-bold mb-4">{motivationalContent.title}</h2>
            <p className="text-lg opacity-90">{motivationalContent.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
