import { Plus, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Property } from "@/types/dashboard";

interface PropertyListViewProps {
  properties: Property[];
  setSelectedProperty: (property: Property) => void;
  setShowAddPropertyDialog: (show: boolean) => void;
}

// Curated pool of high-quality property images
const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=400&fit=crop", // Modern apartment interior
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop", // Luxury apartment building
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop", // Bright apartment living room
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=400&fit=crop", // Modern apartment complex
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=400&fit=crop", // Beautiful home exterior
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop", // Contemporary house
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=400&fit=crop", // Modern apartments
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=400&fit=crop", // Residential building
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=400&fit=crop", // House with garden
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&h=400&fit=crop", // Apartment building facade
];

// Simple hash function to consistently map property ID to an image
function getPropertyImage(propertyId: string): string {
  let hash = 0;
  for (let i = 0; i < propertyId.length; i++) {
    hash = ((hash << 5) - hash) + propertyId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % PROPERTY_IMAGES.length;
  return PROPERTY_IMAGES[index];
}

export default function PropertyListView({ 
  properties, 
  setSelectedProperty, 
  setShowAddPropertyDialog 
}: PropertyListViewProps) {
  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Your Properties</h2>
        <Button 
          className="bg-primary hover:bg-primary/90" 
          data-testid="button-add-property" 
          onClick={() => setShowAddPropertyDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/60 dark:border-slate-700 p-12 text-center">
          <Building className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No properties yet</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">Get started by adding your first rental property.</p>
          <Button 
            className="bg-primary hover:bg-primary/90" 
            data-testid="button-add-first-property" 
            onClick={() => setShowAddPropertyDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {properties.map((property: any) => (
            <div 
              key={property.id} 
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/60 dark:border-slate-700 overflow-hidden hover:border-neutral-300 dark:hover:border-slate-600 transition-all cursor-pointer"
              onClick={() => handleViewProperty(property)}
            >
              <div className="relative overflow-hidden">
                <img 
                  src={getPropertyImage(property.id)} 
                  alt={`${property.name}`}
                  className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">{property.name}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {property.propertyTypes?.length || 0} unit type(s) available
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full"></span>
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Active</span>
                  </div>
                </div>
                
                <button 
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProperty(property);
                  }}
                >
                  Manage →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
