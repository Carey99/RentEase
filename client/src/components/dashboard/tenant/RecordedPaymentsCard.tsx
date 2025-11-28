import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Receipt, Calendar, DollarSign } from "lucide-react";
import { expectedForBill, paidForBill, isTransactionRecord, expectedForCurrentMonth, balanceForCurrentMonth } from "@/lib/payment-utils";
import { Badge } from "@/components/ui/badge";

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

interface RecordedPaymentsCardProps {
  payments: PaymentRecord[];
  expectedRent: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RecordedPaymentsCard({ payments, expectedRent }: RecordedPaymentsCardProps) {
  // Get current month/year
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Filter payments for current month
  // Exclude transaction receipts (those with notes containing "Payment transaction")
  // Only show the actual bill record
  const currentMonthPayments = payments.filter(
    p => p.forMonth === currentMonth && 
         p.forYear === currentYear &&
         !(p as any).notes?.includes('Payment transaction') // Exclude transaction records
  );

  // Sort by createdAt/paymentDate to get most recent bill if there are duplicates
  const sortedPayments = [...currentMonthPayments].sort((a, b) => {
    const dateA = new Date(a.paymentDate).getTime();
    const dateB = new Date(b.paymentDate).getTime();
    return dateB - dateA; // Most recent first
  });

  // Get the most recent bill record for current month (should be only one, but use most recent if duplicates exist)
  const currentBill = sortedPayments.length > 0 ? sortedPayments[0] : null;
  
  // Debug: Log if there are duplicates
  if (sortedPayments.length > 1) {
    console.warn(`⚠️  Found ${sortedPayments.length} bill records for ${currentMonth}/${currentYear}. Using most recent.`, sortedPayments);
  }
  
  // Filter out transaction records to get all bills
  const allBills = payments.filter(p => !isTransactionRecord(p));
  
  // Base rent should EXCLUDE utilities (use expectedRent from props, NOT monthlyRent from bill)
  const baseRentOnly = expectedRent || 0;
  const totalUtilitiesInBill = currentBill ? Number(currentBill.totalUtilityCost || 0) : 0;
  
  // Current month's base charges (rent + utilities only, no historical debt)
  // Use baseRentOnly + utilities to avoid double-counting if bill.monthlyRent includes utilities
  const currentMonthBase = baseRentOnly + totalUtilitiesInBill;
  
  // Calculate CONSOLIDATED expected amount (current month + historical debts)
  const totalExpected = expectedForCurrentMonth(allBills, currentMonth, currentYear, expectedRent);
  
  // Calculate historical debt separately for display
  const historicalDebt = totalExpected - currentMonthBase;
  
  // Use actual cumulative amount recorded on the bill
  const totalPaid = currentBill ? paidForBill(currentBill) : 0;
  
  // Calculate balance using consolidated approach
  const balance = balanceForCurrentMonth(allBills, currentMonth, currentYear, expectedRent);
  
  // Determine status based on consolidated calculation
  let overallStatus: string;
  if (!currentBill) {
    overallStatus = 'pending';
  } else if (balance === 0) {
    overallStatus = 'completed';
  } else if (balance < 0) {
    overallStatus = 'overpaid';
  } else if (totalPaid > 0) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'pending';
  }

  // Get payment status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Payment</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Fully Paid</Badge>;
      case 'partial':
        return <Badge className="bg-orange-500">Partial Payment</Badge>;
      case 'overpaid':
        return <Badge className="bg-blue-500">Overpaid</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Recorded Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {currentMonthPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No payments recorded for {MONTHS[currentMonth - 1]} {currentYear}</p>
            <p className="text-xs mt-1">Your landlord will record payments here when received</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Summary Section - Clean Layout */}
            <div className="space-y-3">
              {/* Row 1: Base Rent & Utilities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Base Rent</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">KSH {baseRentOnly.toLocaleString()}</p>
                </div>
                {totalUtilitiesInBill > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Utilities</p>
                    <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">KSH {totalUtilitiesInBill.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Row 2: Total Expected & Total Paid */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Total Expected</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">KSH {totalExpected.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Total Paid</p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">KSH {totalPaid.toLocaleString()}</p>
                </div>
              </div>

              {/* Row 3: Outstanding Balance & Status */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Outstanding Balance</p>
                  <p className={`text-lg font-semibold ${
                    balance > 0 ? 'text-amber-600 dark:text-amber-400' : 
                    balance < 0 ? 'text-blue-600 dark:text-blue-400' : 
                    'text-green-600 dark:text-green-400'
                  }`}>
                    KSH {Math.abs(balance).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
                  {overallStatus && getStatusBadge(overallStatus)}
                </div>
              </div>
            </div>

            {/* Payment Records Section */}
            {currentMonthPayments.map((payment) => {
              const paymentExpectedAmount = expectedForBill(payment, expectedRent);
              const paymentPaidAmount = paidForBill(payment);
              const displayAmount = paymentPaidAmount > 0 ? paymentPaidAmount : paymentExpectedAmount;
              const displayStatus = overallStatus;

              return (
                <div key={payment._id} className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  {/* Payment Date */}
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-2 text-sm">
                    {/* Base Rent Line */}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Base Rent</span>
                      <span className="font-medium text-gray-900 dark:text-white">KSH {payment.monthlyRent.toLocaleString()}</span>
                    </div>

                    {/* Historical Debt Line */}
                    {historicalDebt > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Previous Balance</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">KSH {historicalDebt.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Utilities */}
                    {payment.utilityCharges && payment.utilityCharges.length > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Utilities</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">KSH {(payment.totalUtilityCost || 0).toLocaleString()}</span>
                        </div>
                        <div className="ml-4 space-y-1 text-xs text-gray-500 dark:text-gray-500">
                          {payment.utilityCharges.map((utility, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{utility.type}</span>
                              <span>{utility.unitsUsed} units × KSH {utility.pricePerUnit}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Total Line */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">KSH {displayAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Help Text */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/30 p-3 rounded-lg">
              <p>These are payments recorded by your landlord. Make your payment to confirm when you've paid.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
