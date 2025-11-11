import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Smartphone, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface MpesaPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  landlordId: string;
  billId?: string;
  defaultAmount: number;
  phoneNumber: string;
  onSuccess: () => void;
}

type PaymentStatus = 'idle' | 'initiating' | 'waiting' | 'checking' | 'completed' | 'failed' | 'timeout';

export function MpesaPaymentModal({
  open,
  onOpenChange,
  tenantId,
  landlordId,
  billId,
  defaultAmount,
  phoneNumber: defaultPhone,
  onSuccess
}: MpesaPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount.toString());
      setPhoneNumber(defaultPhone);
      setStatus('idle');
      setPaymentIntentId(null);
      setCountdown(120);
      setErrorMessage(null);
      setResultMessage(null);
    }
  }, [open, defaultAmount, defaultPhone]);

  // Countdown timer
  useEffect(() => {
    if (status === 'waiting' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === 'waiting' && countdown === 0) {
      setStatus('timeout');
      setErrorMessage('Payment timed out. Please try again.');
    }
  }, [status, countdown]);

  // Poll payment status
  useEffect(() => {
    if (status === 'waiting' && paymentIntentId) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payments/${paymentIntentId}/status`);
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'completed') {
              setStatus('completed');
              setResultMessage(data.message || 'Payment completed successfully!');
              toast({
                title: 'Payment Successful!',
                description: 'Your rent payment has been processed.',
              });
              setTimeout(() => {
                onSuccess();
                onOpenChange(false);
              }, 2000);
            } else if (data.status === 'failed') {
              setStatus('failed');
              setErrorMessage(data.message || data.resultDescription || 'Payment failed');
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [status, paymentIntentId, onSuccess, onOpenChange, toast]);

  const handleInitiatePayment = async () => {
    // Validate inputs
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    if (!landlordId) {
      setErrorMessage('Landlord information not found. Please contact support.');
      console.error('Missing landlordId');
      return;
    }

    setStatus('initiating');
    setErrorMessage(null);

    try {
      console.log('Initiating payment:', {
        tenantId,
        landlordId,
        amount: amountNum,
        phoneNumber,
        billId
      });

      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          landlordId,
          amount: amountNum,
          phoneNumber,
          billId
        })
      });

      console.log('Response status:', response.status, response.statusText);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        setPaymentIntentId(data.paymentIntentId);
        setStatus('waiting');
        setCountdown(120);
        toast({
          title: 'STK Push Sent!',
          description: data.customerMessage || 'Check your phone to complete the payment',
        });
      } else {
        setStatus('failed');
        setErrorMessage(data.message || data.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      setStatus('failed');
      setErrorMessage(error.message || 'Failed to initiate payment');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage(null);
    setResultMessage(null);
    setCountdown(120);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            M-Pesa Payment
          </DialogTitle>
          <DialogDescription>
            Pay your rent securely via M-Pesa STK Push
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Idle State - Input Form */}
          {status === 'idle' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  max="150000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: KES 150,000 per transaction
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="254712345678"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Safaricom number (254...)
                </p>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleInitiatePayment}
                className="w-full"
              >
                Send Payment Request
              </Button>
            </>
          )}

          {/* Initiating State */}
          {status === 'initiating' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Initiating payment...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          )}

          {/* Waiting State - STK Push Sent */}
          {status === 'waiting' && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Check your phone!</strong>
                  <br />
                  Enter your M-Pesa PIN to complete the payment
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <p className="text-lg font-medium">Waiting for confirmation</p>
                <p className="text-3xl font-bold text-primary">{formatTime(countdown)}</p>
                <p className="text-sm text-muted-foreground text-center">
                  The payment request will expire in {formatTime(countdown)}
                </p>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Steps:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Check your phone for M-Pesa prompt</li>
                  <li>Enter your M-Pesa PIN</li>
                  <li>Wait for confirmation</li>
                </ol>
              </div>
            </div>
          )}

          {/* Completed State */}
          {status === 'completed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-lg font-medium text-green-900">Payment Successful!</p>
              {resultMessage && (
                <p className="text-sm text-muted-foreground text-center">{resultMessage}</p>
              )}
              <p className="text-sm text-center text-muted-foreground">
                Your landlord has been notified
              </p>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="rounded-full bg-red-100 p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <p className="text-lg font-medium text-red-900">Payment Failed</p>
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Button onClick={handleRetry} className="w-full" variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Timeout State */}
          {status === 'timeout' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="rounded-full bg-yellow-100 p-3">
                  <Clock className="h-12 w-12 text-yellow-600" />
                </div>
                <p className="text-lg font-medium text-yellow-900">Payment Timed Out</p>
                <p className="text-sm text-center text-muted-foreground">
                  The payment request expired. Please try again.
                </p>
              </div>

              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
