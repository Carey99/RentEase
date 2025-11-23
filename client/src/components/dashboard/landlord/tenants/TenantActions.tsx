import { useState } from "react";
import { MoreHorizontal, Trash2, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
  const [sendingReminder, setSendingReminder] = useState(false);
  const { toast } = useToast();

  const handleRemoveTenant = () => {
    setShowDeleteDialog(true);
  };

  const handleTenantDeleted = () => {
    setShowDeleteDialog(false);
    onTenantDeleted?.();
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const response = await fetch(`/api/emails/send-reminder/${tenant.id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reminder');
      }

      const data = await response.json();
      toast({
        title: 'Reminder Sent! ✅',
        description: `Rent reminder email sent to ${tenant.name}`,
      });
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder email',
        variant: 'destructive',
      });
    } finally {
      setSendingReminder(false);
    }
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
          <DropdownMenuItem 
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Rent Reminder
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
