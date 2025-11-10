/**
 * Gateway Setup Wizard
 * Allows landlords to configure their payment gateway (Paystack)
 * Supports: Mobile Money, Paybill, and Till receiving methods
 */

import { useState, useEffect } from "react";
import { CreditCard, Smartphone, Building, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface GatewayConfig {
  receiveMethod: 'mobile_money' | 'paybill' | 'till';
  // Mobile Money fields
  recipientPhone?: string;
  recipientName?: string;
  idNumber?: string;
  // Paybill fields
  paybillNumber?: string;
  paybillAccountReference?: string;
  // Till fields
  tillNumber?: string;
  // Common fields
  businessName?: string;
  kraPin?: string;
  businessPhone?: string;
  accountBank?: string;
  accountNumber?: string;
}

interface GatewayStatus {
  isConfigured: boolean;
  provider: string | null;
  receiveMethod: string | null;
  businessName: string | null;
  subaccountCode: string | null;
  isVerified: boolean;
  configuredAt: string | null;
  lastTestedAt: string | null;
}

interface GatewaySetupWizardProps {
  landlordId: string;
}

export default function GatewaySetupWizard({ landlordId }: GatewaySetupWizardProps) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [config, setConfig] = useState<GatewayConfig>({
    receiveMethod: 'mobile_money',
  });

  const { toast } = useToast();

  // Load gateway status
  useEffect(() => {
    fetchGatewayStatus();
  }, [landlordId]);

  const fetchGatewayStatus = async () => {
    try {
      const response = await fetch(`/api/landlords/${landlordId}/gateway/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching gateway status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = async () => {
    setConfiguring(true);
    
    try {
      const response = await fetch(`/api/landlords/${landlordId}/gateway/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Payment gateway configured successfully",
        });
        setShowForm(false);
        fetchGatewayStatus();
      } else {
        toast({
          title: "Configuration Failed",
          description: data.error || "Failed to configure gateway",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to configure gateway. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfiguring(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    
    try {
      const response = await fetch(`/api/landlords/${landlordId}/gateway/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Test Successful ✅",
          description: data.message,
        });
        fetchGatewayStatus();
      } else {
        toast({
          title: "Test Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove gateway configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/landlords/${landlordId}/gateway/configure`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Gateway Removed",
          description: "Gateway configuration has been removed",
        });
        fetchGatewayStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove gateway",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show configured status
  if (status?.isConfigured && !showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Payment Gateway Configured
              </CardTitle>
              <CardDescription>Your Paystack payment gateway is active</CardDescription>
            </div>
            <Badge variant="default" className="bg-green-500">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Provider</Label>
              <p className="font-medium">Paystack</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Receive Method</Label>
              <p className="font-medium capitalize">{status.receiveMethod?.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Business Name</Label>
              <p className="font-medium">{status.businessName || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Subaccount Code</Label>
              <p className="font-mono text-sm">{status.subaccountCode}</p>
            </div>
            {status.configuredAt && (
              <div>
                <Label className="text-sm text-muted-foreground">Configured At</Label>
                <p className="text-sm">{new Date(status.configuredAt).toLocaleDateString()}</p>
              </div>
            )}
            {status.lastTestedAt && (
              <div>
                <Label className="text-sm text-muted-foreground">Last Tested</Label>
                <p className="text-sm">{new Date(status.lastTestedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleTest} disabled={testing}>
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              Reconfigure
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show configuration form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configure Payment Gateway
        </CardTitle>
        <CardDescription>
          Set up Paystack to receive rent payments via M-Pesa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Choose how you want to receive payments. We'll create a Paystack subaccount for you.
          </AlertDescription>
        </Alert>

        {/* Receive Method Selection */}
        <div className="space-y-2">
          <Label>Receive Method *</Label>
          <Select
            value={config.receiveMethod}
            onValueChange={(value: 'mobile_money' | 'paybill' | 'till') => 
              setConfig({ ...config, receiveMethod: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money (Personal M-Pesa)
                </div>
              </SelectItem>
              <SelectItem value="paybill">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Business Paybill
                </div>
              </SelectItem>
              <SelectItem value="till">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Business Till
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic form fields based on receive method */}
        {config.receiveMethod === 'mobile_money' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientPhone">Recipient Phone Number *</Label>
              <Input
                id="recipientPhone"
                placeholder="0712345678"
                value={config.recipientPhone || ''}
                onChange={(e) => setConfig({ ...config, recipientPhone: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                M-Pesa number where you want to receive payments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                placeholder="John Doe"
                value={config.recipientName || ''}
                onChange={(e) => setConfig({ ...config, recipientName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number (Optional)</Label>
              <Input
                id="idNumber"
                placeholder="12345678"
                value={config.idNumber || ''}
                onChange={(e) => setConfig({ ...config, idNumber: e.target.value })}
              />
            </div>
          </div>
        )}

        {config.receiveMethod === 'paybill' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paybillNumber">Paybill Number *</Label>
              <Input
                id="paybillNumber"
                placeholder="123456"
                value={config.paybillNumber || ''}
                onChange={(e) => setConfig({ ...config, paybillNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paybillAccountReference">Account Reference (Optional)</Label>
              <Input
                id="paybillAccountReference"
                placeholder="Property rent payments"
                value={config.paybillAccountReference || ''}
                onChange={(e) => setConfig({ ...config, paybillAccountReference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountBank">Bank Code *</Label>
              <Input
                id="accountBank"
                placeholder="063"
                value={config.accountBank || ''}
                onChange={(e) => setConfig({ ...config, accountBank: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Paystack bank code (e.g., 063 for Stanbic)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                placeholder="1234567890"
                value={config.accountNumber || ''}
                onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
              />
            </div>
          </div>
        )}

        {config.receiveMethod === 'till' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tillNumber">Till Number *</Label>
              <Input
                id="tillNumber"
                placeholder="123456"
                value={config.tillNumber || ''}
                onChange={(e) => setConfig({ ...config, tillNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountBank">Bank Code *</Label>
              <Input
                id="accountBank"
                placeholder="063"
                value={config.accountBank || ''}
                onChange={(e) => setConfig({ ...config, accountBank: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                placeholder="1234567890"
                value={config.accountNumber || ''}
                onChange={(e) => setConfig({ ...config, accountNumber: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Common fields for all methods */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Business Details (Optional)</h4>
          
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              placeholder="My Properties Ltd"
              value={config.businessName || ''}
              onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessPhone">Business Phone</Label>
            <Input
              id="businessPhone"
              placeholder="0712345678"
              value={config.businessPhone || ''}
              onChange={(e) => setConfig({ ...config, businessPhone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kraPin">KRA PIN</Label>
            <Input
              id="kraPin"
              placeholder="A123456789X"
              value={config.kraPin || ''}
              onChange={(e) => setConfig({ ...config, kraPin: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleConfigure} disabled={configuring}>
            {configuring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configuring...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
          {showForm && (
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
