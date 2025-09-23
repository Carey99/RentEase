import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  totalUnits?: string;
  occupiedUnits?: string;
}

interface PropertySelectorProps {
  properties: Property[];
  selectedPropertyId: string;
  onPropertyChange: (propertyId: string) => void;
  placeholder?: string;
  includeAllOption?: boolean;
  isLoading?: boolean;
  className?: string;
}

export default function PropertySelector({
  properties,
  selectedPropertyId,
  onPropertyChange,
  placeholder = "Select a property",
  includeAllOption = true,
  isLoading = false,
  className
}: PropertySelectorProps) {
  return (
    <div className={`flex items-center space-x-3 ${className || ''}`}>
      <Building2 className="h-5 w-5 text-neutral-600" />
      <Select
        value={selectedPropertyId}
        onValueChange={onPropertyChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder={isLoading ? "Loading properties..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All Properties</SelectItem>
          )}
          {properties.length > 0 ? (
            properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{property.name}</span>
                  {property.totalUnits && (
                    <span className="text-xs text-neutral-500 ml-2">
                      {property.occupiedUnits || '0'}/{property.totalUnits} units
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-properties" disabled>
              No properties found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}