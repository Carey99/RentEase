import { Plus, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Property } from "@/types/dashboard";

interface PropertyListViewProps {
  properties: Property[];
  setSelectedProperty: (property: Property) => void;
  setShowAddPropertyDialog: (show: boolean) => void;
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
        <h2 className="text-xl font-semibold text-neutral-900">Your Properties</h2>
        <Button 
          className="bg-primary hover:bg-secondary" 
          data-testid="button-add-property" 
          onClick={() => setShowAddPropertyDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No properties yet</h3>
            <p className="text-neutral-600 mb-6">Get started by adding your first rental property.</p>
            <Button 
              className="bg-primary hover:bg-secondary" 
              data-testid="button-add-first-property" 
              onClick={() => setShowAddPropertyDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property: any) => (
            <Card key={property.id} className="overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400" 
                alt={`${property.name} exterior`}
                className="w-full h-48 object-cover"
              />
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{property.name}</h3>
                <p className="text-neutral-600 text-sm mb-4">
                  {property.propertyTypes?.length || 0} unit type(s) available
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-sm text-neutral-600">Active</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-secondary"
                    onClick={() => handleViewProperty(property)}
                  >
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
