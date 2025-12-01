/**
 * TenantDashboardTab Component
 * Main dashboard view showing rent status, next due date, and quick actions
 * Extracted from tenant-dashboard.tsx
 */

import { useState } from "react";
import { DollarSign, Calendar, CheckCircle, AlertTriangle, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/stats-card";
import { MpesaPaymentModal } from "@/components/dashboard/tenant/MpesaPaymentModal";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantProperty } from "@shared/schema";

interface TenantDashboardTabProps {
  tenantId?: string;
  tenantProperty?: TenantProperty | null;
}

export default function TenantDashboardTab({ tenantId, tenantProperty }: TenantDashboardTabProps) {
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const queryClient = useQueryClient();

  if (!tenantProperty) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            Welcome to Your Dashboard
          </h2>
          <p className="text-neutral-600">
            Once you're assigned to an apartment, your rental information will appear here.
          </p>
        </div>
      </div>
    );
  }

  const rentCycle = tenantProperty.rentCycle || {};
  const nextDueDate = rentCycle.nextDueDate ? new Date(rentCycle.nextDueDate) : null;
  const daysRemaining = rentCycle.daysRemaining ?? 0;

  return (
    <div className="space-y-8">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Monthly Rent"
          value={`KSH ${tenantProperty.rentAmount?.toLocaleString() || 0}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend={rentCycle.currentMonthPaid ? 'up' : 'down'}
          trendLabel={rentCycle.currentMonthPaid ? 'Paid' : 'Pending'}
        />
        <StatsCard
          title="Next Due Date"
          value={nextDueDate?.toLocaleDateString() || 'N/A'}
          icon={<Calendar className="h-6 w-6" />}
          trend={daysRemaining > 0 ? 'neutral' : 'down'}
          trendLabel={daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
        />
      </div>

      {/* Payment Status Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {rentCycle.currentMonthPaid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <CardTitle className="text-base">
              {rentCycle.currentMonthPaid ? 'Payment Status: Paid' : 'Payment Status: Pending'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            {rentCycle.currentMonthPaid
              ? `Your rent for this month has been paid. Thank you!`
              : `Your rent for this month is due. Make a payment to stay current.`}
          </p>
          {!rentCycle.currentMonthPaid && (
            <Button
              onClick={() => setShowMpesaModal(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Pay with M-Pesa
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowMpesaModal(true)}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Make a Payment
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Use M-Pesa to pay your rent quickly and securely
          </p>
        </CardContent>
      </Card>

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <MpesaPaymentModal
          isOpen={showMpesaModal}
          onClose={() => setShowMpesaModal(false)}
          tenantId={tenantId}
          rentAmount={tenantProperty.rentAmount}
          onPaymentComplete={() => {
            queryClient.invalidateQueries({
              queryKey: ['/api/tenants/property', tenantId],
            });
            setShowMpesaModal(false);
          }}
        />
      )}
    </div>
  );
}
