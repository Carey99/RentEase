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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-600" />
          Recorded Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentMonthPayments.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No payments recorded for {MONTHS[currentMonth - 1]} {currentYear}</p>
            <p className="text-sm mt-1">Your landlord will record payments here when received</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Base Rent:</span>
                  <span className="font-medium">KSH {baseRentOnly.toLocaleString()}</span>
                </div>
                {totalUtilitiesInBill > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Utilities:</span>
                    <span className="font-medium text-amber-700">KSH {totalUtilitiesInBill.toLocaleString()}</span>
                  </div>
                )}
                {historicalDebt > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Previous Balance:</span>
                    <span className="font-medium text-red-600">KSH {historicalDebt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-purple-200 pt-2">
                  <span className="text-neutral-700 font-medium">Total Expected:</span>
                  <span className="font-semibold">KSH {totalExpected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Total Paid:</span>
                  <span className="font-semibold text-purple-700">KSH {totalPaid.toLocaleString()}</span>
                </div>
                <div className="border-t border-purple-200 pt-2 flex justify-between items-center">
                  <span className="font-medium text-neutral-800">Outstanding Balance:</span>
                  <div className="flex items-center gap-2">
                    {overallStatus && getStatusBadge(overallStatus)}
                    <span className={`font-bold text-lg ${
                      balance > 0 ? 'text-orange-600' : 
                      balance < 0 ? 'text-blue-600' : 
                      'text-green-600'
                    }`}>
                      KSH {Math.abs(balance).toLocaleString()}
                      {balance < 0 && ' (Credit)'}
                      {balance === 0 && ' ✓'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Records */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-700">Payment Records for {MONTHS[currentMonth - 1]}</h4>
              {currentMonthPayments.map((payment) => {
                // Use helpers for expected and paid amounts
                const paymentExpectedAmount = expectedForBill(payment, expectedRent);
                const paymentPaidAmount = paidForBill(payment);
                const displayAmount = paymentPaidAmount > 0 ? paymentPaidAmount : paymentExpectedAmount;
                
                // Use the calculated overallStatus (which considers consolidated billing)
                // instead of the stored status which doesn't account for historical debts
                const displayStatus = overallStatus;

                return (
                  <div key={payment._id} className="border border-neutral-200 rounded-lg p-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-neutral-900">KSH {displayAmount.toLocaleString()}</span>
                      </div>
                      {getStatusBadge(displayStatus)}
                    </div>

                    <div className="text-sm text-neutral-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Recorded: {new Date(payment.paymentDate).toLocaleDateString()}</span>
                      </div>

                      {/* Base Rent */}
                      <div className="flex justify-between pl-5">
                        <span>Base Rent:</span>
                        <span className="font-semibold">KSH {payment.monthlyRent.toLocaleString()}</span>
                      </div>
                      
                      {/* Historical Debt (if this bill includes it) */}
                      {historicalDebt > 0 && (
                        <div className="flex justify-between pl-5 text-red-600">
                          <span>Previous Balance:</span>
                          <span className="font-semibold">KSH {historicalDebt.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Utility Charges */}
                      {payment.utilityCharges && payment.utilityCharges.length > 0 && (
                        <div className="mt-2 pl-5 space-y-1">
                          <span className="font-medium text-amber-700">Utilities:</span>
                          {payment.utilityCharges.map((utility, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-neutral-600">
                                {utility.type} ({utility.unitsUsed} units × KSH {utility.pricePerUnit})
                              </span>
                              <span className="font-medium text-amber-700">KSH {utility.total.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-neutral-200 pt-1">
                            <span className="font-medium">Total Utilities:</span>
                            <span className="font-semibold text-amber-700">
                              KSH {(payment.totalUtilityCost || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Total Expected - Use consolidated amount for current month */}
                      <div className="flex justify-between pl-5 pt-2 border-t border-neutral-200">
                        <span className="font-medium">Total Expected:</span>
                        <span className="font-semibold">KSH {totalExpected.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Help Text */}
            <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-md">
              <p>💡 <strong>Note:</strong> These are payments recorded by your landlord. Use the "Make Payment" section below to confirm when you've actually paid.</p>
              {currentBill?.status === 'pending' && (
                <p className="mt-2 text-amber-600">⚠️ You have a pending bill. Please make your payment to update the status.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
