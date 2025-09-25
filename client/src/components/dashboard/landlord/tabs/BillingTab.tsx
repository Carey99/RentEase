import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, CreditCard, FileText, Users, DollarSign, Calculator, Send, Mail, MessageSquare, Phone } from "lucide-react";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { useToast } from "@/hooks/use-toast";

interface PropertyUtility {
  _id: string;
  type: string;
  price: string;
}

interface TenantToBill {
  id: string;
  name: string;
  email: string;
  phone?: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  availableUtilities: PropertyUtility[];
  allUtilities?: PropertyUtility[];
}

interface UtilityUsage {
  utilityType: string;
  unitsUsed: number;
}

interface BillPreview {
  tenantName: string;
  propertyName: string;
  rentAmount: number;
  utilityBreakdown: Array<{
    utilityType: string;
    unitsUsed: number;
    pricePerUnit: number;
    totalAmount: number;
  }>;
  totalUtilityCost: number;
  totalAmount: number;
}

export default function BillingTab() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [utilityUsages, setUtilityUsages] = useState<{ [tenantId: string]: UtilityUsage[] }>({});
  const [showBillPreview, setShowBillPreview] = useState<{ [tenantId: string]: BillPreview }>({});
  const [showSendOptions, setShowSendOptions] = useState<{ [tenantId: string]: boolean }>({});

  // Close send options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.send-bill-dropdown')) {
        setShowSendOptions({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get tenants to bill for selected month/year
  const { data: tenantsToBillData, isLoading: loadingTenants } = useQuery({
    queryKey: ['tenants-to-bill', currentUser?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      
      const response = await fetch(
        `/api/billing/landlord/${currentUser.id}/to-bill?month=${selectedMonth}&year=${selectedYear}`
      );
      if (!response.ok) throw new Error('Failed to fetch tenants to bill');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Get existing bills for selected period
  const { data: existingBillsData } = useQuery({
    queryKey: ['landlord-bills', currentUser?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      
      const response = await fetch(
        `/api/billing/landlord/${currentUser.id}?month=${selectedMonth}&year=${selectedYear}`
      );
      if (!response.ok) throw new Error('Failed to fetch bills');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Generate bills mutation
  const generateBillsMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      
      const response = await fetch(`/api/billing/landlord/${currentUser.id}/generate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          tenantUtilityUsages: utilityUsages
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate bills');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bills Generated",
        description: `Successfully generated ${data.results.successful.length} bills`,
      });
      queryClient.invalidateQueries({ queryKey: ['tenants-to-bill'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-bills'] });
      setUtilityUsages({});
      setShowBillPreview({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate bills",
        variant: "destructive",
      });
    },
  });

  const handleUtilityUsageChange = (tenantId: string, utilityType: string, unitsUsed: string) => {
    const units = parseFloat(unitsUsed) || 0;
    
    setUtilityUsages(prev => ({
      ...prev,
      [tenantId]: [
        ...(prev[tenantId] || []).filter(u => u.utilityType !== utilityType),
        { utilityType, unitsUsed: units }
      ].filter(u => u.unitsUsed > 0)
    }));
  };

  const calculatePreview = async (tenantId: string) => {
    try {
      const response = await fetch('/api/billing/calculate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          month: selectedMonth,
          year: selectedYear,
          utilityUsages: utilityUsages[tenantId] || []
        })
      });
      
      if (!response.ok) throw new Error('Failed to calculate preview');
      const preview = await response.json();
      
      setShowBillPreview(prev => ({
        ...prev,
        [tenantId]: preview
      }));
    } catch (error) {
      console.error('Error calculating preview:', error);
      toast({
        title: "Preview Error",
        description: "Failed to calculate bill preview",
        variant: "destructive",
      });
    }
  };

  const hasUtilityUsage = (tenantId: string) => {
    return utilityUsages[tenantId] && utilityUsages[tenantId].length > 0;
  };

  const getTotalUtilitiesForTenant = (tenantId: string) => {
    const tenant = tenantsToBill.find(t => t.id === tenantId);
    if (!tenant?.availableUtilities) return 0;
    
    return (utilityUsages[tenantId] || []).reduce((total, usage) => {
      const utility = tenant.availableUtilities.find(u => u.type === usage.utilityType);
      if (utility) {
        const price = parseFloat(utility.price);
        return total + (usage.unitsUsed * price);
      }
      return total;
    }, 0);
  };

  const toggleSendOptions = (tenantId: string) => {
    setShowSendOptions(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  };

  const handleSendBill = async (tenantId: string, method: 'dashboard' | 'email' | 'sms' | 'whatsapp') => {
    const tenant = tenantsToBill.find(t => t.id === tenantId);
    if (!tenant) {
      toast({
        title: "Error",
        description: "Tenant not found",
        variant: "destructive",
      });
      return;
    }

    // For now, just show a success message with tenant details to ensure no mixup
    let contactInfo = '';
    switch (method) {
      case 'dashboard':
        contactInfo = `Dashboard notification for ${tenant.name}`;
        break;
      case 'email':
        contactInfo = `Email to ${tenant.email}`;
        break;
      case 'sms':
        contactInfo = `SMS to ${tenant.phone || 'No phone number'}`;
        break;
      case 'whatsapp':
        contactInfo = `WhatsApp to ${tenant.phone || 'No phone number'}`;
        break;
    }

    toast({
      title: "Bill Send Prepared",
      description: `Ready to send bill for ${tenant.name} (${tenant.propertyName} - Unit ${tenant.unitNumber}) via ${contactInfo}`,
      variant: "default",
    });

    // Close the send options dropdown
    setShowSendOptions(prev => ({ ...prev, [tenantId]: false }));
    
    // TODO: Implement actual sending logic later
    console.log(`Sending bill for tenant ${tenantId} (${tenant.name}) via ${method}`, {
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      tenantPhone: tenant.phone,
      propertyName: tenant.propertyName,
      unitNumber: tenant.unitNumber,
      rentAmount: tenant.rentAmount,
      method: method
    });
  };

  const tenantsToBill = tenantsToBillData?.tenantsToBill || [];
  const existingBills = existingBillsData?.bills || [];
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5" />
            <span>Billing Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="mt-1 block w-32 border border-gray-300 rounded-md px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants to Bill</p>
                <p className="text-2xl font-bold text-blue-600">{tenantsToBill.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Bills Generated</p>
                <p className="text-2xl font-bold text-green-600">{existingBills.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Billing</p>
                <p className="text-2xl font-bold text-purple-600">
                  KSH {existingBills.reduce((sum: number, bill: any) => sum + bill.totalAmount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Properties with Utilities</p>
                <p className="text-2xl font-bold text-orange-600">
                  {tenantsToBill.filter(t => t.availableUtilities && t.availableUtilities.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants to Bill */}
      {tenantsToBill.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Generate Bills for {monthName} {selectedYear}</span>
              </div>
              <Button 
                onClick={() => generateBillsMutation.mutate()}
                disabled={generateBillsMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {generateBillsMutation.isPending ? 'Generating...' : 'Generate All Bills'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {tenantsToBill.map((tenant: TenantToBill) => (
                <div key={tenant.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-600">{tenant.email}</p>
                      {tenant.phone && (
                        <p className="text-sm text-gray-600">📱 {tenant.phone}</p>
                      )}
                      <p className="text-sm text-gray-600">{tenant.propertyName} - Unit {tenant.unitNumber}</p>
                      <p className="text-sm font-medium text-green-600">Base Rent: KSH {tenant.rentAmount.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => calculatePreview(tenant.id)}
                        className="flex items-center space-x-2"
                      >
                        <Calculator className="h-4 w-4" />
                        <span>Preview Bill</span>
                      </Button>
                      
                      <div className="relative send-bill-dropdown">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => toggleSendOptions(tenant.id)}
                          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                          <span>Send Bill</span>
                        </Button>
                        
                        {showSendOptions[tenant.id] && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 send-bill-dropdown">
                            <div className="py-1">
                              <button
                                onClick={() => handleSendBill(tenant.id, 'dashboard')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-left">Dashboard</span>
                              </button>
                              <button
                                onClick={() => handleSendBill(tenant.id, 'email')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-left">Email</span>
                              </button>
                              <button
                                onClick={() => handleSendBill(tenant.id, 'sms')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                disabled={!tenant.phone}
                              >
                                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-left">SMS</span>
                              </button>
                              <button
                                onClick={() => handleSendBill(tenant.id, 'whatsapp')}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                disabled={!tenant.phone}
                              >
                                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="text-left">WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Utility Usage Input - Property Specific */}
                  {tenant.availableUtilities && tenant.availableUtilities.length > 0 ? (
                    <div className="space-y-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Utility Usage for {tenant.propertyName}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tenant.availableUtilities.map((utility) => {
                          const utilityKey = `${utility.type}-${tenant.id}`;
                          const price = parseFloat(utility.price);
                          
                          return (
                            <div key={utilityKey}>
                              <Label htmlFor={utilityKey}>
                                {utility.type.charAt(0).toUpperCase() + utility.type.slice(1)} 
                                <span className="text-xs text-gray-500 ml-1">
                                  (KSH {price.toLocaleString()}/unit)
                                </span>
                              </Label>
                              <div className="relative">
                                <Input
                                  id={utilityKey}
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="Enter units used"
                                  className="pr-16"
                                  onChange={(e) => {
                                    handleUtilityUsageChange(tenant.id, utility.type, e.target.value);
                                  }}
                                />
                                {utilityUsages[tenant.id]?.find(u => u.utilityType === utility.type) && (
                                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                    KSH {(
                                      (utilityUsages[tenant.id]?.find(u => u.utilityType === utility.type)?.unitsUsed || 0) * price
                                    ).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {hasUtilityUsage(tenant.id) && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm font-medium text-green-800">
                            Utilities Subtotal: KSH {getTotalUtilitiesForTenant(tenant.id).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            Total with Rent: KSH {(tenant.rentAmount + getTotalUtilitiesForTenant(tenant.id)).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        📋 No billable utilities for {tenant.propertyName}
                      </p>
                      {tenant.allUtilities && tenant.allUtilities.length > 0 ? (
                        <div className="text-xs text-blue-600">
                          <p className="mb-1">Registered utilities:</p>
                          <div className="flex flex-wrap gap-1">
                            {tenant.allUtilities.map((utility, index) => (
                              <span key={index} className="bg-blue-100 px-2 py-1 rounded text-xs">
                                {utility.type}: {utility.price}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs">
                            💡 To make utilities billable, set numeric prices instead of "Included" or "Not Included"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-600">
                          No utilities registered for this property.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Bill Preview */}
                  {showBillPreview[tenant.id] && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Bill Preview</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Rent:</span>
                          <span>KSH {showBillPreview[tenant.id].rentAmount.toLocaleString()}</span>
                        </div>
                        {showBillPreview[tenant.id].utilityBreakdown.map((utility, index) => (
                          <div key={index} className="flex justify-between text-gray-600">
                            <span>{utility.utilityType} ({utility.unitsUsed} units @ KSH {utility.pricePerUnit}):</span>
                            <span>KSH {utility.totalAmount.toLocaleString()}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-medium text-lg">
                          <span>Total:</span>
                          <span className="text-green-600">KSH {showBillPreview[tenant.id].totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Bills */}
      {existingBills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Bills for {monthName} {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingBills.map((bill: any) => (
                <div key={bill._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{bill.tenantName || 'Loading...'}</h3>
                        <Badge 
                          variant={
                            bill.status === 'paid' ? 'default' : 
                            bill.status === 'overdue' ? 'destructive' : 
                            bill.status === 'sent' ? 'outline' : 'secondary'
                          }
                        >
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {bill.propertyName || 'Property Name'} • Generated: {new Date(bill.createdAt || bill.generatedDate).toLocaleDateString()}
                      </p>
                      {bill.dueDate && (
                        <p className="text-sm text-orange-600">
                          Due: {new Date(bill.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600 mb-2">
                        KSH {bill.totalAmount.toLocaleString()}
                      </p>
                      <div className="flex space-x-2">
                        {bill.status !== 'paid' && (
                          <Button size="sm" variant="outline">
                            Mark Paid
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bill Breakdown */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bill Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Rent:</span>
                        <span>KSH {bill.rentAmount?.toLocaleString()}</span>
                      </div>
                      {bill.lineItems?.filter((item: any) => item.type === 'utility').map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-gray-600">
                          <span>{item.description}:</span>
                          <span>KSH {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {bill.lineItems?.filter((item: any) => item.type === 'utility').length > 0 && (
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total:</span>
                            <span>KSH {bill.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tenantsToBill.length === 0 && !loadingTenants && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Bills Generated!</h3>
            <p className="text-gray-600">
              All tenants have been billed for {monthName} {selectedYear}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}