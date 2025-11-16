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
import RecordPaymentDialog from "./RecordPaymentDialog";
import type { Tenant } from "@/types/dashboard";

interface PaymentOverviewProps {
  landlordId: string;
}

export default function PaymentOverview({ landlordId }: PaymentOverviewProps) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

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

    const paid = filteredTenants.filter(
      (t) =>
        t.rentCycle?.currentMonthPaid &&
        t.rentCycle.paidForMonth === month &&
        t.rentCycle.paidForYear === year
    ).length;

    const overdue = filteredTenants.filter((t) => t.rentCycle?.rentStatus === "overdue").length;
    const gracePeriod = filteredTenants.filter((t) => t.rentCycle?.rentStatus === "grace_period")
      .length;
    const unpaid = filteredTenants.length - paid;

    // Calculate base rent (sum of all monthly rent commitments)
    const totalBaseRent = filteredTenants.reduce((sum, t) => sum + t.rentAmount, 0);
    
    // Get bills for selected month/year
    const monthBills = paymentHistory.filter((p: any) => 
      p.forMonth === month && p.forYear === year &&
      filteredTenants.some((t) => t.id === p.tenantId)
    );
    
    // Calculate total billed (rent + utilities from actual bills)
    const totalBilled = monthBills.reduce((sum: number, bill: any) => {
      const billAmount = bill.monthlyRent + (bill.totalUtilityCost || 0);
      return sum + billAmount;
    }, 0);
    
    // Calculate total collected (what's actually been paid)
    const totalCollected = monthBills.reduce((sum: number, bill: any) => {
      if (bill.status === 'completed' || bill.status === 'overpaid') {
        return sum + bill.monthlyRent + (bill.totalUtilityCost || 0);
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
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Payment Overview</CardTitle>

            <div className="flex flex-wrap gap-2">
              {/* Property Filter */}
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[180px]">
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

              {/* Month Filter */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Filter */}
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
          {/* Stats Cards - Modern Design with Gradients */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 border-0 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-700">Paid</p>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.paid}</p>
                <p className="text-xs text-green-600 mt-1">Tenants</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 border-0 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-orange-700">Unpaid</p>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-900">{stats.unpaid}</p>
                <p className="text-xs text-orange-600 mt-1">Tenants</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-100 border-0 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-amber-700">Grace Period</p>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-900">{stats.gracePeriod}</p>
                <p className="text-xs text-amber-600 mt-1">Tenants</p>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 border-0 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-red-700">Overdue</p>
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-900">{stats.overdue}</p>
                <p className="text-xs text-red-600 mt-1">Tenants</p>
              </div>
            </div>
          </div>

          {/* Collection Summary - Modern Design */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
            <div className="relative flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-100 mb-1 font-medium">Total Collected</p>
                <p className="text-4xl font-bold text-white mb-1">
                  KSH {stats.totalCollected.toLocaleString()}
                </p>
                <p className="text-xs text-blue-200">
                  {((stats.totalCollected / (stats.totalExpected || 1)) * 100).toFixed(1)}% collection rate
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100 mb-1 font-medium">
                  {stats.hasBills ? "Total Billed" : "Base Rent"}
                </p>
                <p className="text-3xl font-bold text-white">
                  KSH {stats.totalExpected.toLocaleString()}
                </p>
                {!stats.hasBills && (
                  <p className="text-xs text-blue-200 mt-1">
                    Bills not yet created
                  </p>
                )}
              </div>
            </div>
            <div className="relative mt-4">
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-white to-blue-100 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{
                    width: `${Math.min((stats.totalCollected / stats.totalExpected) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tenant List - Modern Cards */}
          <div className="space-y-3">
            <h4 className="font-semibold text-base text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></span>
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
                  className="relative group flex items-center justify-between p-5 bg-white border-0 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Status indicator line */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                    monthStatus.status === 'paid' && "bg-gradient-to-b from-green-500 to-emerald-600",
                    monthStatus.status === 'overdue' && "bg-gradient-to-b from-red-500 to-rose-600",
                    monthStatus.status === 'grace' && "bg-gradient-to-b from-orange-500 to-amber-600",
                    monthStatus.status === 'unpaid' && "bg-gradient-to-b from-neutral-300 to-neutral-400"
                  )}></div>

                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neutral-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                  <div className="relative flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12 ring-2 ring-neutral-100 shadow-sm">
                      <AvatarImage src={tenant.avatar || tenant.profileImage} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">{getInitials(tenant.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">{tenant.name}</p>
                      <p className="text-sm text-neutral-500 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {tenant.propertyName} · {tenant.unitNumber}
                      </p>
                    </div>

                    <div className="text-right mr-4 px-4 py-2 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-0.5">Monthly Rent</p>
                      <p className="font-bold text-neutral-900">KSH {tenant.rentAmount.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        monthStatus.color,
                        "shadow-sm border-0 font-medium px-3 py-1"
                      )}>
                        <span className="flex items-center gap-1.5">
                          {monthStatus.icon}
                          {monthStatus.badge}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRecordPaymentTenant(tenant)}
                    className="relative ml-4 border-2 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Bill
                  </Button>
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
