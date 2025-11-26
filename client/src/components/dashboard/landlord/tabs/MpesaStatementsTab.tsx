/**
 * M-Pesa Statements Tab
 * Main tab for M-Pesa statement management
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import MpesaStatementUpload from '../MpesaStatementUpload';
import MpesaStatementReview from '../MpesaStatementReview';

interface Statement {
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
}

function StatementsList({ onSelectStatement, onStatementDeleted }: { 
  onSelectStatement: (id: string) => void;
  onStatementDeleted?: () => void;
}) {
  const { data, isLoading } = useQuery<{ statements: Statement[] }>({
    queryKey: ['/api/mpesa/statements'],
    queryFn: async () => {
      const response = await fetch('/api/mpesa/statements', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch statements');
      return response.json();
    },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (statementId: string) => {
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
      setDeleteConfirm(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const statements = data?.statements || [];

  if (statements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Statements Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload your first M-Pesa statement to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {statements.map((statement) => {
          const pendingCount = statement.totalTransactions - statement.matchedTransactions;
          const matchRate = statement.totalTransactions > 0
            ? (statement.matchedTransactions / statement.totalTransactions * 100).toFixed(1)
            : '0';

          return (
            <Card key={statement.id} className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                      <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {statement.fileName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Uploaded {new Date(statement.uploadDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={statement.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                    {statement.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm gap-4">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Transactions</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{statement.totalTransactions}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Matched</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{statement.matchedTransactions} ({matchRate}%)</div>
                  </div>
                  {pendingCount > 0 && (
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">Pending</div>
                      <div className="font-semibold text-orange-600 dark:text-orange-500">{pendingCount}</div>
                    </div>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectStatement(statement.id)}
                      className="text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(statement.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Statement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the M-Pesa statement and all its transaction matches. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MpesaStatementsTab() {
  const [activeTab, setActiveTab] = useState<'upload' | 'statements'>('upload');
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  const handleUploadSuccess = (statementId: string) => {
    setSelectedStatementId(statementId);
    setActiveTab('statements');
  };

  const handleSelectStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };

  const handleStatementDeleted = () => {
    setSelectedStatementId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">M-Pesa Statements</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Upload and review M-Pesa statements to automatically match payments to tenants
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="statements">
            <FileText className="h-4 w-4 mr-2" />
            Statements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <MpesaStatementUpload onUploadSuccess={handleUploadSuccess} />
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          {selectedStatementId ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStatementId(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to Statements
              </Button>
              <MpesaStatementReview 
                statementId={selectedStatementId}
                onStatementDeleted={handleStatementDeleted}
              />
            </div>
          ) : (
            <StatementsList 
              onSelectStatement={handleSelectStatement}
              onStatementDeleted={handleStatementDeleted}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
