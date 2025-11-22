/**
 * M-Pesa Statement Upload Component
 * Allows landlord to upload M-Pesa PDF statements
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface UploadResult {
  statementId: string;
  summary: {
    fileName: string;
    uploadDate: string;
    period: {
      start: string;
      end: string;
    };
    totalTransactions: number;
    totalAmount: number;
    matching: {
      matched: number;
      ambiguous: number;
      noMatch: number;
      matchRate: number;
      confidence: {
        high: number;
        medium: number;
        low: number;
      };
      amounts: {
        total: number;
        matched: number;
        unmatched: number;
        matchedPercentage: number;
      };
    };
  };
}

export default function MpesaStatementUpload({ onUploadSuccess }: { onUploadSuccess?: (statementId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('statement', file);
      if (password) {
        formData.append('password', password);
      }

      const response = await fetch('/api/mpesa/upload-statement', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
      
      // Invalidate statements query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/mpesa/statements'] });

      toast({
        title: 'Statement Uploaded',
        description: `Successfully processed ${data.summary.totalTransactions} transactions`,
      });

      if (onUploadSuccess) {
        onUploadSuccess(data.statementId);
      }

    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Upload Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPassword('');
    setResult(null);
    setError(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload M-Pesa Statement</CardTitle>
        <CardDescription>
          Upload your M-Pesa statement PDF to automatically match transactions to tenants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="statement-file">M-Pesa Statement PDF</Label>
              <Input
                id="statement-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pdf-password"
                type="password"
                placeholder="Enter 6-digit M-Pesa statement password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={uploading}
                required
              />
              <p className="text-xs text-muted-foreground">
                M-Pesa statements are always password-protected. Enter the 6-digit password from Safaricom.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Process
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully processed {result.summary.totalTransactions} transactions from {result.summary.fileName}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.summary.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    KSH {result.summary.totalAmount.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Match Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.summary.matching.matchRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {result.summary.matching.matched} / {result.summary.totalTransactions} matched
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Confidence Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    High Confidence
                  </span>
                  <span className="font-semibold">{result.summary.matching.confidence.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    Medium Confidence
                  </span>
                  <span className="font-semibold">{result.summary.matching.confidence.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    Low Confidence
                  </span>
                  <span className="font-semibold">{result.summary.matching.confidence.low}</span>
                </div>
                {result.summary.matching.noMatch > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <XCircle className="h-3 w-3 text-red-500" />
                      No Match
                    </span>
                    <span className="font-semibold">{result.summary.matching.noMatch}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetUpload} className="flex-1">
                Upload Another
              </Button>
              <Button
                onClick={() => onUploadSuccess?.(result.statementId)}
                className="flex-1"
              >
                Review Matches
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
