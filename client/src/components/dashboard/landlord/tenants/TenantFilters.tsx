import { Search, Filter, Grid3x3, List, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Property } from "@/types/dashboard";

interface TenantFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: "all" | "active" | "pending" | "inactive";
  onFilterChange: (status: "all" | "active" | "pending" | "inactive") => void;
  filterProperty: string;
  onFilterPropertyChange: (propertyId: string) => void;
  properties: Property[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function TenantFilters({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  filterProperty,
  onFilterPropertyChange,
  properties,
  viewMode,
  onViewModeChange
}: TenantFiltersProps) {
  const selectedProperty = properties.find(p => p.id === filterProperty);
  
  return (
    <div className="flex items-center gap-3 mb-6">
      {/* Property Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 border-neutral-300">
            <Building2 className="mr-2 h-4 w-4" />
            {filterProperty === "all" ? "All Properties" : selectedProperty?.name || "Property"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => onFilterPropertyChange("all")}>
            All Properties
          </DropdownMenuItem>
          {properties.map((property) => (
            <DropdownMenuItem 
              key={property.id} 
              onClick={() => onFilterPropertyChange(property.id)}
            >
              {property.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 border-neutral-300">
            <Filter className="mr-2 h-4 w-4" />
            {filterStatus === "all" ? "All" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onFilterChange("all")}>
            All
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilterChange("active")}>
            Active
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilterChange("pending")}>
            Pending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onFilterChange("inactive")}>
            Inactive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Mode Toggle */}
      <div className="flex border border-neutral-300 rounded-md overflow-hidden ml-auto">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("grid")}
          className="rounded-none h-9 px-3"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("list")}
          className="rounded-none h-9 px-3"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
