import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Users,
  Building
} from 'lucide-react';

interface DataConsistencyValidatorProps {
  landlordId?: string;
  tenantId?: string;
  showDetails?: boolean;
}

interface ConsistencyCheck {
  category: string;
  status: 'pass' | 'warning' | 'error';
  message: string;
  details?: string[];
  count?: number;
}

export function DataConsistencyValidator({ 
  landlordId, 
  tenantId, 
  showDetails = false 
}: DataConsistencyValidatorProps) {
  const [checks, setChecks] = useState<ConsistencyCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runConsistencyChecks = async () => {
    setLoading(true);
    const newChecks: ConsistencyCheck[] = [];

    try {
      if (landlordId) {
        // Check landlord data consistency
        const billsResponse = await fetch(`/api/billing/landlord/${landlordId}`);
        if (billsResponse.ok) {
          const billsData = await billsResponse.json();
          const bills = billsData.bills || [];
          
          // Check 1: Bill calculations
          const calculationErrors = bills.filter((bill: any) => {
            const expectedTotal = bill.subtotalAmount + (bill.previousDebt || 0);
            return Math.abs(bill.totalAmount - expectedTotal) > 0.01;
          });
          
          newChecks.push({
            category: 'Bill Calculations',
            status: calculationErrors.length === 0 ? 'pass' : 'error',
            message: calculationErrors.length === 0 
              ? 'All bill calculations are correct'
              : `${calculationErrors.length} bills have calculation errors`,
            details: calculationErrors.map((bill: any) => 
              `${bill.tenantName} - ${new Date(bill.billYear, bill.billMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`
            ),
            count: calculationErrors.length
          });

          // Check 2: Payment consistency  
          const paymentErrors = bills.filter((bill: any) => {
            const expectedOutstanding = bill.totalAmount - bill.amountPaid;
            return Math.abs(bill.outstandingBalance - expectedOutstanding) > 0.01;
          });

          newChecks.push({
            category: 'Payment Consistency',
            status: paymentErrors.length === 0 ? 'pass' : 'error',
            message: paymentErrors.length === 0
              ? 'All payment calculations are consistent'
              : `${paymentErrors.length} bills have payment inconsistencies`,
            details: paymentErrors.map((bill: any) => 
              `${bill.tenantName} - Outstanding: ${bill.outstandingBalance}, Expected: ${bill.totalAmount - bill.amountPaid}`
            ),
            count: paymentErrors.length
          });

          // Check 3: Payment status accuracy
          const statusErrors = bills.filter((bill: any) => {
            if (bill.outstandingBalance <= 0 && bill.paymentStatus !== 'paid_in_full') return true;
            if (bill.outstandingBalance > 0 && bill.outstandingBalance < bill.totalAmount && bill.paymentStatus !== 'partially_paid') return true;
            if (bill.outstandingBalance >= bill.totalAmount && bill.amountPaid === 0 && bill.paymentStatus !== 'unpaid') return true;
            return false;
          });

          newChecks.push({
            category: 'Payment Status',
            status: statusErrors.length === 0 ? 'pass' : 'warning',
            message: statusErrors.length === 0
              ? 'All payment statuses are accurate'
              : `${statusErrors.length} bills have incorrect payment status`,
            details: statusErrors.map((bill: any) => 
              `${bill.tenantName} - Status: ${bill.paymentStatus}, Outstanding: ${bill.outstandingBalance}, Total: ${bill.totalAmount}`
            ),
            count: statusErrors.length
          });

          // Check 4: Data completeness
          const incompleteData = bills.filter((bill: any) => 
            !bill.tenantName || !bill.propertyName || !bill.lineItems || bill.lineItems.length === 0
          );

          newChecks.push({
            category: 'Data Completeness',
            status: incompleteData.length === 0 ? 'pass' : 'warning',
            message: incompleteData.length === 0
              ? 'All bills have complete data'
              : `${incompleteData.length} bills have missing data`,
            details: incompleteData.map((bill: any) => {
              const missing = [];
              if (!bill.tenantName) missing.push('tenant name');
              if (!bill.propertyName) missing.push('property name');
              if (!bill.lineItems || bill.lineItems.length === 0) missing.push('line items');
              return `Bill ${bill._id}: Missing ${missing.join(', ')}`;
            }),
            count: incompleteData.length
          });

          // Summary check
          const totalBills = bills.length;
          const totalErrors = calculationErrors.length + paymentErrors.length;
          const totalWarnings = statusErrors.length + incompleteData.length;

          newChecks.unshift({
            category: 'Overall Data Health',
            status: totalErrors === 0 ? (totalWarnings === 0 ? 'pass' : 'warning') : 'error',
            message: `Processed ${totalBills} bills: ${totalErrors} errors, ${totalWarnings} warnings`,
            count: totalBills
          });
        }
      }

      if (tenantId) {
        // Check tenant data consistency
        const billsResponse = await fetch(`/api/billing/tenant/${tenantId}`);
        if (billsResponse.ok) {
          const billsData = await billsResponse.json();
          const bills = billsData.bills || [];
          
          // Similar checks for tenant view
          const calculationErrors = bills.filter((bill: any) => {
            const expectedTotal = bill.subtotalAmount + (bill.previousDebt || 0);
            return Math.abs(bill.totalAmount - expectedTotal) > 0.01;
          });
          
          newChecks.push({
            category: 'Bill Calculations',
            status: calculationErrors.length === 0 ? 'pass' : 'error',
            message: calculationErrors.length === 0 
              ? 'All your bill calculations are correct'
              : `${calculationErrors.length} bills have calculation errors`,
            count: calculationErrors.length
          });

          const paymentErrors = bills.filter((bill: any) => {
            const expectedOutstanding = bill.totalAmount - bill.amountPaid;
            return Math.abs(bill.outstandingBalance - expectedOutstanding) > 0.01;
          });

          newChecks.push({
            category: 'Payment Tracking',
            status: paymentErrors.length === 0 ? 'pass' : 'error',
            message: paymentErrors.length === 0
              ? 'All payment tracking is accurate'
              : `${paymentErrors.length} bills have payment tracking issues`,
            count: paymentErrors.length
          });

          newChecks.unshift({
            category: 'Your Billing Data',
            status: calculationErrors.length === 0 && paymentErrors.length === 0 ? 'pass' : 'error',
            message: `${bills.length} bills processed successfully`,
            count: bills.length
          });
        }
      }

      setChecks(newChecks);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error running consistency checks:', error);
      newChecks.push({
        category: 'System Check',
        status: 'error',
        message: 'Failed to run consistency checks',
        details: ['Network error or server unavailable']
      });
      setChecks(newChecks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (landlordId || tenantId) {
      runConsistencyChecks();
    }
  }, [landlordId, tenantId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">✓ Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">⚠ Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">✗ Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Data Consistency Check</span>
          </div>
          <div className="flex items-center space-x-2">
            {lastCheck && (
              <span className="text-sm text-gray-600">
                Last check: {lastCheck.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={runConsistencyChecks}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="flex items-start space-x-3 flex-1">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{check.category}</h4>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-gray-600">{check.message}</p>
                  
                  {showDetails && check.details && check.details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {check.details.slice(0, 3).map((detail, i) => (
                        <div key={i} className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {detail}
                        </div>
                      ))}
                      {check.details.length > 3 && (
                        <div className="text-xs text-gray-500">
                          ... and {check.details.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {checks.length === 0 && !loading && (
            <div className="text-center py-4 text-gray-600">
              <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Click refresh to run data consistency checks</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Running consistency checks...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}