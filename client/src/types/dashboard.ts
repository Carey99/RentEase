// Dashboard Types and Interfaces

export interface PropertyType {
  type: string;
  price: string;
  units: number;
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
    lastPaymentAmount?: number;
    currentMonthPaid?: boolean;
    paidForMonth?: number;
    paidForYear?: number;
    nextDueDate?: string;
    daysRemaining?: number;
    rentStatus: 'active' | 'overdue' | 'grace_period' | 'paid' | 'partial';
    advancePaymentDays?: number;
    advancePaymentMonths?: number;
    debtAmount?: number;
    monthsOwed?: number;
    isNewTenant?: boolean;
    hasPartialPayment?: boolean;
    partialPaymentInfo?: {
      amountPaid: number;
      expectedAmount: number;
      remainingBalance: number;
      paymentDate: string;
    };
  };
}
