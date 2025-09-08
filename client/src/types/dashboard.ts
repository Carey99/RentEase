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
  unitType: string;
  rentAmount: number;
  status: 'active' | 'inactive' | 'pending';
  leaseStart: string;
  leaseEnd: string;
  avatar?: string;
}
