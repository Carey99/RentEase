/**
 * Manual Tenant Match Dialog
 * Allows landlord to manually match an M-Pesa transaction to a specific tenant
 */

import { useState, useMemo } from 'react';
import { Search, User, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/dashboard/useDashboard';

interface Tenant {
  id: number;
  name: string;
  phone: string;
  email: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
}

interface ManualTenantMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDetails: {
    senderName: string;
    senderPhone: string;
    amount: number;
    receiptNo: string;
  };
  onMatch: (tenantId: string) => void;
  isLoading?: boolean;
}

export function ManualTenantMatchDialog({
  open,
  onOpenChange,
  transactionDetails,
  onMatch,
  isLoading = false,
}: ManualTenantMatchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const currentUser = useCurrentUser();

  // Fetch all tenants for this landlord
  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: [`/api/tenants/landlord/${currentUser?.id}`],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/tenants/landlord/${currentUser.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
    enabled: open && !!currentUser?.id,
  });

  // Filter tenants based on search query
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;

    const query = searchQuery.toLowerCase();
    return tenants.filter(
      (tenant) =>
        (tenant.name && tenant.name.toLowerCase().includes(query)) ||
        (tenant.phone && tenant.phone.includes(query)) ||
        (tenant.email && tenant.email.toLowerCase().includes(query)) ||
        (tenant.unitNumber && tenant.unitNumber.toLowerCase().includes(query)) ||
        (tenant.propertyName && tenant.propertyName.toLowerCase().includes(query))
    );
  }, [tenants, searchQuery]);

  const selectedTenant = tenants.find((t) => t.id.toString() === selectedTenantId);

  const handleMatch = () => {
    if (selectedTenantId) {
      onMatch(selectedTenantId);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedTenantId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manual Tenant Match</DialogTitle>
          <DialogDescription>
            Select which tenant this payment belongs to. This is useful when a relative or someone else paid on behalf of the tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Tenants */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Tenants</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, phone, unit, or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tenant List */}
          <div className="space-y-2">
            <Label>Select Tenant ({filteredTenants.length} found)</Label>
            <ScrollArea className="h-[400px] border rounded-lg">
              {loadingTenants ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading tenants...
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No tenants found matching your search' : 'No tenants available'}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredTenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => setSelectedTenantId(tenant.id.toString())}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTenantId === tenant.id.toString()
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{tenant.name}</span>
                            {selectedTenantId === tenant.id.toString() && (
                              <Badge variant="default" className="ml-auto">Selected</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <div>📱 {tenant.phone}</div>
                            {tenant.propertyName && (
                              <div className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {tenant.propertyName}
                                {tenant.unitNumber && ` - Unit ${tenant.unitNumber}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedTenantId || isLoading}
          >
            {isLoading ? 'Matching...' : 'Match & Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
