/**
 * Combined Payments Tab
 * Contains: Payment Overview, M-Pesa Statements, and Payment Gateway Settings
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, Settings, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentOverview from '@/components/dashboard/landlord/payments/PaymentOverview';
import MonthlyPaymentBreakdown from '@/components/dashboard/shared/MonthlyPaymentBreakdown';
import MpesaStatementsTab from './MpesaStatementsTab';
import RecordCashPayment from '../RecordCashPayment';
import { MpesaSetupWizard } from '../payment-gateway';
import PaymentDetailsSettings from '../settings/PaymentDetailsSettings';

interface PaymentsTabProps {
  landlordId: string;
}

// Tenant type matching RecordCashPayment's expectations
interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyName?: string;
  unitNumber?: string;
  rentAmount?: string;
}

export function PaymentsTab({ landlordId }: PaymentsTabProps) {
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch tenants for cash payment recording
  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: [`/api/tenants/landlord/${landlordId}`],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/landlord/${landlordId}`);
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
  });

  return (
    <div className="space-y-0 px-2 md:px-6 h-full flex flex-col">
      {/* Fixed header - stays at top while content scrolls */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 pt-8 pb-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-1">Payments</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage payment history, M-Pesa statements, and gateway configuration</p>
          </div>
          <Button 
            onClick={() => setShowCashPaymentDialog(true)} 
            className="gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg px-5 py-2 text-base font-medium"
          >
            <DollarSign className="h-4 w-4" />
            Record Cash Payment
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex gap-8 bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none px-0 py-0 w-full h-auto justify-start">
            <TabsTrigger value="overview" className="flex items-center gap-2 px-0 pb-2 text-base font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:text-gray-600 rounded-none">
              <DollarSign className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mpesa" className="flex items-center gap-2 px-0 pb-2 text-base font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:text-gray-600 rounded-none">
              <FileText className="h-4 w-4" />
              M-Pesa Statements
            </TabsTrigger>
            <TabsTrigger value="payment-details" className="flex items-center gap-2 px-0 pb-2 text-base font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:text-gray-600 rounded-none">
              <Wallet className="h-4 w-4" />
              Payment Details
            </TabsTrigger>
            <TabsTrigger value="gateway" className="flex items-center gap-2 px-0 pb-2 text-base font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:text-gray-600 rounded-none">
              <Settings className="h-4 w-4" />
              Payment Gateway
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsContent value="overview" className="space-y-6 mt-0 px-0">
            <PaymentOverview landlordId={landlordId} />
            <MonthlyPaymentBreakdown 
              landlordId={landlordId}
              title="All Payments Collected"
            />
          </TabsContent>

          <TabsContent value="mpesa" className="mt-0 px-0">
            <MpesaStatementsTab />
          </TabsContent>

          <TabsContent value="payment-details" className="mt-0 px-0">
            <PaymentDetailsSettings landlordId={landlordId} />
          </TabsContent>

          <TabsContent value="gateway" className="mt-0 px-0">
            <MpesaSetupWizard landlordId={landlordId} />
          </TabsContent>
        </Tabs>
      </div>

      {showCashPaymentDialog && (
        <RecordCashPayment 
          open={showCashPaymentDialog} 
          onOpenChange={setShowCashPaymentDialog}
          tenants={tenants}
          landlordId={landlordId}
        />
      )}
    </div>
  );
}
