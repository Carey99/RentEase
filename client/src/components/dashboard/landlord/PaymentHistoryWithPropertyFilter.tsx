import { useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PropertySelector from "./PropertySelector";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";

interface PaymentHistoryWithPropertyFilterProps {
  className?: string;
}

export default function PaymentHistoryWithPropertyFilter({ className }: PaymentHistoryWithPropertyFilterProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const currentUser = useCurrentUser();

  // Fetch landlord's properties
  const propertiesQuery = useQuery({
    queryKey: ['properties', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/properties/landlord/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Fetch payment history for the landlord
  const paymentsQuery = useQuery({
    queryKey: ['payment-history', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/payment-history/landlord/${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Filter payments based on selected property
  const filteredPayments = React.useMemo(() => {
    if (!paymentsQuery.data) return [];
    if (selectedPropertyId === "all") {
      return paymentsQuery.data;
    }
    // Always compare as strings and handle missing property id
    return paymentsQuery.data.filter((payment: any) => {
      const propId = payment.property?._id || payment.property?.id || payment.propertyId;
      return propId && String(propId) === String(selectedPropertyId);
    });
  }, [paymentsQuery.data, selectedPropertyId]);

  // Get stats for current filter
  const stats = React.useMemo(() => {
    const total = filteredPayments.length;
    const totalAmount = filteredPayments.reduce((sum: number, payment: any) => 
      sum + (payment.amount || 0), 0
    );
    const completed = filteredPayments.filter((p: any) => p.status === 'completed').length;
    const pending = filteredPayments.filter((p: any) => p.status === 'pending').length;
    
    return { total, totalAmount, completed, pending };
  }, [filteredPayments]);

  const selectedProperty = propertiesQuery.data?.find((p: any) => p.id === selectedPropertyId);

  if (paymentsQuery.isLoading || propertiesQuery.isLoading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
        </div>
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading payment history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-neutral-900">Payment History</h2>
          <PropertySelector
            properties={propertiesQuery.data || []}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            placeholder="Filter by property"
            isLoading={propertiesQuery.isLoading}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Payments</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
              </div>
              <Calendar className="h-6 w-6 text-neutral-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedPropertyId === "all" 
                ? "All Payment History" 
                : `${selectedProperty?.name || "Property"} Payment History`
              }
            </span>
            <span className="text-sm font-normal text-neutral-600">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">
                {selectedPropertyId === "all" 
                  ? "No payment history found" 
                  : `No payments found for ${selectedProperty?.name || "this property"}`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Tenant</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Property</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-900">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment: any, idx: number) => (
                    <tr key={idx} className="border-b border-neutral-100">
                      <td className="py-3 px-4 text-neutral-700">
                        {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        {payment.tenant?.name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        {selectedPropertyId === "all" ? (
                          payment.property?.name || 'N/A'
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}