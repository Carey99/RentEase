import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  personalInfoSchema, 
  passwordSchema, 
  landlordPropertySchema, 
  tenantPropertySchema 
} from "@/lib/onboarding-schemas";
import type { 
  UserRole, 
  PropertyType, 
  Utility, 
  OnboardingFormData 
} from "@/types/onboarding";

export function useOnboardingForms(role: UserRole) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<OnboardingFormData>({});

  // Personal Info Form
  const personalInfoForm = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: formData.fullName || "",
      email: formData.email || "",
    },
  });

  // Password Form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: formData.password || "",
      confirmPassword: "",
    },
  });

  // Property Form
  const propertyForm = useForm({
    resolver: zodResolver(role === 'landlord' ? landlordPropertySchema : tenantPropertySchema),
    defaultValues: role === 'landlord' ? {
      propertyName: "",
      customType: "",
      customPrice: "",
    } : {
      propertyId: "",
      propertyType: "",
      unitNumber: "",
    },
    mode: 'onChange',
  });

  return {
    formData,
    setFormData,
    personalInfoForm,
    passwordForm,
    propertyForm,
    toast,
  };
}

export function useOnboardingState() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedUtilities, setSelectedUtilities] = useState<Utility[]>([]);
  const [showCustomType, setShowCustomType] = useState(false);
  const [isAddingAnotherProperty, setIsAddingAnotherProperty] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const nextStep = () => {
    const maxSteps = 4; // Will be determined by role in parent component
    if (currentStep < maxSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetForNewProperty = () => {
    setIsAddingAnotherProperty(true);
    setCurrentStep(1);
    setSelectedPropertyTypes([]);
    setSelectedUtilities([]);
    setShowCustomType(false);
  };

  return {
    currentStep,
    setCurrentStep,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    selectedPropertyTypes,
    setSelectedPropertyTypes,
    selectedUtilities,
    setSelectedUtilities,
    showCustomType,
    setShowCustomType,
    isAddingAnotherProperty,
    setIsAddingAnotherProperty,
    registeredUserId,
    setRegisteredUserId,
    nextStep,
    previousStep,
    resetForNewProperty,
  };
}

export function usePropertyManagement() {
  const addPropertyType = (
    selectedTypes: PropertyType[], 
    setSelectedTypes: (types: PropertyType[]) => void
  ) => (type: string, price: string) => {
    if (!selectedTypes.find(pt => pt.type === type)) {
      setSelectedTypes([...selectedTypes, { type, price }]);
    }
  };

  const removePropertyType = (
    selectedTypes: PropertyType[], 
    setSelectedTypes: (types: PropertyType[]) => void
  ) => (typeToRemove: string) => {
    setSelectedTypes(selectedTypes.filter(pt => pt.type !== typeToRemove));
  };

  const updatePropertyTypePrice = (
    selectedTypes: PropertyType[], 
    setSelectedTypes: (types: PropertyType[]) => void
  ) => (type: string, newPrice: string) => {
    setSelectedTypes(selectedTypes.map(pt => 
      pt.type === type ? { ...pt, price: newPrice } : pt
    ));
  };

  const addUtility = (
    selectedUtilities: Utility[], 
    setSelectedUtilities: (utilities: Utility[]) => void
  ) => (type: string, price: string) => {
    if (!selectedUtilities.find(ut => ut.type === type)) {
      setSelectedUtilities([...selectedUtilities, { type, price }]);
    }
  };

  const removeUtility = (
    selectedUtilities: Utility[], 
    setSelectedUtilities: (utilities: Utility[]) => void
  ) => (typeToRemove: string) => {
    setSelectedUtilities(selectedUtilities.filter(ut => ut.type !== typeToRemove));
  };

  const updateUtilityPrice = (
    selectedUtilities: Utility[], 
    setSelectedUtilities: (utilities: Utility[]) => void
  ) => (type: string, newPrice: string) => {
    setSelectedUtilities(selectedUtilities.map(ut => 
      ut.type === type ? { ...ut, price: newPrice } : ut
    ));
  };

  return {
    addPropertyType,
    removePropertyType,
    updatePropertyTypePrice,
    addUtility,
    removeUtility,
    updateUtilityPrice,
  };
}

export function useOnboardingMutations() {
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createTenantPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/tenant-properties', data);
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Property assignment failed",
        description: error.message || "Failed to assign apartment",
        variant: "destructive",
      });
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating property with data:', data);
      const response = await apiRequest('POST', '/api/properties', data);
      const result = await response.json();
      console.log('Property creation response:', result);
      return result;
    },
    onError: (error: any) => {
      console.error('Property creation error:', error);
      toast({
        title: "Property creation failed",
        description: error.message || "Failed to create property",
        variant: "destructive",
      });
    },
  });

  return {
    registerMutation,
    createTenantPropertyMutation,
    createPropertyMutation,
  };
}

export function usePropertyQueries(role: UserRole, currentStep: number, selectedPropertyId?: string) {
  // Query to get available properties for tenant selection
  const { data: availableProperties = [] } = useQuery({
    queryKey: ['/api/properties/search'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/properties/search?name=');
      return response.json();
    },
    enabled: Boolean(role === 'tenant' && currentStep === 3),
  });

  // Query to get property types for selected property
  const { data: propertyTypes = [] } = useQuery({
    queryKey: ['/api/properties', selectedPropertyId, 'types'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/properties/${selectedPropertyId}/types`);
      return response.json();
    },
    enabled: Boolean(role === 'tenant' && currentStep === 3 && selectedPropertyId && selectedPropertyId !== "no-properties"),
  });

  return {
    availableProperties,
    propertyTypes,
  };
}
