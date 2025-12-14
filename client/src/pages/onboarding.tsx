import { useEffect } from "react";
import { useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
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
  const { theme } = useTheme();

  // CRITICAL: Clear any existing session when starting registration
  // This prevents new users from seeing old user's data
  useEffect(() => {
    console.log('🧹 Clearing any existing session for new registration');
    localStorage.removeItem('rentease_user');
    localStorage.removeItem('currentUser');
    
    // Also clear session cookie by calling logout endpoint
    fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include' 
    }).catch(err => {
      // Ignore errors - session might not exist
      console.log('Session clear attempt (may not exist):', err.message);
    });
  }, []);

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
  const IconComponent = motivationalContent.icon;

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-white dark:bg-black">
        <div className="max-w-md w-full">
          {/* Logo and Back Button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <img 
                src={theme === 'dark' ? '/logos/rentease_dark_logo.png' : '/logos/re_light_logo.png'}
                alt="RentEase" 
                className="h-16 md:h-20 lg:h-24 object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                onClick={logic.goBack}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                data-testid="button-back-to-landing"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Step {state.currentStep} of {maxSteps}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2">
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
      <div className="flex-1 relative hidden lg:block overflow-hidden">
        {/* Background Image */}
        <img 
          src={getBackgroundImage(state.currentStep)}
          alt="Onboarding background" 
          className="w-full h-full object-cover"
        />
        
        {/* Left-to-Right Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center">
          <div className="text-white p-12 max-w-xl">
            {/* Icon with backdrop */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8">
              <IconComponent className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            
            {/* Headline with accent */}
            <h2 className="text-5xl font-bold mb-3 leading-tight">
              <span className="text-white drop-shadow-lg">
                {motivationalContent.title}
              </span>
              {' '}
              <span className="text-primary drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
                {motivationalContent.subtitle}
              </span>
            </h2>
            
            {/* Description with better contrast */}
            <p className="text-lg text-gray-100 leading-relaxed drop-shadow-md max-w-lg">
              {motivationalContent.description}
            </p>
            
            {/* Visual accent line */}
            <div className="mt-6 w-20 h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
