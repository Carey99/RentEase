/**
 * TenantApartmentTab Component
 * Displays apartment/property details and contact information
 * Extracted from tenant-dashboard.tsx
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, User, Calendar } from "lucide-react";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { useApartmentViewState } from "@/hooks/useTenantDashboardState";

interface TenantApartmentTabProps {
  tenantId?: string;
}

export default function TenantApartmentTab({ tenantId }: TenantApartmentTabProps) {
  const viewState = useApartmentViewState();
  const { data: tenantProperty, isLoading, error } = useTenantProperty({ tenantId });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading apartment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading apartment details</p>
      </div>
    );
  }

  if (!tenantProperty) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-16 w-16 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                No Apartment Assigned
              </h3>
              <p className="text-neutral-600 mb-4">
                You haven't been assigned to an apartment yet.
              </p>
              <p className="text-sm text-neutral-500">
                Contact your landlord to get registered for an apartment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Apartment</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Property Details */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600 dark:text-gray-400">Property</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-right">
                  {tenantProperty.propertyName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600 dark:text-gray-400">Unit Number</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {tenantProperty.unitNumber || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600 dark:text-gray-400">Property Type</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {tenantProperty.propertyType || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600 dark:text-gray-400">Monthly Rent</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  KSH {tenantProperty.rentAmount?.toLocaleString() || 0}
                </span>
              </div>
              {tenantProperty.moveInDate && (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Move-in Date</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(tenantProperty.moveInDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Landlord Information */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-orange-600" />
              Landlord Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {tenantProperty.landlordName || 'N/A'}
                  </p>
                </div>
              </div>

              {tenantProperty.landlordPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                    <a
                      href={`tel:${tenantProperty.landlordPhone}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {tenantProperty.landlordPhone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rent Cycle Information */}
        {tenantProperty.rentCycle && (
          <Card className="md:col-span-2 border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Rent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {tenantProperty.rentCycle.currentMonthPaid ? 'Paid' : 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Days Remaining
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {tenantProperty.rentCycle.daysRemaining || 0} days
                  </p>
                </div>
                {tenantProperty.rentCycle.lastPaymentDate && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Last Payment
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(tenantProperty.rentCycle.lastPaymentDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {tenantProperty.rentCycle.lastPaymentAmount && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Last Payment Amount
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      KSH {tenantProperty.rentCycle.lastPaymentAmount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
