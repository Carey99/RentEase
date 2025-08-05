import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import StepForm from "@/components/onboarding/step-form";

const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const landlordPropertySchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  customType: z.string().optional(),
  customPrice: z.string().optional(),
  utilities: z.object({
    electricity: z.boolean().optional(),
    water: z.boolean().optional(),
    garbage: z.boolean().optional(),
    security: z.boolean().optional(),
    internet: z.boolean().optional(),
    other: z.boolean().optional(),
  }).optional(),
}).refine((data) => {
  // Custom validation will be handled separately for property types
  return true;
}, {
  message: "Property validation failed",
});

const tenantPropertySchema = z.object({
  propertyId: z.string().min(1, "Please select a property").refine(val => val !== "no-properties", "Please select a valid property"),
  propertyType: z.string().min(1, "Please select a property type"),
  unitNumber: z.string().min(1, "Unit number is required"),
});

export default function OnboardingPage() {
  const [, params] = useRoute("/onboarding/:role");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<Array<{type: string, price: string}>>([]);
  const [showCustomType, setShowCustomType] = useState(false);

  const role = params?.role as 'landlord' | 'tenant';

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

  const personalInfoForm = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      fullName: formData.fullName || "",
      email: formData.email || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: formData.password || "",
      confirmPassword: "",
    },
  });

  const propertyForm = useForm({
    resolver: zodResolver(role === 'landlord' ? landlordPropertySchema : tenantPropertySchema),
    defaultValues: role === 'landlord' ? {
      propertyName: "",
      customType: "",
      customPrice: "",
      utilities: {},
    } : {
      propertyId: "",
      propertyType: "",
      unitNumber: "",
    },
    mode: 'onChange', // Enable validation on change
  });

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
  const selectedPropertyId = propertyForm.watch("propertyId");
  const { data: propertyTypes = [] } = useQuery({
    queryKey: ['/api/properties', selectedPropertyId, 'types'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/properties/${selectedPropertyId}/types`);
      return response.json();
    },
    enabled: Boolean(role === 'tenant' && currentStep === 3 && selectedPropertyId && selectedPropertyId !== "no-properties"),
  });

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onPersonalInfoSubmit = (data: any) => {
    setFormData({ ...formData, ...data });
    nextStep();
  };

  const onPasswordSubmit = (data: any) => {
    setFormData({ ...formData, password: data.password });
    nextStep();
  };

  const onPropertySubmit = async (data: any) => {
    console.log('=== FORM SUBMISSION START ===');
    console.log('Form data:', data);
    console.log('Selected property types:', selectedPropertyTypes);
    console.log('Form data accumulated:', formData);
    console.log('Role:', role);

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

    const userData = {
      ...formData,
      role,
    };

    console.log('User data to register:', userData);

    try {
      console.log('Starting registration...');
      const registerResponse = await registerMutation.mutateAsync(userData);
      console.log('Registration response:', registerResponse);
      
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
          landlordId: registerResponse.user.id,
          name: data.propertyName,
          propertyTypes: allPropertyTypes,
          utilities: data.utilities,
        };

        console.log('Property data to create:', propertyData);

        await createPropertyMutation.mutateAsync(propertyData);
        console.log('Property created successfully');
      } else if (role === 'tenant') {
        // Find the selected property type details
        const selectedType = propertyTypes.find((pt: any) => pt.type === data.propertyType);
        
        console.log('Creating tenant property with data:', {
          tenantId: registerResponse.user.id,
          propertyId: data.propertyId,
          propertyType: data.propertyType,
          unitNumber: data.unitNumber,
          rentAmount: selectedType?.price || "0",
        });
        
        await createTenantPropertyMutation.mutateAsync({
          tenantId: registerResponse.user.id,
          propertyId: data.propertyId,
          propertyType: data.propertyType,
          unitNumber: data.unitNumber,
          rentAmount: selectedType?.price || "0",
        });
        
        console.log('Tenant property created successfully');
      }

      // Success - redirect to dashboard
      console.log('Registration complete, redirecting...');
      
      // Store user data in localStorage for dashboard access
      localStorage.setItem('rentease_user', JSON.stringify({
        id: registerResponse.user.id,
        name: registerResponse.user.fullName,
        email: registerResponse.user.email,
        role: registerResponse.user.role
      }));
      
      toast({
        title: "Registration successful!",
        description: `Welcome to RentEase${role === 'tenant' ? '. You have been assigned to your apartment!' : ''}`,
      });
      setLocation(`/dashboard/${role}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong during registration",
        variant: "destructive",
      });
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  const addPropertyType = (type: string, price: string) => {
    if (!selectedPropertyTypes.find(pt => pt.type === type)) {
      setSelectedPropertyTypes([...selectedPropertyTypes, { type, price }]);
    }
  };

  const removePropertyType = (typeToRemove: string) => {
    setSelectedPropertyTypes(selectedPropertyTypes.filter(pt => pt.type !== typeToRemove));
  };

  const updatePropertyTypePrice = (type: string, newPrice: string) => {
    setSelectedPropertyTypes(selectedPropertyTypes.map(pt => 
      pt.type === type ? { ...pt, price: newPrice } : pt
    ));
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            title="Welcome to RentEase!"
            description="Let's start with your basic information."
            form={personalInfoForm}
            onSubmit={onPersonalInfoSubmit}
            data-testid="form-personal-info"
          >
            <div className="space-y-6">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...personalInfoForm.register("fullName")}
                  placeholder="John Doe"
                  data-testid="input-fullname"
                />
                {personalInfoForm.formState.errors.fullName && (
                  <p className="text-sm text-red-600 mt-1">
                    {personalInfoForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...personalInfoForm.register("email")}
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
                {personalInfoForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {personalInfoForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            title="Create Your Password"
            description="Choose a strong password to secure your account."
            form={passwordForm}
            onSubmit={onPasswordSubmit}
            showBack
            onBack={previousStep}
            data-testid="form-password"
          >
            <div className="space-y-6">
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...passwordForm.register("password")}
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
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    {...passwordForm.register("confirmPassword")}
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
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
          </StepForm>
        );

      case 3:
        if (role === 'landlord') {
          return (
            <StepForm
              title="Property Information"
              description="Tell us about your rental property and available unit types."
              form={propertyForm}
              onSubmit={(data) => {
                console.log('=== STEP FORM SUBMISSION ===');
                console.log('Raw form data from React Hook Form:', data);
                console.log('Form validation state:', propertyForm.formState);
                console.log('Form errors:', propertyForm.formState.errors);
                onPropertySubmit(data);
              }}
              showBack
              onBack={previousStep}
              submitText="Complete Setup"
              submitIcon={<Check />}
              isLoading={registerMutation.isPending || createPropertyMutation.isPending}
              submitDisabled={role === 'landlord' ? (selectedPropertyTypes.length === 0 || selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "")) : false}
              data-testid="form-landlord-property"
            >
              <div className="space-y-6">
                <div>
                  <Label htmlFor="propertyName">Property Name</Label>
                  <Input
                    id="propertyName"
                    {...propertyForm.register("propertyName")}
                    placeholder="Sunset Apartments"
                    data-testid="input-property-name"
                  />
                  {propertyForm.formState.errors.propertyName && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.propertyName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Property Types & Pricing</Label>
                  <p className="text-sm text-neutral-600 mb-4">Select the types of units available in your property and set their monthly rent prices.</p>
                  
                  {/* Standard Property Types */}
                  <div className="space-y-3 mb-4">
                    {[
                      { value: 'studio', label: 'Studio' },
                      { value: 'bedsitter', label: 'Bedsitter' },
                      { value: '1bedroom', label: '1 Bedroom' },
                      { value: '2bedroom', label: '2 Bedroom' },
                      { value: '3bedroom', label: '3 Bedroom' },
                      { value: '4bedroom', label: '4 Bedroom' }
                    ].map((typeOption) => {
                      const isSelected = selectedPropertyTypes.find(pt => pt.type === typeOption.value);
                      return (
                        <div key={typeOption.value} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={typeOption.value}
                              checked={!!isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  addPropertyType(typeOption.value, "");
                                } else {
                                  removePropertyType(typeOption.value);
                                }
                              }}
                              data-testid={`checkbox-${typeOption.value}`}
                            />
                            <Label htmlFor={typeOption.value} className="flex-1 font-medium">
                              {typeOption.label}
                            </Label>
                          </div>
                          
                          {isSelected && (
                            <div className="ml-6 animate-in slide-in-from-top-2 duration-200">
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`price-${typeOption.value}`} className="text-sm text-neutral-600 min-w-fit">
                                  Monthly Rent:
                                </Label>
                                <Input
                                  id={`price-${typeOption.value}`}
                                  type="number"
                                  placeholder="Enter price"
                                  value={isSelected.price}
                                  onChange={(e) => updatePropertyTypePrice(typeOption.value, e.target.value)}
                                  className="flex-1"
                                  data-testid={`price-${typeOption.value}`}
                                />
                                <span className="text-sm text-neutral-500 min-w-fit">KSH/month</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Property Type */}
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="custom-type"
                        checked={showCustomType}
                        onCheckedChange={(checked) => setShowCustomType(!!checked)}
                        data-testid="checkbox-custom-type"
                      />
                      <Label htmlFor="custom-type">Custom Property Type (5+ bedrooms)</Label>
                    </div>
                    
                    {showCustomType && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Input
                            placeholder="e.g., 5 Bedroom Villa"
                            {...propertyForm.register("customType")}
                            data-testid="input-custom-type"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="Monthly rent"
                            {...propertyForm.register("customPrice")}
                            data-testid="input-custom-price"
                          />
                          <span className="text-sm text-neutral-500">KSH</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Types Summary */}
                  {selectedPropertyTypes.length > 0 && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-green-900 mb-2">Selected Property Types:</h4>
                        <div className="space-y-1">
                          {selectedPropertyTypes.map((pt) => (
                            <div key={pt.type} className="flex justify-between text-sm">
                              <span className="text-green-800 capitalize">
                                {pt.type.replace('bedroom', ' Bedroom')}
                              </span>
                              <span className="text-green-700 font-medium">KSH {pt.price}/month</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedPropertyTypes.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Please select at least one property type
                    </p>
                  )}

                  {selectedPropertyTypes.length > 0 && selectedPropertyTypes.some(pt => !pt.price || pt.price.trim() === "") && (
                    <p className="text-sm text-red-600 mt-1">
                      Please enter prices for all selected property types
                    </p>
                  )}
                </div>

                <div>
                  <Label>Utility Bills Included</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {['electricity', 'water', 'garbage', 'security', 'internet', 'other'].map((utility) => (
                      <div key={utility} className="flex items-center space-x-2">
                        <Checkbox
                          id={utility}
                          onCheckedChange={(checked) => 
                            propertyForm.setValue(`utilities.${utility}` as any, checked)
                          }
                          data-testid={`checkbox-${utility}`}
                        />
                        <Label htmlFor={utility} className="text-sm capitalize">
                          {utility}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-primary hover:text-secondary"
                      data-testid="button-add-property"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Property
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </StepForm>
          );
        } else {
          return (
            <StepForm
              title="Find Your Apartment"
              description="Select your apartment from available properties."
              form={propertyForm}
              onSubmit={onPropertySubmit}
              showBack
              onBack={previousStep}
              submitText="Complete Setup"
              submitIcon={<Check />}
              isLoading={registerMutation.isPending || createTenantPropertyMutation.isPending}
              submitDisabled={!propertyForm.watch("propertyId") || propertyForm.watch("propertyId") === "no-properties" || !propertyForm.watch("propertyType") || !propertyForm.watch("unitNumber")}
              data-testid="form-tenant-property"
            >
              <div className="space-y-6">
                <div>
                  <Label htmlFor="propertyId">Select Property</Label>
                  <Select onValueChange={(value) => {
                    propertyForm.setValue("propertyId", value);
                    propertyForm.setValue("propertyType", ""); // Reset property type when property changes
                  }}>
                    <SelectTrigger data-testid="select-property">
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties.length > 0 ? (
                        availableProperties.map((property: any) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-properties" disabled>
                          No properties available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {propertyForm.formState.errors.propertyId && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.propertyId.message}
                    </p>
                  )}
                </div>

                {selectedPropertyId && selectedPropertyId !== "no-properties" && (
                  <div>
                    <Label htmlFor="propertyType">Select Unit Type</Label>
                    <Select onValueChange={(value) => propertyForm.setValue("propertyType", value)}>
                      <SelectTrigger data-testid="select-property-type">
                        <SelectValue placeholder="Choose unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.length > 0 ? (
                          propertyTypes.map((type: any) => (
                            <SelectItem key={type.type} value={type.type}>
                              <div className="flex justify-between items-center w-full">
                                <span className="capitalize">
                                  {type.type.replace('bedroom', ' Bedroom')}
                                </span>
                                <span className="ml-4 text-sm text-neutral-600">
                                  KSH {type.price}/month
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-types" disabled>
                            No unit types available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {propertyForm.formState.errors.propertyType && (
                      <p className="text-sm text-red-600 mt-1">
                        {propertyForm.formState.errors.propertyType.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="unitNumber">Unit Number / House Number</Label>
                  <Input
                    id="unitNumber"
                    {...propertyForm.register("unitNumber")}
                    placeholder="e.g., 101, A1, House 5"
                    data-testid="input-unit-number"
                  />
                  {propertyForm.formState.errors.unitNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.unitNumber.message}
                    </p>
                  )}
                </div>

                {/* Show selected unit details */}
                {propertyForm.watch("propertyType") && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900">Selected Unit</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            {propertyTypes.find((pt: any) => pt.type === propertyForm.watch("propertyType"))?.type.replace('bedroom', ' Bedroom')} - 
                            KSH {propertyTypes.find((pt: any) => pt.type === propertyForm.watch("propertyType"))?.price}/month
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {availableProperties.length === 0 && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-800 font-medium mb-1">
                            No Properties Available
                          </p>
                          <p className="text-sm text-yellow-700">
                            Ask your landlord to register the property first, then you can join.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedPropertyId && selectedPropertyId !== "no-properties" && propertyTypes.length === 0 && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <div>
                          <p className="text-sm text-yellow-800 font-medium mb-1">
                            No Unit Types Available
                          </p>
                          <p className="text-sm text-yellow-700">
                            The landlord hasn't set up unit types for this property yet.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs">i</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900">Important</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You must be assigned to an apartment to access your tenant dashboard. 
                          Contact your landlord if you don't see your property listed.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </StepForm>
          );
        }

      default:
        return null;
    }
  };

  const getBackgroundImage = () => {
    switch (currentStep) {
      case 1:
        return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
      case 2:
        return "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
      case 3:
        return "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080";
      default:
        return "";
    }
  };

  const getMotivationalContent = () => {
    switch (currentStep) {
      case 1:
        return {
          icon: "👋",
          title: "Welcome Aboard!",
          description: "Join thousands of users who trust RentEase for their property management needs."
        };
      case 2:
        return {
          icon: "🔒",
          title: "Security First",
          description: "Your data is protected with enterprise-grade security. Sleep peacefully knowing your information is safe."
        };
      case 3:
        return {
          icon: "🏠",
          title: "Almost There!",
          description: "Just a few more details and you'll be ready to start managing your rental experience like a pro."
        };
      default:
        return {
          icon: "",
          title: "",
          description: ""
        };
    }
  };

  const motivationalContent = getMotivationalContent();

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
              onClick={goBack}
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
                Step {currentStep} of 3
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
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
          src={getBackgroundImage()}
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
