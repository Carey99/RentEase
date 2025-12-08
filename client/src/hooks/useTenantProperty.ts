/**
 * useTenantProperty Hook
 * Fetches and manages tenant's apartment/property data
 * Replaces scattered fetch logic throughout tenant-dashboard
 */

import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TenantProperty } from "@shared/schema";

interface UseTenantPropertyProps {
  tenantId?: string;
  enabled?: boolean;
}

/**
 * Fetch tenant's property information
 * @param tenantId - ID of the tenant
 * @param enabled - Enable/disable the query
 * @returns Query with property data, loading, and error states
 */
export function useTenantProperty({ tenantId, enabled = true }: UseTenantPropertyProps) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['/api/tenant-properties/tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');
      
      try {
        const response = await fetch(`/api/tenant-properties/tenant/${tenantId}`);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No apartment assigned
          }
          throw new Error('Failed to fetch property data');
        }
        return response.json() as Promise<TenantProperty>;
      } catch (error) {
        console.error('Error fetching tenant property:', error);
        toast({
          title: 'Error',
          description: 'Failed to load property information',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!tenantId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Fetch all properties for a tenant (in case of multiple properties)
 * @param tenantId - ID of the tenant
 * @param enabled - Enable/disable the query
 * @returns Query with array of properties
 */
export function useTenantPropertiesQuery({ tenantId, enabled = true }: UseTenantPropertyProps) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['/api/tenants/properties', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant ID is required');
      
      try {
        const response = await apiRequest('GET', `/api/tenants/${tenantId}/properties`);
        if (!response.ok) {
          throw new Error('Failed to fetch properties');
        }
        return response.json() as Promise<TenantProperty[]>;
      } catch (error) {
        console.error('Error fetching tenant properties:', error);
        toast({
          title: 'Error',
          description: 'Failed to load properties',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!tenantId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
