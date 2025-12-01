/**
 * TenantPaymentsTab Component
 * Displays payment history and payment breakdown
 * Extracted from tenant-dashboard.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MonthlyPaymentBreakdown from "@/components/dashboard/shared/MonthlyPaymentBreakdown";
import RecordedPaymentsCard from "@/components/dashboard/tenant/RecordedPaymentsCard";
import { expectedForBill, balanceForCurrentMonth, paidForBill, expectedForCurrentMonth } from "@/lib/payment-utils";
import { usePaymentHistoryViewState } from "@/hooks/useTenantDashboardState";
import type { TenantProperty } from "@shared/schema";

interface TenantPaymentsTabProps {
  tenantId?: string;
  paymentHistory?: any[];
  tenantProperty?: TenantProperty | null;
}

export default function TenantPaymentsTab({ tenantId, paymentHistory = [], tenantProperty }: TenantPaymentsTabProps) {
  const viewState = usePaymentHistoryViewState();
  
  // Calculate totals from payment history array
  const completedPayments = paymentHistory.filter(p => 
    p.status === 'completed' || p.status === 'overpaid'
  );
  
  const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayments = paymentHistory.filter(p => 
    p.status === 'pending' || p.status === 'partial'
  );
  // Prefer using the property's base rent (from tenantProperty) when calculating expected/balance
  const defaultMonthlyRent = parseFloat(tenantProperty?.rentAmount || '0');

  // Calculate outstanding using shared utility that consolidates historical debt
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const totalOutstanding = balanceForCurrentMonth(paymentHistory || [], currentMonth, currentYear, defaultMonthlyRent);

  const expectedRent = expectedForCurrentMonth(paymentHistory || [], currentMonth, currentYear, defaultMonthlyRent);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        <p className="text-sm text-gray-600">
          Total Paid: KSH {totalPaid.toLocaleString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">KSH {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              KSH {totalOutstanding.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{paymentHistory.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Payment Breakdown */}
      <MonthlyPaymentBreakdown 
        tenantId={tenantId}
        title="Monthly Payment History"
      />

      {/* Recorded Payments */}
      <RecordedPaymentsCard payments={paymentHistory} expectedRent={expectedRent} />
    </div>
  );
}
