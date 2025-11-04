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
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Zap } from "lucide-react";
import { isTransactionRecord, expectedForBill, paidForBill } from "@/lib/payment-utils";
import { cn } from "@/lib/utils";
import { formatPaymentHistoryMonth } from "@/lib/rent-cycle-utils";

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

  // Group payments by month
  const monthlyBreakdown = useMemo(() => {
    const breakdown: Record<number, PaymentHistoryItem[]> = {};
    
    yearPayments.forEach((payment) => {
      if (!breakdown[payment.forMonth]) {
        breakdown[payment.forMonth] = [];
      }
      breakdown[payment.forMonth].push(payment);
    });

    return breakdown;
  }, [yearPayments]);

  // Get only months that have payments, sorted
  const billedMonths = useMemo(() => {
    return Object.keys(monthlyBreakdown)
      .map(Number)
      .sort((a, b) => b - a); // Most recent first
  }, [monthlyBreakdown]);

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
        {billedMonths.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No payments for {selectedYear}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Year Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-neutral-600">Total Paid in {selectedYear}</p>
                  <p className="text-2xl font-bold text-blue-900">
                    KSH {yearTotals.totalPaid.toLocaleString()}
                  </p>
                </div>
                {yearTotals.totalExpected > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-neutral-600">Expected</p>
                    <p className="text-lg font-semibold text-neutral-700">
                      KSH {yearTotals.totalExpected.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Breakdown */}
            <div className="space-y-3">
              {billedMonths.map((month) => {
                const monthPayments = monthlyBreakdown[month];
                // Sum amounts based on actual paid amounts and expected using helpers
                const nonTransactionPayments = monthPayments.filter(p => !isTransactionRecord(p));
                const monthTotal = nonTransactionPayments.reduce((sum, p) => sum + paidForBill(p), 0);
                // Calculate expected for this month (rent + utilities from all bills for this month)
                const monthExpected = nonTransactionPayments.reduce((sum, p) => sum + expectedForBill(p), 0);
                const isPaid = monthTotal >= monthExpected && monthExpected > 0;
                
                return (
                  <div
                    key={month}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(monthPayments[0].status)}
                        <h4 className="font-semibold">
                          {formatPaymentHistoryMonth(month, parseInt(selectedYear))}
                        </h4>
                      </div>
                      {getPaymentStatusBadge(monthPayments[0].status)}
                    </div>

                    {monthPayments.map((payment) => (
                      <div
                        key={payment._id}
                        className="space-y-3 py-2 border-t first:border-t-0"
                      >
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-neutral-600">Payment Date</p>
                            <p className="font-medium">
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-600">Amount</p>
                            <p className="font-medium">KSH {payment.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-600">Method</p>
                            <p className="font-medium text-sm">
                              {payment.paymentMethod || "Not specified"}
                            </p>
                          </div>
                        </div>

                        {/* Utility Charges Breakdown */}
                        {payment.utilityCharges && payment.utilityCharges.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="h-4 w-4 text-amber-600" />
                              <p className="text-sm font-semibold text-amber-900">Utility Charges</p>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-sm text-neutral-700">
                                <span className="font-medium">Rent:</span> KSH {payment.monthlyRent.toLocaleString()}
                              </div>
                              
                              {payment.utilityCharges.map((utility, idx) => (
                                <div key={idx} className="text-sm text-neutral-700">
                                  <span className="font-medium">{utility.type}:</span>{" "}
                                  {utility.unitsUsed} units × KSH {utility.pricePerUnit.toLocaleString()} = KSH {utility.total.toLocaleString()}
                                </div>
                              ))}
                              
                              {payment.totalUtilityCost && payment.totalUtilityCost > 0 && (
                                <div className="pt-2 border-t border-amber-300 text-sm font-semibold text-amber-900">
                                  Total Utilities: KSH {payment.totalUtilityCost.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {payment.notes && (
                          <div className="text-sm text-neutral-600 italic">
                            {payment.notes}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Month Summary - Show Expected vs Paid */}
                    <div className="mt-3 pt-3 border-t bg-neutral-50 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Expected (Rent + Utilities):</span>
                          <span className="font-medium">KSH {monthExpected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600">Paid:</span>
                          <span className={`font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                            KSH {monthTotal.toLocaleString()}
                          </span>
                        </div>
                        {!isPaid && monthTotal === 0 && (
                          <div className="flex justify-between text-sm pt-1 border-t">
                            <span className="font-medium text-orange-600">Outstanding:</span>
                            <span className="font-bold text-orange-600">
                              KSH {monthExpected.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {monthTotal > 0 && monthTotal < monthExpected && (
                          <div className="flex justify-between text-sm pt-1 border-t">
                            <span className="font-medium text-orange-600">Balance Due:</span>
                            <span className="font-bold text-orange-600">
                              KSH {(monthExpected - monthTotal).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
