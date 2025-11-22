/**
 * Combined Payments Tab
 * Contains: Payment Overview, M-Pesa Statements, and Payment Gateway Settings
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PaymentOverview from '@/components/dashboard/landlord/payments/PaymentOverview';
import MonthlyPaymentBreakdown from '@/components/dashboard/shared/MonthlyPaymentBreakdown';
import MpesaStatementsTab from './MpesaStatementsTab';
import RecordCashPayment from '../RecordCashPayment';
import { MpesaSetupWizard } from '../payment-gateway';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            Manage payment history, M-Pesa statements, and gateway configuration
          </p>
        </div>
        <Button 
          onClick={() => setShowCashPaymentDialog(true)} 
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
        >
          <DollarSign className="h-4 w-4" />
          Record Cash Payment
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="mpesa" className="gap-2">
            <FileText className="h-4 w-4" />
            M-Pesa Statements
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-2">
            <Settings className="h-4 w-4" />
            Payment Gateway
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PaymentOverview landlordId={landlordId} />
          <MonthlyPaymentBreakdown 
            landlordId={landlordId}
            title="All Payments Collected"
          />
        </TabsContent>

        <TabsContent value="mpesa">
          <MpesaStatementsTab />
        </TabsContent>

        <TabsContent value="gateway">
          <MpesaSetupWizard landlordId={landlordId} />
        </TabsContent>
      </Tabs>

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
