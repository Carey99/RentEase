// Onboarding Types and Interfaces

export type UserRole = 'landlord' | 'tenant';

export interface PropertyType {
  type: string;
  price: string;
}

export interface Utility {
  type: string;
  price: string;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface PasswordInfo {
  password: string;
  confirmPassword: string;
}

export interface LandlordPropertyInfo {
  propertyName: string;
  customType?: string;
  customPrice?: string;
}

export interface TenantPropertyInfo {
  propertyId: string;
  propertyType: string;
  unitNumber: string;
}

export interface OnboardingFormData {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
}

export interface MotivationalContent {
  icon: string;
  title: string;
  description: string;
}

export interface StepContentProps {
  role: UserRole;
  currentStep: number;
  isAddingAnotherProperty: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: (data: any) => void;
  formData: OnboardingFormData;
  setFormData: (data: OnboardingFormData) => void;
}
