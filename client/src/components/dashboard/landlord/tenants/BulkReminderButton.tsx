import { useState } from "react";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Tenant } from "@/types/dashboard";

interface BulkReminderButtonProps {
  tenants: Tenant[];
}

interface ReminderResult {
  tenantId: string;
  tenantName: string;
  success: boolean;
  error?: string;
}

export default function BulkReminderButton({ tenants }: BulkReminderButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<ReminderResult[]>([]);
  const { toast } = useToast();

  // Get tenants that should receive reminders (not paid or overdue)
  const eligibleTenants = tenants.filter(tenant => 
    tenant.rentCycle?.rentStatus && 
    ['active', 'grace_period', 'overdue'].includes(tenant.rentCycle.rentStatus)
  );

  const handleSendBulkReminders = async () => {
    setSending(true);
    setResults([]);

    try {
      const tenantIds = eligibleTenants.map(t => t.id);
      
      const response = await fetch('/api/emails/send-bulk-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reminders');
      }

      const data = await response.json();
      
      // Map results with tenant names
      const mappedResults: ReminderResult[] = data.results.map((result: any) => {
        const tenant = eligibleTenants.find(t => t.id === result.tenantId);
        return {
          tenantId: result.tenantId,
          tenantName: tenant?.name || 'Unknown',
          success: result.success,
          error: result.error,
        };
      });

      setResults(mappedResults);

      const successCount = mappedResults.filter(r => r.success).length;
      const failCount = mappedResults.filter(r => !r.success).length;

      toast({
        title: 'Reminders Sent',
        description: `${successCount} reminders sent successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
    } catch (error: any) {
      console.error('Error sending bulk reminders:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminders',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (eligibleTenants.length === 0) {
    return null; // Don't show button if no eligible tenants
  }

  return (
    <>
      <Button 
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="border-primary text-primary hover:bg-primary/10"
      >
        <Mail className="mr-2 h-4 w-4" />
        Send Bulk Reminders ({eligibleTenants.length})
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Bulk Rent Reminders</DialogTitle>
            <DialogDescription>
              Send rent reminder emails to all tenants with pending or overdue payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {results.length === 0 ? (
              <>
                <div className="text-sm text-neutral-600">
                  <p className="mb-2">Reminder emails will be sent to:</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {eligibleTenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex items-center justify-between p-2 bg-neutral-50 rounded"
                      >
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-neutral-500">{tenant.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tenant.rentCycle?.rentStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm">
                  <p className="mb-2 font-medium">Results:</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {results.map((result, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 bg-neutral-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{result.tenantName}</p>
                            {result.error && (
                              <p className="text-xs text-red-600">{result.error}</p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={result.success ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {result.success ? 'Sent' : 'Failed'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            {results.length === 0 ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDialog(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendBulkReminders}
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send {eligibleTenants.length} Reminder{eligibleTenants.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => {
                setShowDialog(false);
                setResults([]);
              }}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
