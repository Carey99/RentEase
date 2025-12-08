/**
 * usePaymentHistory Hook
 * Fetches and manages tenant payment history
 * Centralizes payment data fetching with caching and error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  method: 'mpesa' | 'cash' | 'bank_transfer';
  receiptNumber?: string;
  notes?: string;
  forMonth?: number;
  forYear?: number;
}

export interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  total: number;
  nextDueDate?: string;
  totalPaid?: number;
  totalOutstanding?: number;
}

interface UsePaymentHistoryProps {
  tenantId?: string;
  month?: number;
  year?: number;
  enabled?: boolean;
}

/**
 * Fetch tenant's payment history
 * @param tenantId - ID of the tenant
 * @param month - Filter by specific month (optional)
 * @param year - Filter by specific year (optional)
 * @param enabled - Enable/disable the query
 * @returns Query with payment history data
 */
export function usePaymentHistory({
  tenantId,
  month,
  year,
  enabled = true,
}: UsePaymentHistoryProps) {
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (month) queryParams.append('month', month.toString());
  if (year) queryParams.append('year', year.toString());

  return useQuery({
    queryKey: ['/api/tenants/payments', tenantId, month, year],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');

      try {
        const url = `/api/tenants/${tenantId}/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await apiRequest('GET', url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment history');
        }
        
        return response.json() as Promise<PaymentHistoryResponse>;
      } catch (error) {
        console.error('Error fetching payment history:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment history',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!tenantId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates for payments)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch single payment record
 * @param paymentId - ID of the payment to fetch
 * @param enabled - Enable/disable the query
 * @returns Query with payment record
 */
export function usePaymentRecord(paymentId?: string, enabled = true) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['/api/payments', paymentId],
    queryFn: async () => {
      if (!paymentId) throw new Error('Payment ID is required');

      try {
        const response = await apiRequest('GET', `/api/payments/${paymentId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment');
        }
        
        return response.json() as Promise<PaymentRecord>;
      } catch (error) {
        console.error('Error fetching payment:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment details',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!paymentId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Refetch payment history (for when new payments are made)
 * @returns Function to refetch payment history
 */
export function useRefreshPaymentHistory() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: ['/api/tenants/payments'],
    });
  };
}

/**
 * Mutation to record a new payment (used by payment components)
 */
export function useRecordPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: {
      tenantId: string;
      amount: number;
      method: 'mpesa' | 'cash' | 'bank_transfer';
      receiptNumber?: string;
      notes?: string;
    }) => {
      const response = await apiRequest('POST', '/api/payments/record', {
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate payment history queries
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants/payments', variables.tenantId],
      });
      
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    },
  });
}
