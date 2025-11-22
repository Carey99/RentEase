/**
 * M-Pesa Statements Tab
 * Main tab for M-Pesa statement management
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Eye, Loader2 } from 'lucide-react';
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

function StatementsList({ onSelectStatement }: { onSelectStatement: (id: string) => void }) {
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
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Statements Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your first M-Pesa statement to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {statements.map((statement) => {
        const pendingCount = statement.totalTransactions - statement.matchedTransactions;
        const matchRate = statement.totalTransactions > 0
          ? (statement.matchedTransactions / statement.totalTransactions * 100).toFixed(1)
          : '0';

        return (
          <Card key={statement.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {statement.fileName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Uploaded {new Date(statement.uploadDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={statement.status === 'approved' ? 'default' : 'secondary'}>
                  {statement.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-muted-foreground">Transactions</div>
                  <div className="font-semibold">{statement.totalTransactions}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Matched</div>
                  <div className="font-semibold">{statement.matchedTransactions} ({matchRate}%)</div>
                </div>
                {pendingCount > 0 && (
                  <div>
                    <div className="text-muted-foreground">Pending</div>
                    <div className="font-semibold text-orange-600">{pendingCount}</div>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectStatement(statement.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">M-Pesa Statements</h2>
        <p className="text-muted-foreground">
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
              >
                ← Back to Statements
              </Button>
              <MpesaStatementReview statementId={selectedStatementId} />
            </div>
          ) : (
            <StatementsList onSelectStatement={handleSelectStatement} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
