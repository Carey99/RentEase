import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, DollarSign, TrendingUp, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isTransactionRecord, expectedForBill, paidForBill, balanceForBill, sumOutstanding, expectedForCurrentMonth, balanceForCurrentMonth } from "@/lib/payment-utils";

interface PaymentRecord {
  _id: string;
  amount: number;
  forMonth: number;
  forYear: number;
  paymentDate: Date;
  monthlyRent: number;
  status: 'pending' | 'partial' | 'completed' | 'overpaid' | 'failed';
  utilityCharges?: Array<{
    type: string;
    unitsUsed: number;
    pricePerUnit: number;
    total: number;
  }>;
  totalUtilityCost?: number;
}

interface TenantDebtInfo {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  payments: PaymentRecord[];
  monthlyRent: number;
}

interface DebtTrackingTabProps {
  tenants: TenantDebtInfo[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DebtTrackingTab({ tenants }: DebtTrackingTabProps) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { toast } = useToast();

  // State for selected month filter
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Filter tenants who have at least one payment record (bill created)
  const tenantsWithPaymentHistory = tenants.filter(tenant => tenant.payments.length > 0);

  // Get all unique months/years from payment history
  const availableMonths = useMemo(() => {
    const monthYearSet = new Set<string>();
    tenantsWithPaymentHistory.forEach(tenant => {
      tenant.payments.forEach(payment => {
        monthYearSet.add(`${payment.forMonth}-${payment.forYear}`);
      });
    });
    
    return Array.from(monthYearSet)
      .map(key => {
        const [month, year] = key.split('-').map(Number);
        return { month, year };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [tenantsWithPaymentHistory]);

  // Calculate debt summary for each tenant
  const tenantsWithDebt = tenantsWithPaymentHistory.map(tenant => {
    // Get selected month's payment record (bill only, not transactions)
    const selectedMonthPayment = tenant.payments.find(
      p => p.forMonth === selectedMonth && 
           p.forYear === selectedYear &&
           !(p as any).notes?.includes('Payment transaction')
    );

    // Filter all bills (no transactions)
    const allBills = tenant.payments.filter((p: any) => !isTransactionRecord(p));

    // Calculate CONSOLIDATED expected amount (includes historical debts)
    const expectedAmount = expectedForCurrentMonth(allBills, selectedMonth, selectedYear, tenant.monthlyRent);
    
    // Amount actually paid against current month's bill
    const amountPaid = selectedMonthPayment ? paidForBill(selectedMonthPayment) : 0;
    
    // Outstanding balance using consolidated calculation
    const outstandingBalance = balanceForCurrentMonth(allBills, selectedMonth, selectedYear, tenant.monthlyRent);
    
    // Determine status based on consolidated balance
    let paymentStatus: string;
    if (!selectedMonthPayment) {
      paymentStatus = 'no_bill';
    } else if (outstandingBalance === 0) {
      paymentStatus = 'completed';
    } else if (outstandingBalance < 0) {
      paymentStatus = 'overpaid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'pending';
    }

    // Find the last payment made by this tenant (any payment with amount > 0)
    const paymentsWithAmount = tenant.payments
      .filter((p: any) => p.amount > 0 && (p.status === 'completed' || p.status === 'partial' || p.status === 'overpaid'))
      .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    
    const lastPayment = paymentsWithAmount.length > 0 ? paymentsWithAmount[0] : null;
    
    // Calculate days since last payment
    let daysSinceLastPayment = null;
    let lastPaymentDate = null;
    if (lastPayment) {
      lastPaymentDate = new Date(lastPayment.paymentDate);
      
      // Normalize both dates to UTC midnight to avoid timezone issues
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const paymentUTC = Date.UTC(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), lastPaymentDate.getDate());
      
      // Calculate difference in days
      const daysDiff = Math.round((todayUTC - paymentUTC) / (1000 * 60 * 60 * 24));
      daysSinceLastPayment = Math.abs(daysDiff); // Use absolute value to avoid negatives
    }

    // Calculate TOTAL debt across ALL months (not just historical) using centralized helpers
    const allDebts = (tenant.payments || [])
      .filter((p: any) => !isTransactionRecord(p))
      .map(p => {
        const expectedForMonth = expectedForBill(p, tenant.monthlyRent);
        const paidForMonth = paidForBill(p);
        return {
          month: p.forMonth,
          year: p.forYear,
          expected: expectedForMonth,
          paid: paidForMonth,
          balance: expectedForMonth - paidForMonth,
          status: p.status
        };
      });

    // Total debt is the CONSOLIDATED balance for the current/selected month
    // (includes historical debts that are rolled into current month)
    const totalDebt = outstandingBalance > 0 ? outstandingBalance : 0;

    // Get historical debts (for the breakdown section)
    // IMPORTANT: With consolidated billing, historical debts are included in current month
    // Only show historical debts if current month is NOT fully paid
    // If current month IS paid (totalDebt = 0), then historical debts are also resolved
    const historicalDebts = totalDebt > 0 
      ? allDebts.filter(debt => 
          debt.balance > 0 && (
            debt.year < selectedYear || 
            (debt.year === selectedYear && debt.month < selectedMonth)
          )
        )
      : []; // If consolidated bill is paid, all historical debts are resolved

    return {
      ...tenant,
      selectedMonth: {
        month: selectedMonth,
        year: selectedYear,
        expected: expectedAmount,
        paid: amountPaid,
        balance: outstandingBalance,
        status: paymentStatus,
        rent: selectedMonthPayment?.monthlyRent || tenant.monthlyRent,
        utilities: selectedMonthPayment?.totalUtilityCost || 0
      },
      lastPayment: {
        date: lastPaymentDate,
        daysSince: daysSinceLastPayment,
        amount: lastPayment?.amount || 0
      },
      historicalDebts,
      totalDebt,
      hasDebt: totalDebt > 0
    };
  });

  // Filter to show ONLY tenants with outstanding debt (remove fully paid tenants)
  const tenantsWithOutstandingDebt = tenantsWithDebt.filter(t => t.totalDebt > 0);
  
  // Sort by total debt (highest first)
  const sortedTenants = tenantsWithOutstandingDebt.sort((a, b) => b.totalDebt - a.totalDebt);

  // Calculate overall statistics
  const totalOutstanding = sortedTenants.reduce((sum, t) => sum + t.totalDebt, 0);
  const tenantsWithDebtCount = sortedTenants.length; // All shown tenants have debt
  const totalExpectedThisMonth = sortedTenants.reduce((sum, t) => sum + t.selectedMonth.expected, 0);
  const totalCollectedThisMonth = sortedTenants.reduce((sum, t) => sum + t.selectedMonth.paid, 0);
  const collectionRate = totalExpectedThisMonth > 0 
    ? Math.round((totalCollectedThisMonth / totalExpectedThisMonth) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Not Paid</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-orange-500">Partial</Badge>;
      case 'overpaid':
        return <Badge className="bg-blue-500">Overpaid</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'no_bill':
        return <Badge className="bg-gray-400">No Bill</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleSendReminder = async (tenantId: string, tenantName: string) => {
    setSendingReminder(tenantId);
    try {
      const response = await fetch(`/api/emails/send-reminder/${tenantId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reminder');
      }

      toast({
        title: "Reminder Sent",
        description: `Payment reminder sent to ${tenantName}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Reminder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-600">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">
                KSH {totalOutstanding.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-600">Tenants with Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">
                {tenantsWithDebtCount} / {sortedTenants.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-600">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">
                {collectionRate}%
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {MONTHS[currentMonth - 1]} {currentYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-600">Expected This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                KSH {totalExpectedThisMonth.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Collected: KSH {totalCollectedThisMonth.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Debt Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Tenant Debt Tracking
              </CardTitle>
              <p className="text-sm text-neutral-500 mt-2">
                Comprehensive view of all tenant payment obligations and outstanding balances
              </p>
            </div>
            
            {/* Month/Year Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700">View Month:</label>
                <Select
                  value={`${selectedMonth}-${selectedYear}`}
                  onValueChange={(value) => {
                    const [month, year] = value.split('-').map(Number);
                    setSelectedMonth(month);
                    setSelectedYear(year);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(({ month, year }) => (
                      <SelectItem key={`${month}-${year}`} value={`${month}-${year}`}>
                        {MONTHS[month - 1]} {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>{MONTHS[selectedMonth - 1]} {selectedYear}</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Last Paid</TableHead>
                  <TableHead className="text-right">Total Owed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-12 w-12 text-neutral-300" />
                        <div className="text-neutral-500">
                          <p className="font-medium">No payment records yet</p>
                          <p className="text-sm mt-1">Record payments for your tenants to start tracking debts</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTenants.map((tenant) => (
                    <TableRow 
                      key={tenant.tenantId}
                      className={tenant.hasDebt ? 'bg-red-50/50' : 'bg-green-50/30'}
                    >
                      <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{tenant.propertyName}</div>
                          <div className="text-neutral-500">Unit {tenant.unitNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {MONTHS[tenant.selectedMonth.month - 1]} {tenant.selectedMonth.year}
                        </div>
                        {tenant.selectedMonth.utilities > 0 && (
                          <div className="text-xs text-amber-600">
                            +KSH {tenant.selectedMonth.utilities.toLocaleString()} utilities
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        KSH {tenant.selectedMonth.expected.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        KSH {tenant.selectedMonth.paid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={tenant.selectedMonth.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          KSH {tenant.selectedMonth.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.lastPayment.daysSince !== null ? (
                          <div>
                            <span className="font-medium text-neutral-700">
                              {tenant.lastPayment.daysSince === 0 
                                ? 'Today' 
                                : tenant.lastPayment.daysSince === 1
                                ? '1 day ago'
                                : `${tenant.lastPayment.daysSince} days ago`}
                            </span>
                            <div className="text-xs text-neutral-500 mt-1">
                              {tenant.lastPayment.date?.toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">Never paid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tenant.totalDebt > 0 ? (
                          <div>
                            <span className="font-bold text-lg text-red-600">
                              KSH {tenant.totalDebt.toLocaleString()}
                            </span>
                            {tenant.selectedMonth.balance < 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                (Current month: +{Math.abs(tenant.selectedMonth.balance)} credit)
                              </div>
                            )}
                          </div>
                        ) : tenant.selectedMonth.balance < 0 ? (
                          <span className="font-bold text-lg text-blue-600">
                            KSH {Math.abs(tenant.selectedMonth.balance).toLocaleString()} (Credit)
                          </span>
                        ) : (
                          <span className="font-bold text-lg text-green-600">
                            KSH 0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tenant.selectedMonth.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(tenant.tenantId, tenant.tenantName)}
                          disabled={sendingReminder === tenant.tenantId}
                          className="h-8"
                        >
                          {sendingReminder === tenant.tenantId ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-1 h-3 w-3" />
                              Send Reminder
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Historical Debts Breakdown */}
          {sortedTenants.some(t => t.historicalDebts.length > 0) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-neutral-800">Historical Debt Details</h3>
              {sortedTenants
                .filter(t => t.historicalDebts.length > 0)
                .map(tenant => (
                  <Card key={tenant.tenantId} className="border-red-200 bg-red-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{tenant.tenantName} - {tenant.propertyName}</span>
                        <Badge className="bg-red-600">
                          Total: KSH {tenant.historicalDebts.reduce((sum, d) => sum + d.balance, 0).toLocaleString()}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tenant.historicalDebts.map((debt, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between p-3 bg-white rounded border border-red-100"
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="font-medium">
                                  {MONTHS[debt.month - 1]} {debt.year}
                                </div>
                                <div className="text-sm text-neutral-500">
                                  {getStatusBadge(debt.status)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-sm text-neutral-600">
                                Expected: KSH {debt.expected.toLocaleString()}
                              </div>
                              <div className="text-sm text-green-600">
                                Paid: KSH {debt.paid.toLocaleString()}
                              </div>
                              <div className="text-base font-bold text-red-600">
                                Owed: KSH {debt.balance.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
