// Dashboard Types and Interfaces

export interface PropertyType {
  type: string;
  price: string;
}

export interface Utility {
  type: string;
  price: string;
}

export interface Property {
  id: string;
  name: string;
  propertyTypes: PropertyType[];
  utilities: Utility[];
  landlordId: string;
  rentSettings?: {
    paymentDay: number;
    gracePeriodDays: number;
  };
}

export interface NewPropertyForm {
  propertyName: string;
  propertyTypes: PropertyType[];
  utilities: Utility[];
}

export interface CurrentUser {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: string;
}

export interface DashboardState {
  activeTab: string;
  selectedProperty: Property | null;
  isEditing: boolean;
  showAddPropertyDialog: boolean;
}

export interface PropertyEditState {
  editingPropertyTypes: PropertyType[];
  newPropertyType: PropertyType;
  editingUtilities: Utility[];
  newUtility: Utility;
}

export interface PropertyFormState {
  newPropertyForm: NewPropertyForm;
  tempPropertyType: PropertyType;
  tempUtility: Utility;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyName: string;
  propertyAddress?: string; // Add this for property address
  unitType: string;
  unitNumber: string;
  rentAmount: number;
  monthlyRent?: number; // Alias for rentAmount for compatibility
  status: 'active' | 'inactive' | 'pending' | 'overdue';
  leaseStart: string;
  leaseEnd: string;
  avatar?: string;
  profileImage?: string; // Add this for avatar compatibility  
  rentCycle?: {
    lastPaymentDate?: string;
    nextDueDate?: string;
    daysRemaining?: number;
    rentStatus: 'active' | 'overdue' | 'grace_period';
  };
}
