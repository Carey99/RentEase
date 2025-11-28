/**
 * useTenantDashboardState Hook
 * Centralized state management for tenant dashboard
 * Combines all UI state (tabs, modals, filters) in one place
 */

import { useState, useCallback } from "react";

export type DashboardTab = 'dashboard' | 'apartment' | 'payments' | 'settings';

interface TenantDashboardState {
  // Tab navigation
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;

  // Modal states
  showMpesaModal: boolean;
  setShowMpesaModal: (show: boolean) => void;

  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;

  // Payment filter states
  paymentFilterMonth: number | null;
  setPaymentFilterMonth: (month: number | null) => void;

  paymentFilterYear: number | null;
  setPaymentFilterYear: (year: number | null) => void;

  // Loading states
  isLoadingPayments: boolean;
  setIsLoadingPayments: (loading: boolean) => void;

  isLoadingProperty: boolean;
  setIsLoadingProperty: (loading: boolean) => void;

  // Error states
  error: string | null;
  setError: (error: string | null) => void;

  // UI state helpers
  resetFilters: () => void;
  closeAllModals: () => void;
  switchTab: (tab: DashboardTab) => void;
}

/**
 * Central state management hook for tenant dashboard
 * Replaces scattered useState calls in tenant-dashboard.tsx
 */
export function useTenantDashboardState(): TenantDashboardState {
  // Tab navigation
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  // Modal states
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment filter states
  const [paymentFilterMonth, setPaymentFilterMonth] = useState<number | null>(null);
  const [paymentFilterYear, setPaymentFilterYear] = useState<number | null>(null);

  // Loading states
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const resetFilters = useCallback(() => {
    setPaymentFilterMonth(null);
    setPaymentFilterYear(null);
  }, []);

  const closeAllModals = useCallback(() => {
    setShowMpesaModal(false);
    setShowPaymentModal(false);
  }, []);

  const switchTab = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    closeAllModals();
    resetFilters();
    setError(null);
  }, [closeAllModals, resetFilters]);

  return {
    activeTab,
    setActiveTab,
    showMpesaModal,
    setShowMpesaModal,
    showPaymentModal,
    setShowPaymentModal,
    paymentFilterMonth,
    setPaymentFilterMonth,
    paymentFilterYear,
    setPaymentFilterYear,
    isLoadingPayments,
    setIsLoadingPayments,
    isLoadingProperty,
    setIsLoadingProperty,
    error,
    setError,
    resetFilters,
    closeAllModals,
    switchTab,
  };
}

/**
 * Additional hook for managing specific apartment view state
 */
export function useApartmentViewState() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showLeaseDetails, setShowLeaseDetails] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rentInfo: true,
    utilities: true,
    contacts: true,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  return {
    selectedUnitId,
    setSelectedUnitId,
    showLeaseDetails,
    setShowLeaseDetails,
    expandedSections,
    toggleSection,
  };
}

/**
 * Additional hook for managing payment history view state
 */
export function usePaymentHistoryViewState() {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSort = useCallback((field: 'date' | 'amount') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  return {
    selectedPaymentId,
    setSelectedPaymentId,
    showPaymentDetails,
    setShowPaymentDetails,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSort,
  };
}
