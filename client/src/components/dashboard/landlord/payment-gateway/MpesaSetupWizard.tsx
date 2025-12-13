import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { CheckCircle2, XCircle, Loader2, Smartphone, Building2, AlertCircle, Eye, EyeOff, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MpesaSetupWizardProps {
  landlordId: string;
}

interface DarajaConfig {
  businessShortCode: string;
  businessType: 'paybill' | 'till';
  businessName: string;
  accountNumber: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

interface ConfigStatus {
  isConfigured: boolean;
  isActive: boolean;
  businessShortCode: string | null;
  businessType: 'paybill' | 'till' | null;
  businessName: string | null;
  accountNumber: string | null;
  environment: 'sandbox' | 'production' | null;
  hasCredentials: boolean;
  configuredAt: string | null;
  lastTestedAt: string | null;
  consumerKeyMasked?: string | null;
  consumerSecretMasked?: string | null;
  passkeyMasked?: string | null;
}

export function MpesaSetupWizard({ landlordId }: MpesaSetupWizardProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [showConsumerKey, setShowConsumerKey] = useState(false);
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [config, setConfig] = useState<DarajaConfig>({
    businessShortCode: '',
    businessType: 'paybill',
    businessName: '',
    accountNumber: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    environment: 'sandbox'
  });

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
      const response = await fetch(`/api/landlords/${landlordId}/daraja/status`);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        
        if (data.isConfigured) {
          setConfig({
            businessShortCode: data.businessShortCode || '',
            businessType: data.businessType || 'paybill',
            businessName: data.businessName || '',
            accountNumber: data.accountNumber || '',
            consumerKey: data.consumerKeyMasked || '',
            consumerSecret: data.consumerSecretMasked || '',
            passkey: data.passkeyMasked || '',
            environment: data.environment || 'sandbox'
          });
        }
      } else {
        setFetchError(`Failed to load M-Pesa configuration`);
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
          accountNumber: '',
          consumerKey: '',
          consumerSecret: '',
          passkey: '',
          environment: 'sandbox'
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

  const ConfigSection = ({ title, description, children, id }: { title: string; description: string; children: React.ReactNode; id: string }) => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedSection(isExpanded ? null : id)}
          className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (fetchingStatus) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {fetchError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      {status?.isConfigured && (
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-3`}>
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                    {status.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                {status.isActive ? (
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4 pb-4">
              <div>
                <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 capitalize">{status.businessType}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4 pb-4">
              <div>
                <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Environment</p>
                <Badge className="mt-1 text-[10px] md:text-xs" variant={status.environment === 'production' ? 'destructive' : 'secondary'}>
                  {status.environment}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4 pb-4">
              <div>
                <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Short Code</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{status.businessShortCode}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!status?.isConfigured && (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">M-Pesa Not Configured</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">Set up M-Pesa to start accepting payments from your tenants.</p>
            </div>
          </div>
        </div>
      )}

      {status?.isConfigured && !status?.isActive && (
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-100">M-Pesa is Disabled</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">Enable M-Pesa to receive payments. Click "Edit Configuration" to reactivate.</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConfigSection
          id="business"
          title="Business Information"
          description={status?.isConfigured ? `${status.businessName || 'No name'} • ${status.businessShortCode}` : 'Configure your M-Pesa account'}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessType" className="text-sm font-medium">Business Type</Label>
              <RadioGroup value={config.businessType} onValueChange={(value: any) => setConfig({ ...config, businessType: value })} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paybill" id="paybill" />
                  <Label htmlFor="paybill" className="font-normal cursor-pointer text-sm">Paybill</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="till" id="till" />
                  <Label htmlFor="till" className="font-normal cursor-pointer text-sm">Till Number</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="shortCode" className="text-sm font-medium">Short Code</Label>
              <Input
                id="shortCode"
                placeholder="e.g., 123456"
                value={config.businessShortCode}
                onChange={(e) => setConfig({ ...config, businessShortCode: e.target.value })}
                required
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="businessName" className="text-sm font-medium">Business Name</Label>
              <Input
                id="businessName"
                placeholder="e.g., Property Management Ltd"
                value={config.businessName}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                required
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="accountNumber" className="text-sm font-medium">Account Number (Reference)</Label>
              <Input
                id="accountNumber"
                placeholder="e.g., REF001"
                value={config.accountNumber}
                onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
                required
                className="mt-1 text-sm"
              />
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          id="credentials"
          title="Daraja Credentials"
          description="M-Pesa API credentials from Safaricom"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="consumerKey" className="text-sm font-medium">Consumer Key</Label>
              <div className="relative mt-1">
                <Input
                  id="consumerKey"
                  type={showConsumerKey ? 'text' : 'password'}
                  placeholder="Your consumer key"
                  value={config.consumerKey}
                  onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConsumerKey(!showConsumerKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConsumerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="consumerSecret" className="text-sm font-medium">Consumer Secret</Label>
              <div className="relative mt-1">
                <Input
                  id="consumerSecret"
                  type={showConsumerSecret ? 'text' : 'password'}
                  placeholder="Your consumer secret"
                  value={config.consumerSecret}
                  onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConsumerSecret(!showConsumerSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConsumerSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="passkey" className="text-sm font-medium">Passkey</Label>
              <div className="relative mt-1">
                <Input
                  id="passkey"
                  type={showPasskey ? 'text' : 'password'}
                  placeholder="Your M-Pesa passkey"
                  value={config.passkey}
                  onChange={(e) => setConfig({ ...config, passkey: e.target.value })}
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasskey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          id="environment"
          title="Environment"
          description={`Currently using ${config.environment}`}
        >
          <RadioGroup value={config.environment} onValueChange={(value: any) => setConfig({ ...config, environment: value })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sandbox" id="sandbox" />
              <Label htmlFor="sandbox" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Sandbox (Testing)</span>
                <span className="text-gray-500 dark:text-gray-400 block text-xs mt-0.5">Use this to test the integration before going live</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <RadioGroupItem value="production" id="production" />
              <Label htmlFor="production" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Production (Live)</span>
                <span className="text-gray-500 dark:text-gray-400 block text-xs mt-0.5">Live payments will be processed with this setting</span>
              </Label>
            </div>
          </RadioGroup>
        </ConfigSection>

        {/* Action Buttons */}
        <div className={`${isMobile ? 'flex-col space-y-2' : 'flex gap-2 justify-between'} pt-4`}>
          {status?.isConfigured && (
            <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
              <Button
                type="button"
                onClick={handleTest}
                disabled={testing || loading}
                variant="outline"
                className={`text-sm ${isMobile ? 'flex-1' : ''}`}
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button
                type="button"
                onClick={handleRemove}
                disabled={loading || testing}
                variant="destructive"
                className={`text-sm ${isMobile ? 'flex-1' : ''}`}
              >
                Deactivate
              </Button>
            </div>
          )}

          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfig({
                businessShortCode: '',
                businessType: 'paybill',
                businessName: '',
                accountNumber: '',
                consumerKey: '',
                consumerSecret: '',
                passkey: '',
                environment: 'sandbox'
              })}
              className={`text-sm ${isMobile ? 'flex-1' : ''}`}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`text-sm ${isMobile ? 'flex-1' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Help Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-400" />
              Getting Started
            </h3>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3 md:gap-4`}>
            <div className="p-3 md:p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900/30">
              <div className="flex items-start gap-2 md:gap-3">
                <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-xs md:text-sm text-gray-900 dark:text-white">How to Get Credentials</h4>
                  <ol className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 list-decimal list-inside">
                    <li>Visit Safaricom Daraja</li>
                    <li>Create developer account</li>
                    <li>Create new app</li>
                    <li>Copy credentials</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="p-3 md:p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900/30">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-xs md:text-sm text-gray-900 dark:text-white">Important Notes</h4>
                  <ul className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 list-disc list-inside">
                    <li>Keep credentials secure</li>
                    <li>Test in sandbox first</li>
                    <li>Never share secrets</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-3 md:p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-900/30">
              <div className="flex items-start gap-2 md:gap-3">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-xs md:text-sm text-gray-900 dark:text-white">Next Steps</h4>
                  <ol className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2 list-decimal list-inside">
                    <li>Enter credentials</li>
                    <li>Test connection</li>
                    <li>Go live</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <a
            href="https://developer.safaricom.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Visit Daraja Developer Portal
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
