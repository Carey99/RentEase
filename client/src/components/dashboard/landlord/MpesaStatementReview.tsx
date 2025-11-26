/**
 * M-Pesa Statement Review Component
 * Shows transaction matches with confidence indicators
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MpesaStatementReviewTable } from './MpesaStatementReviewTable';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Phone,
  DollarSign,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
} from 'lucide-react';

interface Transaction {
  receiptNo: string;
  completionTime: string;
  date: string;
  details: string;
  senderPhone: string;
  senderPhoneLast3: string;
  senderName: string;
  amount: number;
  balance: number;
}

interface MatchedTenant {
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
  matchType: 'perfect' | 'good' | 'partial' | 'weak' | 'none';
}

interface TransactionMatch {
  id: string;
  transaction: Transaction;
  matchedTenant: MatchedTenant | null;
  alternativeMatches?: Array<{
    tenantId: string;
    tenantName: string;
    overallScore: number;
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'manual';
  reviewNotes?: string;
}

interface StatementDetails {
  statement: {
    id: string;
    fileName: string;
    uploadDate: string;
    statementPeriod: {
      start: string;
      end: string;
    };
    totalTransactions: number;
    matchedTransactions: number;
    status: string;
  };
  matches: TransactionMatch[];
}

const confidenceConfig = {
  high: { color: 'bg-green-500', textColor: 'text-green-700', label: 'High', icon: '🟢' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', label: 'Medium', icon: '🟡' },
  low: { color: 'bg-orange-500', textColor: 'text-orange-700', label: 'Low', icon: '🟠' },
  none: { color: 'bg-red-500', textColor: 'text-red-700', label: 'None', icon: '🔴' },
};

function TransactionMatchCard({ match, onApprove, onReject }: {
  match: TransactionMatch;
  onApprove: (matchId: string, notes?: string) => void;
  onReject: (matchId: string, notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(match.reviewNotes || '');
  const [showNotes, setShowNotes] = useState(false);

  const tx = match.transaction;
  const tenant = match.matchedTenant;
  const confidence = tenant ? confidenceConfig[tenant.confidence] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {tx.receiptNo}
              {match.status !== 'pending' && (
                <Badge variant={match.status === 'approved' ? 'default' : 'destructive'}>
                  {match.status}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {new Date(tx.date).toLocaleString()}
            </CardDescription>
          </div>
          
          {confidence && (
            <Badge variant="outline" className={confidence.textColor}>
              {confidence.icon} {confidence.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transaction Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">From</div>
            <div className="font-medium">{tx.senderName}</div>
            <div className="text-xs text-muted-foreground">{tx.senderPhone}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Amount</div>
            <div className="text-lg font-bold">KSH {tx.amount.toLocaleString()}</div>
          </div>
        </div>

        {/* Matched Tenant */}
        {tenant ? (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {tenant.tenantName}
              </div>
              <div className="text-sm text-muted-foreground">
                {tenant.overallScore.toFixed(1)}% match
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Property</div>
                <div>{tenant.propertyName || 'N/A'} {tenant.unitNumber && `- ${tenant.unitNumber}`}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Phone</div>
                <div>{tenant.tenantPhone}</div>
              </div>
            </div>

            {/* Matching Scores */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full h-auto py-1"
            >
              {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {expanded ? 'Hide' : 'Show'} Details
            </Button>

            {expanded && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-xs">
                  <span>Phone Match</span>
                  <span className="font-medium">{tenant.phoneScore}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Name Similarity</span>
                  <span className="font-medium">{tenant.nameScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Amount Match</span>
                  <span className="font-medium">{tenant.amountScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 border-t">
                  <span>Overall Score</span>
                  <span>{tenant.overallScore.toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* Alternative Matches */}
            {match.alternativeMatches && match.alternativeMatches.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Alternative matches found:</strong>
                  <ul className="mt-1 space-y-1">
                    {match.alternativeMatches.map((alt) => (
                      <li key={alt.tenantId}>
                        {alt.tenantName} ({alt.overallScore.toFixed(1)}%)
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              No matching tenant found for phone ending in {tx.senderPhoneLast3}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {match.status === 'pending' && (
          <div className="space-y-2">
            {showNotes && (
              <Textarea
                placeholder="Add review notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
                rows={2}
              />
            )}
            
            <div className="flex gap-2">
              {tenant && (
                <Button
                  onClick={() => onApprove(match.id, notes)}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              <Button
                onClick={() => onReject(match.id, notes)}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={() => setShowNotes(!showNotes)}
                variant="outline"
                size="sm"
              >
                Notes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MpesaStatementReview({ statementId, onStatementDeleted }: { 
  statementId: string;
  onStatementDeleted?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<StatementDetails>({
    queryKey: [`/api/mpesa/statements/${statementId}`],
    queryFn: async () => {
      const response = await fetch(`/api/mpesa/statements/${statementId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch statement details');
      return response.json();
    },
  });

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
      toast({ title: 'Match approved and payment recorded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
    },
  });

  const deleteStatementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/mpesa/statements/${statementId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete statement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mpesa/statements'] });
      toast({
        title: 'Statement Deleted',
        description: 'The M-Pesa statement has been permanently deleted.',
      });
      onStatementDeleted?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
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
      toast({ title: 'Match rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to reject', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load statement details</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const pendingMatches = data.matches.filter(m => m.status === 'pending');
  const reviewedMatches = data.matches.filter(m => m.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Statement Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{data.statement.fileName}</CardTitle>
            <CardDescription>
              Uploaded {new Date(data.statement.uploadDate).toLocaleDateString()} •{' '}
              {data.statement.totalTransactions} transactions •{' '}
              {data.statement.matchedTransactions} matched
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteStatementMutation.mutate()}
            disabled={deleteStatementMutation.isPending}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
          >
            {deleteStatementMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </CardHeader>
      </Card>

      {/* Pending Reviews */}
      {pendingMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Pending Review ({pendingMatches.length})
          </h3>
          <MpesaStatementReviewTable
            statementId={statementId}
            matches={pendingMatches}
          />
        </div>
      )}

      {/* Reviewed Matches */}
      {reviewedMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Reviewed ({reviewedMatches.length})
          </h3>
          <MpesaStatementReviewTable
            statementId={statementId}
            matches={reviewedMatches}
          />
        </div>
      )}

      {pendingMatches.length === 0 && reviewedMatches.length === 0 && (
        <Alert>
          <AlertDescription>No transactions to review</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
