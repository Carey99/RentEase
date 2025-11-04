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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-neutral-600 mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-900">{stats.paid}</p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <p className="text-sm text-neutral-600 mb-1">Unpaid</p>
              <p className="text-2xl font-bold text-neutral-900">{stats.unpaid}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-neutral-600 mb-1">Grace Period</p>
              <p className="text-2xl font-bold text-orange-900">{stats.gracePeriod}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-neutral-600 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
            </div>
          </div>

          {/* Collection Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-600">Total Collected</p>
                <p className="text-2xl font-bold text-blue-900">
                  KSH {stats.totalCollected.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600">
                  {stats.hasBills ? "Total Billed" : "Base Rent"}
                </p>
                <p className="text-xl font-semibold text-neutral-700">
                  KSH {stats.totalExpected.toLocaleString()}
                </p>
                {!stats.hasBills && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Bills not yet created
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min((stats.totalCollected / stats.totalExpected) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                {stats.totalExpected > 0
                  ? `${((stats.totalCollected / stats.totalExpected) * 100).toFixed(1)}% collected`
                  : "No expected payments"}
              </p>
            </div>
          </div>

          {/* Tenant List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-neutral-700 mb-3">
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
                  className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={tenant.avatar || tenant.profileImage} />
                      <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-neutral-600">
                        {tenant.propertyName} - {tenant.unitNumber}
                      </p>
                    </div>

                    <div className="text-right mr-4">
                      <p className="text-sm text-neutral-600">Rent</p>
                      <p className="font-semibold">KSH {tenant.rentAmount.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {monthStatus.icon}
                      <Badge className={monthStatus.color}>{monthStatus.badge}</Badge>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRecordPaymentTenant(tenant)}
                    className="ml-3"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Record
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
