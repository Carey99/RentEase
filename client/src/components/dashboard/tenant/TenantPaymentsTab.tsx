/**
 * TenantPaymentsTab Component
 * Displays payment history and payment breakdown
 * Extracted from tenant-dashboard.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyPaymentBreakdown from "@/components/dashboard/shared/MonthlyPaymentBreakdown";
import RecordedPaymentsCard from "@/components/dashboard/tenant/RecordedPaymentsCard";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { usePaymentHistoryViewState } from "@/hooks/useTenantDashboardState";

interface TenantPaymentsTabProps {
  tenantId?: string;
}

export default function TenantPaymentsTab({ tenantId }: TenantPaymentsTabProps) {
  const viewState = usePaymentHistoryViewState();
  const { data: paymentData, isLoading, error } = usePaymentHistory({ tenantId });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading payment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading payment history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        {paymentData?.totalPaid && (
          <p className="text-sm text-gray-600">
            Total Paid: KSH {paymentData.totalPaid.toLocaleString()}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      {paymentData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">KSH {paymentData.totalPaid?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                KSH {paymentData.totalOutstanding?.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{paymentData.payments?.length || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Payment Breakdown */}
      <MonthlyPaymentBreakdown 
        tenantId={tenantId}
        title="Monthly Payment History"
      />

      {/* Recorded Payments */}
      <RecordedPaymentsCard tenantId={tenantId} />
    </div>
  );
}
