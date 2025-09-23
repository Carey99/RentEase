import React, { useState } from "react";

interface PaymentHistoryByPropertyProps {
  paymentHistory: any[];
}

export default function PaymentHistoryByProperty({ paymentHistory }: PaymentHistoryByPropertyProps) {
  // Group payments by property
  const propertyMap: Record<string, { name: string; payments: any[] }> = {};
  paymentHistory.forEach((payment) => {
    const propertyId = payment.property?._id || payment.propertyId || 'unknown';
    const propertyName = payment.property?.name || payment.propertyName || 'Unknown Property';
    if (!propertyMap[propertyId]) {
      propertyMap[propertyId] = { name: propertyName, payments: [] };
    }
    propertyMap[propertyId].payments.push(payment);
  });
  const propertyIds = Object.keys(propertyMap);
  const [activeTab, setActiveTab] = useState(propertyIds[0] || '');

  if (propertyIds.length === 0) {
    return <div className="text-center py-8 text-neutral-600">No payment history found</div>;
  }

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {propertyIds.map((propertyId) => (
          <button
            key={propertyId}
            className={`px-4 py-2 rounded-t-md font-medium border-b-2 transition-colors ${
              activeTab === propertyId
                ? 'border-primary text-primary bg-neutral-50'
                : 'border-transparent text-neutral-600 bg-neutral-100'
            }`}
            onClick={() => setActiveTab(propertyId)}
          >
            {propertyMap[propertyId].name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto bg-white rounded-b-lg shadow border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-3 px-4 font-semibold text-neutral-900">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-neutral-900">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-neutral-900">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-neutral-900">Method</th>
            </tr>
          </thead>
          <tbody>
            {propertyMap[activeTab]?.payments.map((payment: any, idx: number) => (
              <tr key={idx} className="border-b border-neutral-100">
                <td className="py-3 px-4 text-neutral-700">
                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="py-3 px-4 font-medium text-neutral-900">
                  KSH {payment.amount ? payment.amount.toFixed(2) : '0.00'}
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
    </div>
  );
}
