/**
 * TenantDashboardTab Component
 * Main dashboard view showing rent status, next due date, and quick actions
 * Restored from main branch with full functionality
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Calendar, CheckCircle, AlertTriangle, Smartphone, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/stats-card";
import RecordedPaymentsCard from "@/components/dashboard/tenant/RecordedPaymentsCard";
import { MpesaPaymentModal } from "@/components/dashboard/tenant/MpesaPaymentModal";
import type { TenantProperty } from "@shared/schema";
import { formatRentStatusText } from "@/lib/rent-cycle-utils";
import { balanceForCurrentMonth } from "@/lib/payment-utils";

interface TenantDashboardTabProps {
  tenantId?: string;
  tenantProperty?: TenantProperty | null;
  paymentHistory?: any[];
  currentUser?: any;
}

function LandlordPaymentDetails({ landlordId }: { landlordId: string }) {
  const { data: darajaStatus } = useQuery({
    queryKey: [`/api/landlords/${landlordId}/daraja/status`],
    queryFn: async () => {
      if (!landlordId) return null;
      const response = await fetch(`/api/landlords/${landlordId}/daraja/status`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!landlordId,
  });

  if (!darajaStatus || !darajaStatus.isConfigured) {
    return null;
  }

  const { businessShortCode, businessType, accountNumber } = darajaStatus;

  const NumberDisplay = ({ code }: { code: string }) => (
    <div className="flex justify-center items-center gap-2 py-6">
      {code.split('').map((digit, idx) => (
        <div
          key={idx}
          className="h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-mono text-lg font-semibold text-gray-900 dark:text-white"
        >
          {digit}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-2 bg-white dark:bg-slate-950 text-xs text-gray-500 dark:text-gray-400">Or pay manually</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {businessType === 'till' ? 'Till Number' : 'Paybill Number'}
        </p>
        <NumberDisplay code={businessShortCode} />
        {businessType === 'paybill' && accountNumber && (
          <>
            <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Account Number</p>
            <NumberDisplay code={accountNumber} />
          </>
        )}
      </div>
    </>
  );
}

export default function TenantDashboardTab({ tenantId, tenantProperty, paymentHistory = [], currentUser }: TenantDashboardTabProps) {
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

  return (
    <div className="space-y-8">
      {/* Key Stats - Redesigned with better emphasis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Payment Status Card - Most Important */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider letter-spacing">Status</p>
                <div className="mt-3">
                  {tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? (
                    <div>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">Paid Ahead</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">You're all caught up</p>
                    </div>
                  ) : tenantProperty?.rentCycle?.rentStatus === 'paid' ? (
                    <div>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">Current</p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">Payment is up to date</p>
                    </div>
                  ) : tenantProperty?.rentCycle?.rentStatus === 'partial' ? (
                    <div>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Partial</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Payment needed</p>
                    </div>
                  ) : tenantProperty?.rentCycle?.rentStatus === 'active' ? (
                    <div>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Due Soon</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">{tenantProperty?.rentCycle?.daysRemaining} days remaining</p>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">N/A</p>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                tenantProperty?.rentCycle?.rentStatus === 'paid' || tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance'
                  ? 'bg-green-100 dark:bg-green-950/30'
                  : tenantProperty?.rentCycle?.rentStatus === 'partial'
                  ? 'bg-amber-100 dark:bg-amber-950/30'
                  : 'bg-blue-100 dark:bg-blue-950/30'
              }`}>
                {tenantProperty?.rentCycle?.rentStatus === 'paid' || tenantProperty?.rentCycle?.rentStatus === 'paid_in_advance' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Due Date Card */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Due Date</p>
                <div className="mt-3">
                  {tenantProperty?.rentCycle?.nextDueDate ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { day: 'numeric' })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-gray-600">N/A</p>
                  )}
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balance Card */}
        <Card className={`border shadow-sm hover:shadow-md transition-shadow ${
          (() => {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const balance = balanceForCurrentMonth(
              paymentHistory as any[], 
              currentMonth, 
              currentYear,
              Number(tenantProperty?.rentAmount || 0)
            );
            return balance > 0 
              ? 'border-red-200 dark:border-red-800'
              : 'border-gray-200 dark:border-gray-700';
          })()
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
                <p className={`text-2xl font-bold mt-3 ${
                  (() => {
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();
                    const balance = balanceForCurrentMonth(
                      paymentHistory as any[], 
                      currentMonth, 
                      currentYear,
                      Number(tenantProperty?.rentAmount || 0)
                    );
                    return balance > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400';
                  })()
                }`}>
                  {(() => {
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();
                    const balance = balanceForCurrentMonth(
                      paymentHistory as any[], 
                      currentMonth, 
                      currentYear,
                      Number(tenantProperty?.rentAmount || 0)
                    );
                    return balance > 0 ? `KSH ${balance.toLocaleString()}` : 'KSH 0';
                  })()}
                </p>
              </div>
              <div className={`p-3 rounded-lg flex-shrink-0 ${
                (() => {
                  const now = new Date();
                  const currentMonth = now.getMonth() + 1;
                  const currentYear = now.getFullYear();
                  const balance = balanceForCurrentMonth(
                    paymentHistory as any[], 
                    currentMonth, 
                    currentYear,
                    Number(tenantProperty?.rentAmount || 0)
                  );
                  return balance > 0 
                    ? 'bg-red-100 dark:bg-red-950/30'
                    : 'bg-green-100 dark:bg-green-950/30';
                })()
              }`}>
                <DollarSign className={`h-5 w-5 ${
                  (() => {
                    const now = new Date();
                    const currentMonth = now.getMonth() + 1;
                    const currentYear = now.getFullYear();
                    const balance = balanceForCurrentMonth(
                      paymentHistory as any[], 
                      currentMonth, 
                      currentYear,
                      Number(tenantProperty?.rentAmount || 0)
                    );
                    return balance > 0 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400';
                  })()
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Payment Section Takes Priority */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side - Payment Information (NOW WIDER & PRIMARY FOCUS) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pay Your Rent Card - Clean and Prominent */}
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                <Smartphone className="h-5 w-5 text-green-600" />
                <span>Pay Your Rent</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Button - Primary CTA with Safaricom Logo */}
              <Button 
                onClick={() => setShowMpesaModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white font-semibold py-6 text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3"
              >
                {/* Safaricom Logo */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Red arc/swoosh */}
                  <path
                    d="M 20 50 Q 40 20, 60 20 Q 75 20, 85 35"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Green dot */}
                  <circle cx="25" cy="70" r="6" fill="currentColor" />
                </svg>
                Send Payment
              </Button>
              
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Secure payment via M-Pesa STK Push
              </p>

              {/* Manual Payment Details - Display Landlord's M-Pesa Config */}
              {tenantProperty?.property?.landlordId && (
                <LandlordPaymentDetails landlordId={tenantProperty.property.landlordId} />
              )}
            </CardContent>
          </Card>

          {/* Recorded Payments */}
          <RecordedPaymentsCard 
            payments={paymentHistory} 
            expectedRent={tenantProperty?.rentAmount ? parseFloat(tenantProperty.rentAmount) : 0}
          />
        </div>

        {/* Right Side - Compact Apartment Summary */}
        <div>
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                My Apartment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!tenantProperty ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">No apartment assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Property Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Property</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{tenantProperty.property?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Unit</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.unitNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Type</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{tenantProperty.propertyType || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    {/* Monthly Rent */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Monthly Rent</span>
                      <span className="text-base font-semibold text-gray-900 dark:text-white">KSH {tenantProperty.rentAmount || '0'}</span>
                    </div>
                    
                    {/* Rent Cycle Information */}
                    {tenantProperty.rentCycle && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tenantProperty.rentCycle.rentStatus === 'paid_in_advance' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                            tenantProperty.rentCycle.rentStatus === 'paid' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                            tenantProperty.rentCycle.rentStatus === 'partial' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {formatRentStatusText(
                              tenantProperty.rentCycle.daysRemaining, 
                              tenantProperty.rentCycle.rentStatus,
                              tenantProperty.rentCycle.advancePaymentDays,
                              tenantProperty.rentCycle.debtAmount,
                              tenantProperty.rentCycle.monthsOwed
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Next Due</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(tenantProperty.rentCycle.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {tenantProperty.rentCycle.lastPaymentDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Last Payment</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(tenantProperty.rentCycle.lastPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Show advance payment details if applicable */}
                  {tenantProperty.rentCycle?.rentStatus === 'paid_in_advance' && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">Paid Ahead</p>
                      <div className="space-y-1 text-sm">
                        {tenantProperty.rentCycle.advancePaymentMonths && tenantProperty.rentCycle.advancePaymentMonths > 0 && (
                          <div className="flex justify-between">
                            <span className="text-green-600 dark:text-green-400">Months Ahead:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">
                              {tenantProperty.rentCycle.advancePaymentMonths} month{tenantProperty.rentCycle.advancePaymentMonths > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {tenantProperty.rentCycle.advancePaymentDays && (
                          <div className="flex justify-between">
                            <span className="text-green-600 dark:text-green-400">Days Ahead:</span>
                            <span className="font-semibold text-green-700 dark:text-green-300">{tenantProperty.rentCycle.advancePaymentDays} days</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show partial payment debt details if applicable */}
                  {tenantProperty.rentCycle?.rentStatus === 'partial' && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">Amount Due</p>
                      <div className="space-y-1 text-sm">
                        {tenantProperty.rentCycle.debtAmount && (
                          <div className="flex justify-between">
                            <span className="text-amber-600 dark:text-amber-400">Outstanding:</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                              KSH {tenantProperty.rentCycle.debtAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {tenantProperty.rentCycle.monthsOwed && tenantProperty.rentCycle.monthsOwed > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-600 dark:text-amber-400">Months Behind:</span>
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                              {tenantProperty.rentCycle.monthsOwed} month{tenantProperty.rentCycle.monthsOwed > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* M-Pesa Payment Modal */}
      {tenantProperty && (() => {
        const landlordId = tenantProperty.property?.landlordId || '';
        return (
          <MpesaPaymentModal
            open={showMpesaModal}
            onOpenChange={setShowMpesaModal}
            tenantId={tenantId || ''}
            landlordId={landlordId}
            defaultAmount={parseFloat(tenantProperty.rentAmount || '0')}
            phoneNumber={currentUser?.phone || ''}
            onSuccess={async () => {
              await queryClient.invalidateQueries({
                queryKey: ['tenant-property', currentUser?.id] 
              });
              await queryClient.invalidateQueries({
                queryKey: ['payment-history', currentUser?.id]
              });
              await queryClient.invalidateQueries({
                queryKey: ['tenant-activities', currentUser?.id]
              });
              await queryClient.invalidateQueries({ 
                queryKey: ['/api/tenant-properties/tenant', currentUser?.id] 
              });
              await queryClient.invalidateQueries({
                queryKey: ['/api/payment-history/tenant', currentUser?.id]
              });
            }}
          />
        );
      })()}
    </div>
  );
}
