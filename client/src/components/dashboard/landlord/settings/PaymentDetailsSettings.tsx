/**
 * Manual Payment Details Configuration
 * 
 * Allows landlords to set up manual payment instructions
 * (bank account, M-Pesa details) without needing Daraja API
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Building2, Smartphone, Save, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ManualPaymentDetails } from "@shared/schema";

interface PaymentDetailsSettingsProps {
  landlordId: string;
}

export default function PaymentDetailsSettings({ landlordId }: PaymentDetailsSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<ManualPaymentDetails>({
    enabled: false,
    mpesa: {
      type: undefined,
      businessNumber: "",
      accountNumber: "",
    },
    bank: {
      enabled: false,
      bankName: "",
      accountNumber: ""
    },
    instructions: ""
  });

  // Fetch existing payment details
  const { data: existingDetails, isLoading } = useQuery({
    queryKey: [`/api/landlords/${landlordId}/payment-details`],
    queryFn: async () => {
      const response = await fetch(`/api/landlords/${landlordId}/payment-details`);
      if (!response.ok) throw new Error("Failed to fetch payment details");
      return response.json() as Promise<ManualPaymentDetails>;
    }
  });

  // Initialize form with existing data
  useEffect(() => {
    if (existingDetails) {
      setFormData(existingDetails);
    }
  }, [existingDetails]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ManualPaymentDetails) => {
      const response = await fetch(`/api/landlords/${landlordId}/payment-details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update payment details");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/landlords/${landlordId}/payment-details`] });
      toast({
        title: "Payment Details Updated",
        description: "Your payment information has been saved successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Manual Payment Details
          </CardTitle>
          <CardDescription>
            Configure payment instructions for your tenants. This information will be displayed on their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between py-4 border-b">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Display Payment Details</Label>
                <p className="text-sm text-gray-600">Show payment information to tenants</p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            {formData.enabled && (
              <>
                <Tabs defaultValue="mpesa" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mpesa">
                      <Smartphone className="h-4 w-4 mr-2" />
                      M-Pesa
                    </TabsTrigger>
                    <TabsTrigger value="bank">
                      <Building2 className="h-4 w-4 mr-2" />
                      Bank Details
                    </TabsTrigger>
                  </TabsList>

                  {/* M-Pesa Tab */}
                  <TabsContent value="mpesa" className="space-y-4">
                    <div>
                      <Label htmlFor="mpesaType">M-Pesa Type</Label>
                      <Select
                        value={formData.mpesa?.type || ""}
                        onValueChange={(value: 'paybill' | 'till') => {
                          setFormData({
                            ...formData,
                            mpesa: { 
                              type: value,
                              businessNumber: formData.mpesa?.businessNumber || "",
                              accountNumber: value === 'till' ? undefined : formData.mpesa?.accountNumber
                            }
                          });
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select M-Pesa type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paybill">Paybill</SelectItem>
                          <SelectItem value="till">Till Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose either Paybill or Till Number
                      </p>
                    </div>

                    {formData.mpesa?.type && (
                      <>
                        <div>
                          <Label htmlFor="businessNumber">
                            {formData.mpesa.type === 'paybill' ? 'Paybill Number' : 'Till Number'}
                          </Label>
                          <Input
                            id="businessNumber"
                            placeholder={formData.mpesa.type === 'paybill' ? 'e.g., 123456' : 'e.g., 654321'}
                            value={formData.mpesa?.businessNumber || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                mpesa: { ...formData.mpesa, type: formData.mpesa?.type, businessNumber: e.target.value }
                              })
                            }
                            className="mt-2"
                          />
                        </div>

                        {formData.mpesa.type === 'paybill' && (
                          <div>
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              placeholder="e.g., RENT001"
                              value={formData.mpesa?.accountNumber || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  mpesa: { ...formData.mpesa, type: 'paybill', accountNumber: e.target.value }
                                })
                              }
                              className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Account reference for paybill payments
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* Bank Tab */}
                  <TabsContent value="bank" className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <Label className="font-medium">Enable Bank Transfer</Label>
                      <Switch
                        checked={formData.bank?.enabled || false}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            bank: { ...formData.bank, enabled: checked }
                          })
                        }
                      />
                    </div>

                    {formData.bank?.enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            placeholder="e.g., Equity Bank"
                            value={formData.bank?.bankName || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bank: { ...formData.bank, enabled: formData.bank?.enabled || false, bankName: e.target.value }
                              })
                            }
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="bankAccountNumber">Account Number</Label>
                          <Input
                            id="bankAccountNumber"
                            placeholder="e.g., 1234567890"
                            value={formData.bank?.accountNumber || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bank: { ...formData.bank, enabled: formData.bank?.enabled || false, accountNumber: e.target.value }
                              })
                            }
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Additional Instructions */}
                <div>
                  <Label htmlFor="instructions">Additional Payment Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Add any special instructions for your tenants, e.g., 'Please include your unit number in the payment reference.'"
                    value={formData.instructions || ""}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be shown to tenants below the payment details
                  </p>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Payment Details
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {showPreview && formData.enabled && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Tenant View Preview</CardTitle>
            <CardDescription>This is how your payment details will appear to tenants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TenantViewPreview paymentDetails={formData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Preview component showing how tenants will see the payment details
function TenantViewPreview({ paymentDetails }: { paymentDetails: ManualPaymentDetails }) {
  const NumberDisplay = ({ code }: { code: string }) => (
    <div className="flex justify-center items-center gap-2 py-4">
      {code.split('').map((digit, idx) => (
        <div
          key={idx}
          className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-mono text-base font-semibold"
        >
          {digit}
        </div>
      ))}
    </div>
  );

  return (
    <div className="text-center space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="space-y-2">
        <div className="w-full border-t border-gray-200"></div>
        <span className="text-xs text-gray-500">Pay manually using</span>
      </div>

      {/* M-Pesa Details */}
      {paymentDetails.mpesa?.type && paymentDetails.mpesa?.businessNumber && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              {paymentDetails.mpesa.type === 'paybill' ? 'Paybill Number' : 'Till Number'}
            </p>
            <NumberDisplay code={paymentDetails.mpesa.businessNumber} />
            {paymentDetails.mpesa.type === 'paybill' && paymentDetails.mpesa.accountNumber && (
              <>
                <p className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2 mt-3">
                  Account Number
                </p>
                <NumberDisplay code={paymentDetails.mpesa.accountNumber} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Bank Details */}
      {paymentDetails.bank?.enabled && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-left space-y-2">
          <p className="text-sm font-semibold text-gray-900 text-center mb-3">Bank Transfer</p>
          {paymentDetails.bank.bankName && (
            <p className="text-sm">
              <span className="text-gray-600">Bank:</span>{" "}
              <span className="font-semibold">{paymentDetails.bank.bankName}</span>
            </p>
          )}
          {paymentDetails.bank.accountNumber && (
            <p className="text-sm">
              <span className="text-gray-600">Account Number:</span>{" "}
              <span className="font-semibold font-mono">{paymentDetails.bank.accountNumber}</span>
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {paymentDetails.instructions && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">{paymentDetails.instructions}</p>
        </div>
      )}
    </div>
  );
}
