import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
  propertyType: z.string().min(1, "Property type is required"),
  utilities: z.object({
    electricity: z.boolean().optional(),
    water: z.boolean().optional(),
    garbage: z.boolean().optional(),
    security: z.boolean().optional(),
    internet: z.boolean().optional(),
    other: z.boolean().optional(),
  }).optional(),
});

const tenantPropertySchema = z.object({
  apartmentName: z.string().min(1, "Apartment name is required"),
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

  const role = params?.role as 'landlord' | 'tenant';

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: "Welcome to RentEase",
      });
      setLocation(`/dashboard/${role}`);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/properties', data);
      return response.json();
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
      propertyType: "",
      utilities: {},
    } : {
      apartmentName: "",
      unitNumber: "",
    },
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
    const userData = {
      ...formData,
      role,
    };

    try {
      const registerResponse = await registerMutation.mutateAsync(userData);
      
      if (role === 'landlord') {
        await createPropertyMutation.mutateAsync({
          landlordId: registerResponse.user.id,
          name: data.propertyName,
          type: data.propertyType,
          utilities: data.utilities,
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const goBack = () => {
    setLocation('/');
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
              description="Tell us about your rental property."
              form={propertyForm}
              onSubmit={onPropertySubmit}
              showBack
              onBack={previousStep}
              submitText="Complete Setup"
              submitIcon={<Check />}
              isLoading={registerMutation.isPending}
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
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select onValueChange={(value) => propertyForm.setValue("propertyType", value)}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="bedsitter">Bedsitter</SelectItem>
                      <SelectItem value="1bedroom">1 Bedroom</SelectItem>
                      <SelectItem value="2bedroom">2 Bedroom</SelectItem>
                      <SelectItem value="3bedroom">3 Bedroom</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {propertyForm.formState.errors.propertyType && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.propertyType.message}
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
              description="Search for your registered apartment."
              form={propertyForm}
              onSubmit={onPropertySubmit}
              showBack
              onBack={previousStep}
              submitText="Complete Setup"
              submitIcon={<Check />}
              isLoading={registerMutation.isPending}
              data-testid="form-tenant-property"
            >
              <div className="space-y-6">
                <div>
                  <Label htmlFor="apartmentName">Apartment Name</Label>
                  <Input
                    id="apartmentName"
                    {...propertyForm.register("apartmentName")}
                    placeholder="Search apartment name..."
                    data-testid="input-apartment-name"
                  />
                  {propertyForm.formState.errors.apartmentName && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.apartmentName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="unitNumber">Unit Number / House Number</Label>
                  <Select onValueChange={(value) => propertyForm.setValue("unitNumber", value)}>
                    <SelectTrigger data-testid="select-unit-number">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="101">Unit 101</SelectItem>
                      <SelectItem value="102">Unit 102</SelectItem>
                      <SelectItem value="201">Unit 201</SelectItem>
                      <SelectItem value="202">Unit 202</SelectItem>
                    </SelectContent>
                  </Select>
                  {propertyForm.formState.errors.unitNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {propertyForm.formState.errors.unitNumber.message}
                    </p>
                  )}
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs">i</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900">Can't find your apartment?</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Ask your landlord to register the property first, then you can join.
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
