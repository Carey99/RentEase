import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/hooks/dashboard/useDashboard";
import type { Tenant } from "@/types/dashboard";

interface DeleteTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onTenantDeleted?: () => void;
}

export default function DeleteTenantDialog({
  open,
  onOpenChange,
  tenant,
  onTenantDeleted
}: DeleteTenantDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { tenantsQuery } = useDashboard();

  // Confirm and delete tenant from database
  const handleConfirmDelete = async () => {
    if (!tenant) return;
    
    setIsDeleting(true);
    try {
      // Send DELETE request to remove tenant and their credentials
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      toast({
        title: "Tenant Removed",
        description: `${tenant.name} and their login credentials have been permanently deleted.`,
      });

      // Refresh tenant list
      tenantsQuery.refetch();
      
      // Close dialog and notify parent
      onOpenChange(false);
      onTenantDeleted?.();
      
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: "Error",
        description: "Failed to remove tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel delete operation
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Tenant - Proceed with Caution</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to permanently delete <span className="font-semibold">{tenant?.name}</span> from your property management system.
            </p>
            <p>
              <strong>This action will:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
              <li>Remove all tenant information and records</li>
              <li>Delete their login credentials permanently</li>
              <li>Remove them from the property: {tenant?.propertyName}</li>
              <li>Cannot be undone</li>
            </ul>
            <p className="text-red-600 font-medium mt-3">
              Are you sure you want to proceed?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Removing..." : "Yes, Remove Tenant"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
