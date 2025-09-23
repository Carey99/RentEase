import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, DollarSign, Calendar, MapPin } from "lucide-react";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { formatRentStatusText } from "@/lib/rent-cycle-utils";
import ReminderDropdown from "../debts/ReminderDropdown";

interface TenantDebt {
  tenantId: string;
  tenantName: string;
  email: string;
  phone?: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  rentStatus: string;
  debtAmount: number;
  monthsOwed: number;
  daysOverdue: number;
  nextDueDate: string;
  lastPaymentDate?: string;
}

interface DebtsResponse {
  success: boolean;
  debts: TenantDebt[];
  totalDebtAmount: number;
  totalTenantsWithDebts: number;
}

export default function DebtTrackingTab() {
  const currentUser = useCurrentUser();
  
  const { data: debtsData, isLoading, error } = useQuery<DebtsResponse>({
    queryKey: ['landlord-debts', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) throw new Error('No user ID');
      
      const response = await fetch(`/api/landlords/${currentUser.id}/debts`);
      if (!response.ok) {
        throw new Error('Failed to fetch debt information');
      }
      
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load debt information</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const debts = debtsData?.debts || [];
  const totalDebtAmount = debtsData?.totalDebtAmount || 0;
  const totalTenantsWithDebts = debtsData?.totalTenantsWithDebts || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants with Debts</p>
                <p className="text-2xl font-bold text-orange-600">{totalTenantsWithDebts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount Owed</p>
                <p className="text-2xl font-bold text-red-600">
                  KSH {totalDebtAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Debt per Tenant</p>
                <p className="text-2xl font-bold text-yellow-600">
                  KSH {totalTenantsWithDebts > 0 ? Math.round(totalDebtAmount / totalTenantsWithDebts).toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debt Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Outstanding Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-600">No tenants currently have outstanding debts.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {debts.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{tenant.tenantName}</h3>
                          <p className="text-sm text-gray-600">{tenant.email}</p>
                          {tenant.phone && (
                            <p className="text-sm text-gray-600">{tenant.phone}</p>
                          )}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={
                            tenant.rentStatus === 'partial' 
                              ? 'bg-orange-100 text-orange-800' 
                              : tenant.rentStatus === 'grace_period'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {formatRentStatusText(
                            tenant.daysOverdue || Math.abs(parseInt(tenant.nextDueDate) || 0),
                            tenant.rentStatus as any,
                            0,
                            tenant.debtAmount,
                            tenant.monthsOwed
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{tenant.propertyName}</p>
                            <p className="text-gray-600">Unit {tenant.unitNumber}</p>
                          </div>
                        </div>

                        <div>
                          <p className="font-medium text-red-600">
                            KSH {tenant.debtAmount.toLocaleString()}
                          </p>
                          <p className="text-gray-600">Amount Owed</p>
                        </div>

                        <div>
                          <p className="font-medium">
                            KSH {tenant.rentAmount.toLocaleString()}
                          </p>
                          <p className="text-gray-600">Monthly Rent</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {new Date(tenant.nextDueDate).toLocaleDateString()}
                            </p>
                            <p className="text-gray-600">Next Due Date</p>
                          </div>
                        </div>
                      </div>

                      {tenant.monthsOwed > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>{tenant.monthsOwed} months behind</strong> on rent payments
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <ReminderDropdown
                        tenantId={tenant.tenantId}
                        tenantName={tenant.tenantName}
                        tenantEmail={tenant.email}
                        tenantPhone={tenant.phone}
                        debtAmount={tenant.debtAmount}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}