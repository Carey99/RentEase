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

        // CRITICAL: Clear any old user data before storing new user
        // This prevents showing wrong user's dashboard due to stale localStorage
        localStorage.removeItem('rentease_user');
        localStorage.removeItem('currentUser');
        
        // Store new user data in localStorage for dashboard access
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

        try {
          await createPropertyMutation.mutateAsync(propertyData);
          console.log('Property created successfully');
        } catch (propertyError) {
          console.error('Property creation failed:', propertyError);
          
          // If user was just registered, still redirect to dashboard
          // They can add properties later from the dashboard
          if (!isAddingAnotherProperty && registeredUserId) {
            toast({
              title: "Registration successful!",
              description: "You can add properties from your dashboard",
            });
            setLocation(`/dashboard/${role}`);
            return; // Exit early to prevent further execution
          }
          
          // If adding another property failed, re-throw to show error
          throw propertyError;
        }
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
        
        try {
          await createTenantPropertyMutation.mutateAsync({
            tenantId: userId,
            propertyId: data.propertyId,
            propertyType: data.propertyType,
            unitNumber: data.unitNumber,
            rentAmount: selectedType?.price || "0",
          });
          
          console.log('Tenant property created successfully');
        } catch (tenantError) {
          console.error('Tenant property assignment failed:', tenantError);
          
          // If user was just registered, still redirect to dashboard
          // They can be assigned to a property later by their landlord
          if (!isAddingAnotherProperty && registeredUserId) {
            toast({
              title: "Registration successful!",
              description: "Please contact your landlord to complete property assignment",
            });
            setLocation(`/dashboard/${role}`);
            return; // Exit early to prevent further execution
          }
          
          // Re-throw to show error
          throw tenantError;
        }
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
      
      // Check if this is a "User already exists" error - means registration succeeded before
      const errorMessage = error instanceof Error ? error.message : "";
      const isUserAlreadyExists = errorMessage.toLowerCase().includes("already exists");
      
      if (isUserAlreadyExists && !isAddingAnotherProperty) {
        // User was created in a previous attempt, redirect to dashboard
        toast({
          title: "Account already exists",
          description: "Logging you into your account...",
        });
        
        // Store user data if we have it
        if (formData.email) {
          // We don't have the full user data, so try to get it from registration attempt
          // For now, just redirect - the dashboard will handle missing data
          setLocation(`/dashboard/${role}`);
        } else {
          setLocation('/signin');
        }
      } else {
        // Show error for other failures
        toast({
          title: isAddingAnotherProperty ? "Property creation failed" : "Registration failed",
          description: errorMessage || "Something went wrong during registration",
          variant: "destructive",
        });
      }
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
