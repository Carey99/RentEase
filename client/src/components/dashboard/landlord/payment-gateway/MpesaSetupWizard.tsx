import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, Smartphone, Building2, AlertCircle } from 'lucide-react';

interface MpesaSetupWizardProps {
  landlordId: string;
}

interface DarajaConfig {
  businessShortCode: string;
  businessType: 'paybill' | 'till';
  businessName: string;
  accountNumber: string;
}

interface ConfigStatus {
  isConfigured: boolean;
  isActive: boolean;
  businessShortCode: string | null;
  businessType: 'paybill' | 'till' | null;
  businessName: string | null;
  accountNumber: string | null;
  configuredAt: string | null;
  lastTestedAt: string | null;
}

export function MpesaSetupWizard({ landlordId }: MpesaSetupWizardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [config, setConfig] = useState<DarajaConfig>({
    businessShortCode: '',
    businessType: 'paybill',
    businessName: '',
    accountNumber: ''
  });

  // Fetch current configuration status
  useEffect(() => {
    if (landlordId) {
      fetchStatus();
    } else {
      console.error('MpesaSetupWizard: landlordId is missing');
    }
  }, [landlordId]);

  const fetchStatus = async () => {
    try {
      setFetchingStatus(true);
      setFetchError(null);
      console.log('Fetching M-Pesa status for landlordId:', landlordId);
      const response = await fetch(`/api/landlords/${landlordId}/daraja/status`);
      console.log('Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('M-Pesa status data:', data);
        setStatus(data);
        
        // Pre-fill form if configured
        if (data.isConfigured) {
          setConfig({
            businessShortCode: data.businessShortCode || '',
            businessType: data.businessType || 'paybill',
            businessName: data.businessName || '',
            accountNumber: data.accountNumber || ''
          });
        }
      } else {
        const text = await response.text();
        console.error('Failed to fetch status. Response:', response.status, text.substring(0, 200));
        setFetchError(`Failed to load M-Pesa configuration (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to fetch M-Pesa status:', error);
      setFetchError('Unable to connect to server. Please check your connection.');
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/landlords/${landlordId}/daraja/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: 'M-Pesa configuration saved successfully',
        });
        await fetchStatus();
      } else {
        toast({
          title: 'Configuration Failed',
          description: data.error || 'Failed to configure M-Pesa',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save M-Pesa configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);

    try {
      const response = await fetch(`/api/landlords/${landlordId}/daraja/test`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Connection Successful!',
          description: data.message,
        });
        await fetchStatus();
      } else {
        toast({
          title: 'Connection Failed',
          description: data.message || 'Failed to connect to M-Pesa',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test M-Pesa connection',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to deactivate M-Pesa payments?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/landlords/${landlordId}/daraja/configure`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Deactivated',
          description: 'M-Pesa configuration has been deactivated',
        });
        setConfig({
          businessShortCode: '',
          businessType: 'paybill',
          businessName: '',
          accountNumber: ''
        });
        await fetchStatus();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate M-Pesa configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (fetchingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            M-Pesa Payment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            M-Pesa Payment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {fetchError}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchStatus} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          M-Pesa Payment Configuration
        </CardTitle>
        <CardDescription>
          Configure your M-Pesa paybill or till number to receive rent payments directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {status?.isConfigured && (
          <Alert className={status.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {status.isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">
                    {status.isActive ? 'M-Pesa Configured' : 'M-Pesa Inactive'}
                  </p>
                  <AlertDescription className="text-sm space-y-1">
                    <div>Type: <Badge variant="outline">{status.businessType}</Badge></div>
                    <div>Business Short Code: <span className="font-mono">{status.businessShortCode}</span></div>
                    {status.accountNumber && (
                      <div>Account Reference: <span className="font-mono">{status.accountNumber}</span></div>
                    )}
                    {status.configuredAt && (
                      <div className="text-xs text-muted-foreground">
                        Configured: {new Date(status.configuredAt).toLocaleDateString()}
                      </div>
                    )}
                    {status.lastTestedAt && (
                      <div className="text-xs text-muted-foreground">
                        Last tested: {new Date(status.lastTestedAt).toLocaleDateString()}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                {status.isActive && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    disabled={loading}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Information Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Enter your M-Pesa paybill or till number below. 
            When your tenants pay rent, the money goes directly to YOUR M-Pesa account. 
            RentEase simply facilitates the payment.
          </AlertDescription>
        </Alert>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Type Selection */}
          <div className="space-y-3">
            <Label>M-Pesa Account Type *</Label>
            <RadioGroup
              value={config.businessType}
              onValueChange={(value: 'paybill' | 'till') => 
                setConfig({ ...config, businessType: value })
              }
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="paybill" id="paybill" />
                <Label htmlFor="paybill" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">Paybill Number</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Business paybill (e.g., 123456) - Requires account reference
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="till" id="till" />
                <Label htmlFor="till" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-medium">Till Number</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Buy Goods and Services till (e.g., 556677)
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Business Short Code */}
          <div className="space-y-2">
            <Label htmlFor="shortCode">
              {config.businessType === 'paybill' ? 'Paybill' : 'Till'} Number *
            </Label>
            <Input
              id="shortCode"
              type="text"
              placeholder={config.businessType === 'paybill' ? 'e.g., 123456' : 'e.g., 556677'}
              value={config.businessShortCode}
              onChange={(e) => setConfig({ ...config, businessShortCode: e.target.value })}
              required
              pattern="\d{5,7}"
              title="Must be 5-7 digits"
            />
            <p className="text-xs text-muted-foreground">
              Your M-Pesa {config.businessType} number (5-7 digits)
            </p>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name (Optional)</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="e.g., Sunset Properties"
              value={config.businessName}
              onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Appears on tenant's M-Pesa confirmation
            </p>
          </div>

          {/* Account Number (for Paybill only) */}
          {config.businessType === 'paybill' && (
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Reference (Recommended)</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="e.g., RENT or Property-A"
                value={config.accountNumber}
                onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Helps identify payments in your M-Pesa statement
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !config.businessShortCode}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {status?.isConfigured ? 'Update Configuration' : 'Save Configuration'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="font-medium text-sm text-blue-900">Need help?</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Your paybill/till number is provided by Safaricom when you register for M-Pesa business</li>
            <li>Don't have one? Visit any Safaricom shop to register (usually takes 1-2 days)</li>
            <li>For testing, you can use sandbox number: 174379 (paybill)</li>
            <li>Once configured, your tenants can pay rent directly via M-Pesa</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
