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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import RecordPaymentDialog from "./RecordPaymentDialog";
import type { Tenant } from "@/types/dashboard";

interface PaymentOverviewProps {
  landlordId: string;
}

export default function PaymentOverview({ landlordId }: PaymentOverviewProps) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const isMobile = useIsMobile();

  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [recordPaymentTenant, setRecordPaymentTenant] = useState<Tenant | null>(null);

  // Fetch tenants
  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["tenants", landlordId],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/landlord/${landlordId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch tenants");
      return response.json();
    },
  });

  // Fetch payment history to check for bills
  const { data: paymentHistory = [] } = useQuery<any[]>({
    queryKey: [`/api/payment-history/landlord/${landlordId}`],
    queryFn: async () => {
      const response = await fetch(`/api/payment-history/landlord/${landlordId}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!landlordId,
  });

  // Get unique properties
  const properties = useMemo(() => {
    const uniqueProps = new Map();
    tenants.forEach((tenant) => {
      if (!uniqueProps.has(tenant.propertyId)) {
        uniqueProps.set(tenant.propertyId, tenant.propertyName);
      }
    });
    return Array.from(uniqueProps.entries()).map(([id, name]) => ({ id, name }));
  }, [tenants]);

  // Filter tenants by property
  const filteredTenants = useMemo(() => {
    if (selectedProperty === "all") return tenants;
    return tenants.filter((t) => t.propertyId === selectedProperty);
  }, [tenants, selectedProperty]);

  // Calculate stats for selected month/year
  const stats = useMemo(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    // Count paid tenants: those with completed/overpaid bills for the selected month
    const paid = filteredTenants.filter((t) => {
      const tenantBill = paymentHistory.find((bill: any) => 
        bill.tenantId === t.id && 
        bill.forMonth === month && 
        bill.forYear === year
      );
      
      // Tenant is paid if they have a completed or overpaid bill
      if (tenantBill && (tenantBill.status === 'completed' || tenantBill.status === 'overpaid')) {
        return true;
      }
      
      // Fallback to rent cycle
      return t.rentCycle?.currentMonthPaid &&
        t.rentCycle.paidForMonth === month &&
        t.rentCycle.paidForYear === year;
    }).length;

    const overdue = filteredTenants.filter((t) => t.rentCycle?.rentStatus === "overdue").length;
    const gracePeriod = filteredTenants.filter((t) => t.rentCycle?.rentStatus === "grace_period")
      .length;
    const unpaid = filteredTenants.length - paid;

    // Calculate base rent (sum of all monthly rent commitments from tenants)
    const totalBaseRent = filteredTenants.reduce((sum, t) => sum + t.rentAmount, 0);
    
    // Get bills for selected month/year
    const monthBills = paymentHistory.filter((p: any) => 
      p.forMonth === month && p.forYear === year &&
      filteredTenants.some((t) => t.id === p.tenantId)
    );
    
    // CRITICAL: Calculate total billed using BASE RENT from tenant + utilities from bill
    // DO NOT use bill.monthlyRent as it may have utilities double-counted
    const totalBilled = monthBills.reduce((sum: number, bill: any) => {
      // Find the tenant for this bill to get their BASE rent
      const tenant = filteredTenants.find((t) => t.id === bill.tenantId);
      const baseRent = tenant ? tenant.rentAmount : 0;
      const utilities = bill.totalUtilityCost || 0;
      const billAmount = baseRent + utilities;
      return sum + billAmount;
    }, 0);
    
    // CRITICAL: Calculate total collected using BASE RENT + utilities
    const totalCollected = monthBills.reduce((sum: number, bill: any) => {
      const tenant = filteredTenants.find((t) => t.id === bill.tenantId);
      const baseRent = tenant ? tenant.rentAmount : 0;
      const utilities = bill.totalUtilityCost || 0;
      const expectedAmount = baseRent + utilities;
      
      if (bill.status === 'completed' || bill.status === 'overpaid') {
        return sum + expectedAmount;
      } else if (bill.status === 'partial') {
        return sum + (bill.amount || 0);
      }
      return sum;
    }, 0);

    // Use billed amount if bills exist, otherwise show base rent
    const totalExpected = monthBills.length > 0 ? totalBilled : totalBaseRent;
    const hasBills = monthBills.length > 0;

    return { paid, unpaid, overdue, gracePeriod, totalExpected, totalCollected, totalBaseRent, hasBills };
  }, [filteredTenants, paymentHistory, selectedMonth, selectedYear]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getPaymentStatusForMonth = (tenant: Tenant, month: number, year: number) => {
    // Check if there's a bill for this tenant in this month/year
    const tenantBill = paymentHistory.find((bill: any) => 
      bill.tenantId === tenant.id && 
      bill.forMonth === month && 
      bill.forYear === year
    );

    // If bill exists, use bill status to determine payment status
    if (tenantBill) {
      if (tenantBill.status === 'completed' || tenantBill.status === 'overpaid') {
        return {
          status: "paid",
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          badge: "Paid",
          color: "bg-green-100 text-green-800",
        };
      }
      
      if (tenantBill.status === 'partial') {
        return {
          status: "partial",
          icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
          badge: "Partial",
          color: "bg-orange-100 text-orange-800",
        };
      }
    }

    // Fallback to rent cycle logic if no bill found
    if (
      tenant.rentCycle?.currentMonthPaid &&
      tenant.rentCycle.paidForMonth === month &&
      tenant.rentCycle.paidForYear === year
    ) {
      return {
        status: "paid",
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        badge: "Paid",
        color: "bg-green-100 text-green-800",
      };
    }

    if (tenant.rentCycle?.rentStatus === "overdue") {
      return {
        status: "overdue",
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        badge: "Overdue",
        color: "bg-red-100 text-red-800",
      };
    }

    if (tenant.rentCycle?.rentStatus === "grace_period") {
      return {
        status: "grace",
        icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
        badge: "Grace Period",
        color: "bg-orange-100 text-orange-800",
      };
    }

    return {
      status: "unpaid",
      icon: <AlertCircle className="h-5 w-5 text-neutral-400" />,
      badge: "Not Paid",
      color: "bg-neutral-100 text-neutral-600",
    };
  };

  // Generate years (current year and 2 years back)
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Generate months
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base md:text-lg">Payment Overview</CardTitle>

          <div className="flex flex-col gap-2">
            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[180px]'}`}>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Month and Year Filters */}
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {isMobile ? month.label.slice(0, 3) : month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
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
          {/* Stats Cards - Minimalist Design */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Paid</p>
                <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{stats.paid}</p>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-1">tenants</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Unpaid</p>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{stats.unpaid}</p>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-1">tenants</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Grace</p>
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{stats.gracePeriod}</p>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-1">tenants</p>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 md:p-4 bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] md:text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
                <XCircle className="h-3 w-3 md:h-4 md:w-4 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{stats.overdue}</p>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-1">tenants</p>
            </div>
          </div>

          {/* Collection Summary - Minimalist Design */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6 mb-4 md:mb-6 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900/50 dark:to-slate-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex-1">
                <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 md:mb-2">Total Collected</p>
                <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  KSH {stats.totalCollected.toLocaleString()}
                </p>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {((stats.totalCollected / (stats.totalExpected || 1)) * 100).toFixed(1)}% collection rate
                </p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expected</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  KSH {stats.totalExpected.toLocaleString()}
                </p>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.hasBills ? `of billed amount` : 'based on agreements'}
                </p>
              </div>
              {!isMobile && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 text-right">Collection Rate</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white text-right">
                    {stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tenant List - Minimalist Cards */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs md:text-sm text-gray-700 dark:text-gray-300 mb-2 md:mb-3 uppercase tracking-wide">
              Tenants ({filteredTenants.length})
            </h4>
            {filteredTenants.map((tenant) => {
              const monthStatus = getPaymentStatusForMonth(
                tenant,
                parseInt(selectedMonth),
                parseInt(selectedYear)
              );

              return (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-2 md:p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                >
                  {/* Left side - Tenant info */}
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <AvatarImage src={tenant.avatar || tenant.profileImage} />
                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">{getInitials(tenant.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base text-gray-900 dark:text-white truncate">{tenant.name}</p>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">
                        {tenant.propertyName} • {tenant.unitNumber}
                      </p>
                    </div>
                  </div>

                  {/* Right side - Amount and Status */}
                  <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
                    {!isMobile && (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Rent</p>
                          <p className="font-semibold text-gray-900 dark:text-white">KSH {tenant.rentAmount.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                      </>
                    )}
                    <Badge className={cn(
                      "text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 border-0",
                      monthStatus.status === 'paid' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                      monthStatus.status === 'overdue' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                      monthStatus.status === 'grace' && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
                      monthStatus.status === 'unpaid' && "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}>
                      {isMobile ? monthStatus.badge.slice(0, 4) : monthStatus.badge}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRecordPaymentTenant(tenant)}
                      className="text-xs h-7 md:h-8 w-7 md:w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      {recordPaymentTenant && (
        <RecordPaymentDialog
          open={!!recordPaymentTenant}
          onOpenChange={(open) => !open && setRecordPaymentTenant(null)}
          tenant={recordPaymentTenant}
        />
      )}
    </>
  );
}
