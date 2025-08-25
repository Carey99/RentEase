import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { 
  UserRole, 
  PropertyType, 
  Utility, 
  OnboardingFormData 
} from "@/types/onboarding";

interface UseOnboardingLogicProps {
  role: UserRole;
  formData: OnboardingFormData;
  setFormData: (data: OnboardingFormData) => void;
  selectedPropertyTypes: PropertyType[];
  selectedUtilities: Utility[];
  showCustomType: boolean;
  isAddingAnotherProperty: boolean;
  registeredUserId: string | null;
  setRegisteredUserId: (id: string | null) => void;
  registerMutation: any;
  createPropertyMutation: any;
  createTenantPropertyMutation: any;
  propertyTypes: any[];
  resetForNewProperty: () => void;
  propertyForm: any;
  setCurrentStep: (step: number) => void;
}

export function useOnboardingLogic({
  role,
  formData,
  setFormData,
  selectedPropertyTypes,
  selectedUtilities,
  showCustomType,
  isAddingAnotherProperty,
  registeredUserId,
  setRegisteredUserId,
  registerMutation,
  createPropertyMutation,
  createTenantPropertyMutation,
  propertyTypes,
  resetForNewProperty,
  propertyForm,
  setCurrentStep
}: UseOnboardingLogicProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const onPersonalInfoSubmit = (data: any) => {
    setFormData({ ...formData, ...data });
  };

  const onPasswordSubmit = (data: any) => {
    setFormData({ ...formData, password: data.password });
  };

  const onPropertySubmit = async (data: any) => {
    console.log('=== FORM SUBMISSION START ===');
    console.log('Form data:', data);
    console.log('Selected property types:', selectedPropertyTypes);
    console.log('Form data accumulated:', formData);
    console.log('Role:', role);
    console.log('Is adding another property:', isAddingAnotherProperty);

    // Manual validation for landlord property types
    if (role === 'landlord') {
      if (selectedPropertyTypes.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one property type",
          variant: "destructive",
        });
        return;
      }

      const hasEmptyPrices = selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "");
      if (hasEmptyPrices) {
        toast({
          title: "Validation Error", 
          description: "Please enter prices for all selected property types",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      let userId = registeredUserId;

      // Register user only if not already registered (first property)
      if (!isAddingAnotherProperty) {
        const userData = {
          ...formData,
          role,
        };

        console.log('User data to register:', userData);
        console.log('Starting registration...');
        const registerResponse = await registerMutation.mutateAsync(userData);
        console.log('Registration response:', registerResponse);
        
        userId = registerResponse.user.id;
        setRegisteredUserId(userId);

        // Store user data in localStorage for dashboard access
        localStorage.setItem('rentease_user', JSON.stringify({
          id: registerResponse.user.id,
          name: registerResponse.user.fullName,
          email: registerResponse.user.email,
          role: registerResponse.user.role
        }));
      }
      
      if (role === 'landlord') {
        // Combine selected property types with custom type if provided
        let allPropertyTypes = [...selectedPropertyTypes];
        if (showCustomType && data.customType && data.customPrice) {
          allPropertyTypes.push({
            type: data.customType,
            price: data.customPrice
          });
        }

        console.log('Creating property with types:', allPropertyTypes);

        const propertyData = {
          landlordId: userId,
          name: data.propertyName,
          propertyTypes: allPropertyTypes,
          utilities: selectedUtilities,
        };

        console.log('Property data to create:', propertyData);

        await createPropertyMutation.mutateAsync(propertyData);
        console.log('Property created successfully');
      } else if (role === 'tenant') {
        // Find the selected property type details
        const selectedType = propertyTypes.find((pt: any) => pt.type === data.propertyType);
        
        console.log('Creating tenant property with data:', {
          tenantId: userId,
          propertyId: data.propertyId,
          propertyType: data.propertyType,
          unitNumber: data.unitNumber,
          rentAmount: selectedType?.price || "0",
        });
        
        await createTenantPropertyMutation.mutateAsync({
          tenantId: userId,
          propertyId: data.propertyId,
          propertyType: data.propertyType,
          unitNumber: data.unitNumber,
          rentAmount: selectedType?.price || "0",
        });
        
        console.log('Tenant property created successfully');
      }

      // Success - redirect to dashboard
      console.log('Registration complete, redirecting...');
      
      toast({
        title: isAddingAnotherProperty ? "Property added successfully!" : "Registration successful!",
        description: isAddingAnotherProperty ? 
          `${data.propertyName} has been added to your properties.` :
          `Welcome to RentEase${role === 'tenant' ? '. You have been assigned to your apartment!' : ''}`,
      });
      setLocation(`/dashboard/${role}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: isAddingAnotherProperty ? "Property creation failed" : "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong during registration",
        variant: "destructive",
      });
    }
  };

  const handleAddAnotherProperty = async () => {
    if (!registeredUserId) {
      toast({
        title: "Complete Current Property First",
        description: "Please finish setting up your current property before adding another one.",
        variant: "destructive",
      });
      return;
    }

    // Get current form data
    const currentPropertyData = propertyForm.getValues();
    
    // Validate current property data
    if (!currentPropertyData.propertyName) {
      toast({
        title: "Validation Error",
        description: "Please enter a property name before adding another property",
        variant: "destructive",
      });
      return;
    }

    if (selectedPropertyTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one property type before adding another property",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyPrices = selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "");
    if (hasEmptyPrices) {
      toast({
        title: "Validation Error", 
        description: "Please enter prices for all selected property types before adding another property",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save the current property
      let allPropertyTypes = [...selectedPropertyTypes];
      if (showCustomType && currentPropertyData.customType && currentPropertyData.customPrice) {
        allPropertyTypes.push({
          type: currentPropertyData.customType,
          price: currentPropertyData.customPrice
        });
      }

      const propertyData = {
        landlordId: registeredUserId,
        name: currentPropertyData.propertyName,
        propertyTypes: allPropertyTypes,
        utilities: selectedUtilities,
      };

      await createPropertyMutation.mutateAsync(propertyData);
      
      toast({
        title: "Property Added",
        description: `${currentPropertyData.propertyName} has been saved successfully!`,
      });

      // Reset form for new property
      resetForNewProperty();
      propertyForm.reset({
        propertyName: "",
        customType: "",
        customPrice: "",
      });

    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Property creation failed",
        description: error instanceof Error ? error.message : "Failed to save property",
        variant: "destructive",
      });
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  return {
    onPersonalInfoSubmit,
    onPasswordSubmit,
    onPropertySubmit,
    handleAddAnotherProperty,
    goBack,
  };
}
