import { useToast } from "@/hooks/use-toast";
import type { 
  Property, 
  PropertyType, 
  Utility, 
  NewPropertyForm,
  CurrentUser 
} from "@/types/dashboard";

interface UsePropertyActionsProps {
  setSelectedProperty: (property: Property | null) => void;
  setIsEditing: (editing: boolean) => void;
  setEditingPropertyTypes: (types: PropertyType[]) => void;
  setEditingUtilities: (utilities: Utility[]) => void;
  setNewPropertyType: (type: PropertyType) => void;
  setNewUtility: (utility: Utility) => void;
  selectedProperty: Property | null;
  editingPropertyTypes: PropertyType[];
  editingUtilities: Utility[];
  newPropertyType: PropertyType;
  newUtility: Utility;
  updatePropertyMutation: any;
}

export function usePropertyActions({
  setSelectedProperty,
  setIsEditing,
  setEditingPropertyTypes,
  setEditingUtilities,
  setNewPropertyType,
  setNewUtility,
  selectedProperty,
  editingPropertyTypes,
  editingUtilities,
  newPropertyType,
  newUtility,
  updatePropertyMutation,
}: UsePropertyActionsProps) {
  const { toast } = useToast();

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setEditingPropertyTypes(property.propertyTypes || []);
    setEditingUtilities(property.utilities || []);
  };

  const handleBackToList = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setEditingPropertyTypes([]);
    setNewPropertyType({ type: '', price: '' });
    setEditingUtilities([]);
    setNewUtility({ type: '', price: '' });
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditingPropertyTypes(selectedProperty?.propertyTypes || []);
    setNewPropertyType({ type: '', price: '' });
    setEditingUtilities(selectedProperty?.utilities || []);
    setNewUtility({ type: '', price: '' });
  };

  const handleSaveChanges = () => {
    if (selectedProperty) {
      updatePropertyMutation.mutate({
        propertyId: selectedProperty.id,
        propertyTypes: editingPropertyTypes,
        utilities: editingUtilities
      });
    }
  };

  const handleUpdatePropertyType = (index: number, field: 'type' | 'price', value: string) => {
    const updated = [...editingPropertyTypes];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPropertyTypes(updated);
  };

  const handleRemovePropertyType = (index: number) => {
    const updated = editingPropertyTypes.filter((_, i) => i !== index);
    setEditingPropertyTypes(updated);
  };

  const handleAddPropertyType = () => {
    if (newPropertyType.type && newPropertyType.price) {
      setEditingPropertyTypes([...editingPropertyTypes, newPropertyType]);
      setNewPropertyType({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both property type and price",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUtility = (index: number, field: 'type' | 'price', value: string) => {
    const updated = [...editingUtilities];
    updated[index] = { ...updated[index], [field]: value };
    setEditingUtilities(updated);
  };

  const handleRemoveUtility = (index: number) => {
    const updated = editingUtilities.filter((_, i) => i !== index);
    setEditingUtilities(updated);
  };

  const handleAddUtility = () => {
    if (newUtility.type && newUtility.price) {
      setEditingUtilities([...editingUtilities, newUtility]);
      setNewUtility({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both utility type and price",
        variant: "destructive",
      });
    }
  };

  return {
    handleViewProperty,
    handleBackToList,
    handleStartEditing,
    handleCancelEditing,
    handleSaveChanges,
    handleUpdatePropertyType,
    handleRemovePropertyType,
    handleAddPropertyType,
    handleUpdateUtility,
    handleRemoveUtility,
    handleAddUtility,
  };
}

interface UsePropertyFormActionsProps {
  newPropertyForm: NewPropertyForm;
  setNewPropertyForm: (form: NewPropertyForm) => void;
  tempPropertyType: PropertyType;
  setTempPropertyType: (type: PropertyType) => void;
  tempUtility: Utility;
  setTempUtility: (utility: Utility) => void;
  currentUser: CurrentUser;
  createPropertyMutation: any;
  setShowAddPropertyDialog: (show: boolean) => void;
  resetNewPropertyForm: () => void;
}

export function usePropertyFormActions({
  newPropertyForm,
  setNewPropertyForm,
  tempPropertyType,
  setTempPropertyType,
  tempUtility,
  setTempUtility,
  currentUser,
  createPropertyMutation,
  setShowAddPropertyDialog,
  resetNewPropertyForm,
}: UsePropertyFormActionsProps) {
  const { toast } = useToast();

  const handleAddPropertyTypeToNew = () => {
    if (tempPropertyType.type && tempPropertyType.price) {
      setNewPropertyForm({
        ...newPropertyForm,
        propertyTypes: [...newPropertyForm.propertyTypes, tempPropertyType]
      });
      setTempPropertyType({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both property type and price",
        variant: "destructive",
      });
    }
  };

  const handleRemovePropertyTypeFromNew = (index: number) => {
    setNewPropertyForm({
      ...newPropertyForm,
      propertyTypes: newPropertyForm.propertyTypes.filter((_, i) => i !== index)
    });
  };

  const handleAddUtilityToNew = () => {
    if (tempUtility.type && tempUtility.price) {
      setNewPropertyForm({
        ...newPropertyForm,
        utilities: [...newPropertyForm.utilities, tempUtility]
      });
      setTempUtility({ type: '', price: '' });
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter both utility type and price",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUtilityFromNew = (index: number) => {
    setNewPropertyForm({
      ...newPropertyForm,
      utilities: newPropertyForm.utilities.filter((_, i) => i !== index)
    });
  };

  const handleCreateProperty = () => {
    if (!newPropertyForm.propertyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a property name",
        variant: "destructive",
      });
      return;
    }

    if (newPropertyForm.propertyTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one property type",
        variant: "destructive",
      });
      return;
    }

    const propertyData = {
      landlordId: currentUser.id,
      name: newPropertyForm.propertyName,
      propertyTypes: newPropertyForm.propertyTypes,
      utilities: newPropertyForm.utilities,
    };

    createPropertyMutation.mutate(propertyData, {
      onSuccess: () => {
        setShowAddPropertyDialog(false);
        resetNewPropertyForm();
      }
    });
  };

  return {
    handleAddPropertyTypeToNew,
    handleRemovePropertyTypeFromNew,
    handleAddUtilityToNew,
    handleRemoveUtilityFromNew,
    handleCreateProperty,
  };
}
