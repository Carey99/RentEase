import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ManualTenantMatchDialog } from './ManualTenantMatchDialog';

interface TransactionMatch {
  id: string;
  transaction: {
    receiptNo: string;
    completionTime: string;
    senderName: string;
    senderPhone: string;
    amount: number;
  };
  matchedTenant?: {
    tenantId: string;
    tenantName: string;
    tenantPhone: string;
    propertyName?: string;
    unitNumber?: string;
    phoneScore: number;
    nameScore: number;
    amountScore: number;
    overallScore: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  status: string;
}

interface MpesaStatementReviewTableProps {
  statementId: string;
  matches: TransactionMatch[];
}

export function MpesaStatementReviewTable({ statementId, matches }: MpesaStatementReviewTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [manualMatchDialogOpen, setManualMatchDialogOpen] = useState(false);
  const [selectedMatchForManual, setSelectedMatchForManual] = useState<TransactionMatch | null>(null);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const approveMutation = useMutation({
    mutationFn: async ({ matchId, notes }: { matchId: string; notes?: string }) => {
      const response = await fetch(`/api/mpesa/matches/${matchId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to approve match');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mpesa/statements/${statementId}`] });
      toast({ title: 'Match Approved', description: 'Payment has been recorded successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to approve match', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ matchId, notes }: { matchId: string; notes?: string }) => {
      const response = await fetch(`/api/mpesa/matches/${matchId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to reject match');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mpesa/statements/${statementId}`] });
      toast({ title: 'Match Rejected', description: 'Transaction has been marked as rejected' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reject match', variant: 'destructive' });
    },
  });

  const manualMatchMutation = useMutation({
    mutationFn: async ({ matchId, tenantId }: { matchId: string; tenantId: string }) => {
      const response = await fetch(`/api/mpesa/matches/${matchId}/manual-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId }),
      });
      if (!response.ok) throw new Error('Failed to manually match tenant');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mpesa/statements/${statementId}`] });
      toast({ title: 'Match Created', description: 'Transaction manually matched to tenant. You can now approve it.' });
      setManualMatchDialogOpen(false);
      setSelectedMatchForManual(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to manually match tenant', variant: 'destructive' });
    },
  });

  const handleManualMatch = (tenantId: string) => {
    if (selectedMatchForManual) {
      manualMatchMutation.mutate({ 
        matchId: selectedMatchForManual.id, 
        tenantId
      });
    }
  };

  const openManualMatchDialog = (match: TransactionMatch) => {
    setSelectedMatchForManual(match);
    setManualMatchDialogOpen(true);
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
      none: 'destructive',
    };

    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-800 hover:bg-green-100',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      low: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
      none: 'bg-red-100 text-red-800 hover:bg-red-100',
    };

    return (
      <Badge variant={variants[confidence]} className={colors[confidence]}>
        {Math.round((confidence === 'high' ? 90 : confidence === 'medium' ? 80 : confidence === 'low' ? 65 : 0))}%
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string, className?: string }> = {
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      manual: { variant: 'secondary', label: 'Manual Match', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      pending: { variant: 'outline', label: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Retrieved from PDF</TableHead>
            <TableHead className="w-[200px]">Matched Tenant</TableHead>
            <TableHead className="w-[100px]">Amount</TableHead>
            <TableHead className="w-[120px]">Confidence</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => {
            const isExpanded = expandedRows.has(match.id);
            const hasMatch = !!match.matchedTenant;
            const isPending = match.status === 'pending';

            return (
              <React.Fragment key={match.id}>
                <TableRow className={isPending ? '' : 'bg-muted/50'}>
                  {/* Retrieved from PDF */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{match.transaction.senderName}</div>
                      <div className="text-xs text-muted-foreground">{match.transaction.senderPhone}</div>
                      <div className="text-xs text-muted-foreground">
                        Receipt: {match.transaction.receiptNo}
                      </div>
                    </div>
                  </TableCell>

                  {/* Matched Tenant */}
                  <TableCell>
                    {hasMatch ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-sm">{match.matchedTenant!.tenantName}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {match.matchedTenant!.tenantPhone}
                        </div>
                        {match.matchedTenant!.propertyName && (
                          <div className="text-xs text-muted-foreground">
                            {match.matchedTenant!.propertyName}
                            {match.matchedTenant!.unitNumber && ` - ${match.matchedTenant!.unitNumber}`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <X className="h-3 w-3 text-red-600" />
                        <span className="text-sm">No match found</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Amount */}
                  <TableCell>
                    <div className="font-medium">KSH {match.transaction.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(match.transaction.completionTime).toLocaleDateString()}
                    </div>
                  </TableCell>

                  {/* Confidence */}
                  <TableCell>
                    {hasMatch ? (
                      <div className="space-y-1">
                        {getConfidenceBadge(match.matchedTenant!.confidence)}
                        {isExpanded && (
                          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                            <div>Phone: {Math.round(match.matchedTenant!.phoneScore)}%</div>
                            <div>Name: {Math.round(match.matchedTenant!.nameScore)}%</div>
                            <div>Amount: {Math.round(match.matchedTenant!.amountScore)}%</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="destructive">0%</Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {isPending || match.status === 'manual' ? (
                      <div className="flex items-center justify-end gap-2">
                        {hasMatch && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate({ matchId: match.id, notes: notes[match.id] })}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {!hasMatch && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => openManualMatchDialog(match)}
                            disabled={manualMatchMutation.isPending}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Manual Match
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate({ matchId: match.id, notes: notes[match.id] })}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRow(match.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : (
                      getStatusBadge(match.status)
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30">
                      <div className="py-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="font-medium mb-1">Transaction Details</div>
                            <div className="text-muted-foreground space-y-1">
                              <div>Time: {new Date(match.transaction.completionTime).toLocaleTimeString()}</div>
                              <div>Receipt: {match.transaction.receiptNo}</div>
                            </div>
                          </div>
                          {hasMatch && (
                            <div>
                              <div className="font-medium mb-1">Match Breakdown</div>
                              <div className="text-muted-foreground space-y-1">
                                <div>Phone Match: {Math.round(match.matchedTenant!.phoneScore)}%</div>
                                <div>Name Similarity: {Math.round(match.matchedTenant!.nameScore)}%</div>
                                <div>Amount Match: {Math.round(match.matchedTenant!.amountScore)}%</div>
                                <div className="font-medium">Overall: {Math.round(match.matchedTenant!.overallScore)}%</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {isPending && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                            <Textarea
                              placeholder="Add any notes about this transaction..."
                              value={notes[match.id] || ''}
                              onChange={(e) => setNotes({ ...notes, [match.id]: e.target.value })}
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Manual Match Dialog */}
      {selectedMatchForManual && (
        <ManualTenantMatchDialog
          open={manualMatchDialogOpen}
          onOpenChange={setManualMatchDialogOpen}
          transactionDetails={{
            senderName: selectedMatchForManual.transaction.senderName,
            senderPhone: selectedMatchForManual.transaction.senderPhone,
            amount: selectedMatchForManual.transaction.amount,
            receiptNo: selectedMatchForManual.transaction.receiptNo,
          }}
          onMatch={handleManualMatch}
          isLoading={manualMatchMutation.isPending}
        />
      )}
    </div>
  );
}
