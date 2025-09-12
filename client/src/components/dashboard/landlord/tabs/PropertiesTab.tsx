import { useState } from "react";
import { Plus, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyDetailView, PropertyListView } from "@/components/dashboard/landlord/properties";
import type { Property } from "@/types/dashboard";

interface PropertiesTabProps {
  properties: Property[];
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  setShowAddPropertyDialog: (show: boolean) => void;
}

export default function PropertiesTab({ 
  properties, 
  selectedProperty, 
  setSelectedProperty, 
  setShowAddPropertyDialog 
}: PropertiesTabProps) {
  // If a property is selected, show property details
  if (selectedProperty) {
    return (
      <PropertyDetailView 
        selectedProperty={selectedProperty}
        setSelectedProperty={setSelectedProperty}
      />
    );
  }

  // Default properties list view
  return (
    <PropertyListView 
      properties={properties}
      setSelectedProperty={setSelectedProperty}
      setShowAddPropertyDialog={setShowAddPropertyDialog}
    />
  );
}
