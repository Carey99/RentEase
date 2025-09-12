import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DeleteTenantDialog from "./DeleteTenantDialog";
import type { Tenant } from "@/types/dashboard";

interface TenantActionsProps {
  tenant: Tenant;
  onViewDetails: (tenant: Tenant) => void;
  onTenantDeleted?: () => void;
}

export default function TenantActions({ 
  tenant, 
  onViewDetails, 
  onTenantDeleted 
}: TenantActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleRemoveTenant = () => {
    setShowDeleteDialog(true);
  };

  const handleTenantDeleted = () => {
    setShowDeleteDialog(false);
    onTenantDeleted?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDetails(tenant)}>
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem>
            Send Message
          </DropdownMenuItem>
          <DropdownMenuItem>
            Edit Lease
          </DropdownMenuItem>
          <DropdownMenuItem>
            View Payments
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-600"
            onClick={handleRemoveTenant}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteTenantDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        tenant={tenant}
        onTenantDeleted={handleTenantDeleted}
      />
    </>
  );
}
