import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TenantFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: "all" | "active" | "pending" | "inactive";
  onFilterChange: (status: "all" | "active" | "pending" | "inactive") => void;
}

export default function TenantFilters({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange
}: TenantFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
        <Input
          placeholder="Search tenants by name, email, or property..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Status: {filterStatus === "all" ? "All" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onFilterChange("all")}>
              All Tenants
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
      </div>
    </div>
  );
}
