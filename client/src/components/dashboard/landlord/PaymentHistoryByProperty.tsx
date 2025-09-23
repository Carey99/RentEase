import { useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";

interface PaymentHistoryByPropertyProps {
  className?: string;
}

export default function PaymentHistoryByProperty({ className }: PaymentHistoryByPropertyProps) {
  const currentUser = useCurrentUser();

  // Fetch payment history and group by property on frontend
  const { data: paymentHistory, isLoading, isError } = useQuery({
    queryKey: ['landlord-payment-history', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/payment-history/landlord/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Group payments by property on the frontend
  const paymentsByProperty = React.useMemo(() => {
    if (!paymentHistory || paymentHistory.length === 0) return [];
    
    const grouped = paymentHistory.reduce((acc: any, payment: any) => {
      const propertyId = payment.property?._id || payment.propertyId || 'unknown';
      const propertyName = payment.property?.name || 'Unknown Property';
      
      if (!acc[propertyId]) {
        acc[propertyId] = {
          propertyId,
          propertyName,
          payments: []
        };
      }
      
      acc[propertyId].payments.push(payment);
      return acc;
    }, {});
    
    return Object.values(grouped);
  }, [paymentHistory]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-neutral-600 mt-4">Loading payment history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            <div className="text-center py-8">
              <p className="text-red-600">Error loading payment history</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentsByProperty || paymentsByProperty.length === 0) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            <div className="text-center py-8">
              <p className="text-neutral-600">No payment history found</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
      </div>
      
      <Tabs defaultValue={paymentsByProperty[0]?.propertyId} className="w-full">
        <TabsList className="grid w-full grid-cols-auto">
          {paymentsByProperty.map((property: any) => (
            <TabsTrigger key={property.propertyId} value={property.propertyId} className="text-sm">
              {property.propertyName}
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                {property.payments?.length || 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {paymentsByProperty.map((property: any) => (
          <TabsContent key={property.propertyId} value={property.propertyId} className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{property.propertyName} - Payment History</span>
                    <div className="text-sm text-neutral-600">
                      <span className="font-medium">
                        Total Payments: {property.payments?.length || 0}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-3 px-4 font-semibold text-neutral-900">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral-900">Tenant</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral-900">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-neutral-900">Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {property.payments && property.payments.length > 0 ? (
                          property.payments.map((payment: any, idx: number) => (
                            <tr key={idx} className="border-b border-neutral-100">
                              <td className="py-3 px-4 text-neutral-700">
                                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-neutral-700">
                                {payment.tenant?.name || 'N/A'}
                              </td>
                              <td className="py-3 px-4 font-medium text-neutral-900">
                                ${payment.amount ? payment.amount.toFixed(2) : '0.00'}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    payment.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : payment.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : payment.status === 'partial'
                                      ? 'bg-orange-100 text-orange-800'
                                      : payment.status === 'overpaid'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {payment.status
                                    ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
                                    : 'Unknown'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-neutral-700 capitalize">
                                {payment.paymentMethod || 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-neutral-600">
                              No payments found for this property
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
