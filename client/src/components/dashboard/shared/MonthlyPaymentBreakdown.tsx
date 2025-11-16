import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Zap, Download, Loader2, ChevronDown, ChevronRight, User } from "lucide-react";
import { isTransactionRecord, expectedForBill, paidForBill } from "@/lib/payment-utils";
import { cn } from "@/lib/utils";
import { formatPaymentHistoryMonth } from "@/lib/rent-cycle-utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface UtilityCharge {
  type: string;
  unitsUsed: number;
  pricePerUnit: number;
  total: number;
}

interface PaymentHistoryItem {
  _id: string;
  amount: number;
  paymentDate: string;
  forMonth: number;
  forYear: number;
  monthlyRent: number;
  status: "completed" | "partial" | "overpaid" | "pending" | "failed";
  paymentMethod?: string;
  notes?: string;
  utilityCharges?: UtilityCharge[];
  totalUtilityCost?: number;
  tenant?: {
    _id: string;
    id: string;
    name: string;
  };
  property?: {
    _id: string;
    id: string;
    name: string;
  };
}

interface MonthlyPaymentBreakdownProps {
  tenantId?: string;
  landlordId?: string;
  propertyId?: string;
  title?: string;
}

export default function MonthlyPaymentBreakdown({
  tenantId,
  landlordId,
  propertyId,
  title = "Payment History",
}: MonthlyPaymentBreakdownProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  // Fetch payment history
  const { data: payments = [], isLoading } = useQuery<PaymentHistoryItem[]>({
    queryKey: ["payment-history", { tenantId, landlordId, propertyId }],
    queryFn: async () => {
      let url = "";
      if (tenantId) {
        url = `/api/payment-history/tenant/${tenantId}`;
      } else if (landlordId) {
        url = `/api/payment-history/landlord/${landlordId}`;
      } else if (propertyId) {
        url = `/api/payment-history/property/${propertyId}`;
      }

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch payment history");
      return response.json();
    },
    enabled: !!(tenantId || landlordId || propertyId),
  });

  // Get unique years from payment history (only years that have payments)
  const availableYears = useMemo(() => {
    const years = new Set(payments.map((p) => p.forYear));
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [payments]);

  // Filter payments by selected year
  const yearPayments = useMemo(() => {
    return payments.filter((p) => p.forYear === parseInt(selectedYear));
  }, [payments, selectedYear]);

  // Group payments by tenant, then by month (only bill records, not transactions)
  const tenantPaymentGroups = useMemo(() => {
    const groups: Record<string, {
      tenantId: string;
      tenantName: string;
      propertyName: string;
      payments: Record<number, PaymentHistoryItem[]>;
    }> = {};
    
    // Filter to only bill records
    const billRecords = yearPayments.filter(p => !isTransactionRecord(p));
    
    billRecords.forEach((payment) => {
      const tenantId = payment.tenant?.id || payment.tenant?._id || 'unknown';
      const tenantName = payment.tenant?.name || 'Unknown Tenant';
      const propertyName = payment.property?.name || 'Unknown Property';
      
      if (!groups[tenantId]) {
        groups[tenantId] = {
          tenantId,
          tenantName,
          propertyName,
          payments: {}
        };
      }
      
      if (!groups[tenantId].payments[payment.forMonth]) {
        groups[tenantId].payments[payment.forMonth] = [];
      }
      
      groups[tenantId].payments[payment.forMonth].push(payment);
    });

    return groups;
  }, [yearPayments]);

  // Calculate totals per tenant
  const tenantTotals = useMemo(() => {
    const totals: Record<string, { expected: number; paid: number; balance: number }> = {};
    
    Object.entries(tenantPaymentGroups).forEach(([tenantId, group]) => {
      let expected = 0;
      let paid = 0;
      
      Object.values(group.payments).forEach(monthPayments => {
        monthPayments.forEach(payment => {
          expected += expectedForBill(payment);
          paid += paidForBill(payment);
        });
      });
      
      totals[tenantId] = {
        expected,
        paid,
        balance: expected - paid
      };
    });
    
    return totals;
  }, [tenantPaymentGroups]);

  const toggleTenant = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };

  // Download receipt handler
  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`);
      
      if (!response.ok) {
        throw new Error('Failed to download receipt');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${paymentId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Small delay before cleanup to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Calculate totals for the year
  const yearTotals = useMemo(() => {
    return yearPayments
      .filter(p => !isTransactionRecord(p))
      .reduce(
        (acc, payment) => {
          const expectedAmount = expectedForBill(payment);
          const paidAmount = paidForBill(payment);
          acc.totalPaid += paidAmount;
          acc.totalExpected += expectedAmount;
          return acc;
        },
        { totalPaid: 0, totalExpected: 0 }
      );
  }, [yearPayments]);

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "overpaid":
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Calendar className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      partial: "secondary",
      overpaid: "default",
      pending: "outline",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={cn(
        status === "completed" && "bg-green-100 text-green-800 hover:bg-green-100",
        status === "overpaid" && "bg-blue-100 text-blue-800 hover:bg-blue-100",
        status === "partial" && "bg-orange-100 text-orange-800 hover:bg-orange-100"
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-neutral-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payment history found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          
          {/* Year Filter */}
          <div className="w-32">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {Object.keys(tenantPaymentGroups).length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No payments for {selectedYear}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grouped by Tenant */}
            <div className="space-y-3">
              {Object.entries(tenantPaymentGroups).map(([tenantId, group]) => {
                const totals = tenantTotals[tenantId];
                const isExpanded = expandedTenants.has(tenantId);
                const monthCount = Object.keys(group.payments).length;
                
                // Get sorted months for this tenant (most recent first)
                const tenantMonths = Object.keys(group.payments)
                  .map(Number)
                  .sort((a, b) => b - a);
                
                return (
                  <Collapsible
                    key={tenantId}
                    open={isExpanded}
                    onOpenChange={() => toggleTenant(tenantId)}
                  >
                    <div className="border rounded-lg bg-white overflow-hidden">
                      {/* Tenant Header - Clickable */}
                      <CollapsibleTrigger asChild>
                        <div className="p-4 hover:bg-neutral-50 cursor-pointer transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-neutral-500" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-neutral-500" />
                              )}
                              <User className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-semibold text-neutral-900">{group.tenantName}</h4>
                                <p className="text-sm text-neutral-500">{group.propertyName} · {monthCount} {monthCount === 1 ? 'bill' : 'bills'}</p>
                              </div>
                            </div>
                            
                            {/* Tenant Summary */}
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-neutral-500">Total Paid</p>
                                <p className="font-semibold text-green-600">KSH {totals.paid.toLocaleString()}</p>
                              </div>
                              {totals.balance !== 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-neutral-500">Balance</p>
                                  <p className={`font-semibold ${totals.balance > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                                    KSH {Math.abs(totals.balance).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      {/* Collapsible Content - Monthly Bills */}
                      <CollapsibleContent>
                        <div className="border-t bg-neutral-50 p-4 space-y-3">
                          {tenantMonths.map((month) => {
                            const monthPayments = group.payments[month];
                            const billRecord = monthPayments[0]; // Should only be one bill per month
                            const expectedAmount = expectedForBill(billRecord);
                            const paidAmount = paidForBill(billRecord);
                            const balanceAmount = expectedAmount - paidAmount;
                      
                            return (
                              <div
                                key={month}
                                className="bg-white border rounded-lg p-3 space-y-3"
                              >
                                {/* Month Header */}
                                <div className="flex items-center justify-between pb-2 border-b">
                                  <div className="flex items-center gap-2">
                                    {getPaymentStatusIcon(billRecord.status)}
                                    <h5 className="font-medium text-neutral-900">
                                      {formatPaymentHistoryMonth(month, parseInt(selectedYear))}
                                    </h5>
                                  </div>
                                  {getPaymentStatusBadge(billRecord.status)}
                                </div>
                                
                                {/* Bill Summary Grid */}
                                <div className="grid grid-cols-4 gap-4 bg-neutral-50 rounded-lg p-3">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Expected</p>
                            <p className="font-semibold text-neutral-900">
                              KSH {expectedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Paid</p>
                            <p className="font-semibold text-green-600">
                              KSH {paidAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Balance</p>
                            <p className={`font-semibold ${balanceAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              KSH {Math.abs(balanceAmount).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Method</p>
                            <p className="font-medium text-sm text-neutral-700">
                              {billRecord.paymentMethod || "Cash"}
                            </p>
                          </div>
                        </div>

                        {/* Download Receipt Button - Only for completed payments */}
                        {billRecord.status === "completed" && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReceipt(billRecord._id)}
                              disabled={downloadingId === billRecord._id}
                              className="gap-2"
                            >
                              {downloadingId === billRecord._id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                  Download Receipt
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Utility Charges Breakdown */}
                        {billRecord.utilityCharges && billRecord.utilityCharges.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="h-4 w-4 text-amber-600" />
                              <p className="text-sm font-semibold text-amber-900">Utility Charges</p>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-sm text-neutral-700">
                                <span className="font-medium">Rent:</span> KSH {billRecord.monthlyRent.toLocaleString()}
                              </div>
                              
                              {billRecord.utilityCharges.map((utility, idx) => (
                                <div key={idx} className="text-sm text-neutral-700">
                                  <span className="font-medium">{utility.type}:</span>{" "}
                                  {utility.unitsUsed} units × KSH {utility.pricePerUnit.toLocaleString()} = KSH {utility.total.toLocaleString()}
                                </div>
                              ))}
                              
                              {billRecord.totalUtilityCost && billRecord.totalUtilityCost > 0 && (
                                <div className="pt-2 border-t border-amber-300 text-sm font-semibold text-amber-900">
                                  Total Utilities: KSH {billRecord.totalUtilityCost.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
