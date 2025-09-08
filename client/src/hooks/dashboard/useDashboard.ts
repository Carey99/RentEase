import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { 
  CurrentUser, 
  Property, 
  PropertyType, 
  Utility, 
  NewPropertyForm,
  PropertyEditState,
  PropertyFormState 
} from "@/types/dashboard";

export function useCurrentUser(): CurrentUser | null {
  const getCurrentUser = () => {
    try {
      // Try both keys for compatibility
      let userData = localStorage.getItem('rentease_user');
      if (!userData) {
        userData = localStorage.getItem('currentUser');
      }
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  return getCurrentUser();
}

export function useDashboardState() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);

  return {
    selectedProperty,
    setSelectedProperty,
    showAddPropertyDialog,
    setShowAddPropertyDialog,
  };
}

export function usePropertyEditState(): PropertyEditState & {
  setEditingPropertyTypes: (types: PropertyType[]) => void;
  setEditingUtilities: (utilities: Utility[]) => void;
  setNewPropertyType: (type: PropertyType) => void;
  setNewUtility: (utility: Utility) => void;
  resetEditingState: () => void;
} {
  const [editingPropertyTypes, setEditingPropertyTypes] = useState<PropertyType[]>([]);
  const [editingUtilities, setEditingUtilities] = useState<Utility[]>([]);
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>({ type: '', price: '' });
  const [newUtility, setNewUtility] = useState<Utility>({ type: '', price: '' });

  const resetEditingState = () => {
    setEditingPropertyTypes([]);
    setEditingUtilities([]);
    setNewPropertyType({ type: '', price: '' });
    setNewUtility({ type: '', price: '' });
  };

  return {
    editingPropertyTypes,
    setEditingPropertyTypes,
    editingUtilities,
    setEditingUtilities,
    newPropertyType,
    setNewPropertyType,
    newUtility,
    setNewUtility,
    resetEditingState,
  };
}

export function usePropertyFormState(): PropertyFormState & {
  setNewPropertyForm: (form: NewPropertyForm) => void;
  setTempPropertyType: (type: PropertyType) => void;
  setTempUtility: (utility: Utility) => void;
  resetNewPropertyForm: () => void;
} {
  const [newPropertyForm, setNewPropertyForm] = useState<NewPropertyForm>({
    propertyName: '',
    propertyTypes: [],
    utilities: []
  });
  const [tempPropertyType, setTempPropertyType] = useState<PropertyType>({ type: '', price: '' });
  const [tempUtility, setTempUtility] = useState<Utility>({ type: '', price: '' });

  const resetNewPropertyForm = () => {
    setNewPropertyForm({
      propertyName: '',
      propertyTypes: [],
      utilities: []
    });
    setTempPropertyType({ type: '', price: '' });
    setTempUtility({ type: '', price: '' });
  };

  return {
    newPropertyForm,
    setNewPropertyForm,
    tempPropertyType,
    setTempPropertyType,
    tempUtility,
    setTempUtility,
    resetNewPropertyForm,
  };
}

export function usePropertiesQuery(currentUser: CurrentUser | null) {
  return useQuery({
    queryKey: ['/api/properties/landlord', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/properties/landlord/${currentUser?.id}`);
      return response.json();
    },
    enabled: !!currentUser?.id,
  });
}

export function usePropertyMutations(currentUser: CurrentUser | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: any) => {
      const response = await apiRequest('POST', '/api/properties', propertyData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Property created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties/landlord', currentUser?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ propertyId, ...updateData }: { propertyId: string; [key: string]: any }) => {
      const response = await apiRequest('PUT', `/api/properties/${propertyId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Property updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties/landlord', currentUser?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    },
  });

  return {
    createPropertyMutation,
    updatePropertyMutation,
  };
}

export function useTenantsQuery(currentUser: CurrentUser | null) {
  return useQuery({
    queryKey: ['/api/tenants/landlord', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tenants/landlord/${currentUser?.id}`);
      return response.json();
    },
    enabled: !!currentUser?.id && currentUser.role === 'landlord',
  });
}

export function useAuthRedirect(currentUser: CurrentUser | null) {
  const [, setLocation] = useLocation();

  // Only redirect if we're sure there's no user data
  if (!currentUser) {
    console.log('No user data found, redirecting to landing...');
    setLocation('/');
    return;
  }
}

export function useDashboard() {
  const currentUser = useCurrentUser();
  const propertiesQuery = usePropertiesQuery(currentUser);
  const { createPropertyMutation, updatePropertyMutation } = usePropertyMutations(currentUser);
  const tenantsQuery = useTenantsQuery(currentUser);

  return {
    currentUser,
    properties: propertiesQuery.data || [],
    propertiesQuery,
    createPropertyMutation,
    updatePropertyMutation,
    tenants: tenantsQuery.data || [],
    tenantsQuery,
  };
}
