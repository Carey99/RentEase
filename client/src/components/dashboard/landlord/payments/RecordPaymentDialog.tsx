import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, Zap, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    rentAmount: number;
    propertyId: string;
  };
}

interface Utility {
  type: string;
  price: string;
}

interface UtilityCharge {
  type: string;
  unitsUsed: number;
  pricePerUnit: number;
  total: number;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  tenant,
}: RecordPaymentDialogProps) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [paymentDate, setPaymentDate] = useState<Date>(currentDate);
  const [utilityUnits, setUtilityUnits] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch property utilities
  const { data: property } = useQuery({
    queryKey: ["property", tenant.propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${tenant.propertyId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch property");
      return response.json();
    },
    enabled: open && !!tenant.propertyId,
  });

  // Fetch recorded months for this tenant
  const { data: recordedMonthsData } = useQuery({
    queryKey: ["recorded-months", tenant.id, selectedYear],
    queryFn: async () => {
      const response = await fetch(
        `/api/payment-history/tenant/${tenant.id}/recorded-months/${selectedYear}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch recorded months");
      return response.json();
    },
    enabled: open && !!tenant.id,
  });

  const recordedMonths: number[] = recordedMonthsData?.months || [];
  const isMonthRecorded = recordedMonths.includes(parseInt(selectedMonth));

  const utilities: Utility[] = property?.utilities || [];

  // Calculate utility charges
  const utilityCharges: UtilityCharge[] = useMemo(() => {
    return utilities.map((utility) => {
      const unitsUsed = parseFloat(utilityUnits[utility.type] || "0");
      const pricePerUnit = parseFloat(utility.price);
      const total = unitsUsed * pricePerUnit;
      
      return {
        type: utility.type,
        unitsUsed,
        pricePerUnit,
        total,
      };
    });
  }, [utilities, utilityUnits]);

  // Calculate total utility cost
  const totalUtilityCost = useMemo(() => {
    return utilityCharges.reduce((sum, charge) => sum + charge.total, 0);
  }, [utilityCharges]);

  // Calculate total payment amount (rent + utilities)
  const totalAmount = useMemo(() => {
    return tenant.rentAmount + totalUtilityCost;
  }, [tenant.rentAmount, totalUtilityCost]);

  // Check if all utilities have units entered (if there are utilities)
  const allUtilitiesEntered = useMemo(() => {
    if (utilities.length === 0) return true; // No utilities, so valid
    
    return utilities.every((utility) => {
      const units = utilityUnits[utility.type];
      return units !== undefined && units !== "" && parseFloat(units) >= 0;
    });
  }, [utilities, utilityUnits]);

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: {
      paymentAmount: number;
      forMonth: number;
      forYear: number;
      paymentDate: Date;
      utilityCharges: UtilityCharge[];
      totalUtilityCost: number;
    }) => {
      const response = await fetch(`/api/tenants/${tenant.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record payment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Recorded",
        description: data.message || "Payment has been successfully recorded",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["recorded-months"] });
      
      // Close dialog
      onOpenChange(false);
      
      // Reset form
      setSelectedMonth(currentMonth.toString());
      setSelectedYear(currentYear.toString());
      setPaymentDate(currentDate);
      setUtilityUnits({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Total amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog instead of directly recording
    setShowConfirmation(true);
  };

  const handleConfirmPayment = () => {
    recordPaymentMutation.mutate({
      paymentAmount: totalAmount,
      forMonth: parseInt(selectedMonth),
      forYear: parseInt(selectedYear),
      paymentDate,
      utilityCharges: utilityCharges.filter((charge) => charge.unitsUsed > 0),
      totalUtilityCost,
    });
    setShowConfirmation(false);
  };

  // Generate years (current year and 2 years back)
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Generate months (only up to current month if current year selected)
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ].filter((month) => {
    // If current year is selected, only show months up to current month
    if (parseInt(selectedYear) === currentYear) {
      return month.value <= currentMonth;
    }
    // For past years, show all months
    return true;
  });

  const paymentStatus = () => {
    if (totalAmount < tenant.rentAmount) {
      return "Partial Payment";
    } else if (totalAmount > tenant.rentAmount && totalUtilityCost === 0) {
      return "Overpayment";
    }
    return "Full Payment";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a rent payment for {tenant.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Month Selection */}
            <div className="space-y-2">
              <Label htmlFor="month">Payment For Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => {
                    const isRecorded = recordedMonths.includes(month.value);
                    return (
                      <SelectItem 
                        key={month.value} 
                        value={month.value.toString()}
                        disabled={isRecorded}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{month.label}</span>
                          {isRecorded && (
                            <CheckCircle2 className="w-4 h-4 ml-2 text-green-600" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {isMonthRecorded && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Payment already recorded for this month
                </p>
              )}
            </div>

            {/* Year Selection */}
            <div className="space-y-2">
              <Label htmlFor="year">Payment For Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rent Amount Display */}
            <div className="space-y-2">
              <Label>Monthly Rent</Label>
              <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <span className="text-sm text-neutral-600">Base Rent</span>
                <span className="font-semibold">KSH {tenant.rentAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Utilities Section */}
            {utilities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <Label>Utility Charges</Label>
                </div>
                
                {utilities.map((utility) => {
                  const unitsUsed = parseFloat(utilityUnits[utility.type] || "0");
                  const pricePerUnit = parseFloat(utility.price);
                  const calculatedTotal = unitsUsed * pricePerUnit;
                  
                  return (
                    <div key={utility.type} className="border border-neutral-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-base">{utility.type}</span>
                        <span className="text-sm text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                          KSH {pricePerUnit.toLocaleString()} per unit
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`units-${utility.type}`} className="text-sm text-neutral-600">
                          Units Consumed <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`units-${utility.type}`}
                          type="number"
                          step="1"
                          min="0"
                          placeholder="e.g., 150"
                          value={utilityUnits[utility.type] || ""}
                          onChange={(e) =>
                            setUtilityUnits((prev) => ({
                              ...prev,
                              [utility.type]: e.target.value,
                            }))
                          }
                          className="text-lg font-medium"
                          required
                        />
                      </div>
                      
                      {unitsUsed > 0 && (
                        <div className="pt-2 border-t border-neutral-200">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-600">
                              {unitsUsed} × KSH {pricePerUnit.toLocaleString()} =
                            </span>
                            <span className="text-lg font-bold text-amber-600">
                              KSH {calculatedTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {totalUtilityCost > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <span className="text-sm font-medium text-amber-900">Total Utilities</span>
                    <span className="font-semibold text-amber-900">
                      KSH {totalUtilityCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total Amount */}
            <div className="space-y-2">
              <Label>Total Payment Amount</Label>
              <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-500 rounded-md">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Grand Total</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  KSH {totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">
                  Expected Rent: KSH {tenant.rentAmount.toLocaleString()}
                </span>
                {paymentStatus() && (
                  <span
                    className={cn(
                      "font-medium",
                      paymentStatus() === "Partial Payment" && "text-orange-600",
                      paymentStatus() === "Overpayment" && "text-blue-600",
                      paymentStatus() === "Full Payment" && "text-green-600"
                    )}
                  >
                    {paymentStatus()}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={recordPaymentMutation.isPending || !allUtilitiesEntered || isMonthRecorded}
            >
              {recordPaymentMutation.isPending ? "Recording..." : isMonthRecorded ? "Already Recorded" : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please review the payment details before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Tenant Info */}
            <div className="border-b pb-3">
              <p className="text-sm text-neutral-600">Tenant</p>
              <p className="font-semibold text-lg">{tenant.name}</p>
              <p className="text-sm text-neutral-600">
                {format(paymentDate, "MMMM d, yyyy")}
              </p>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-neutral-700">Payment Breakdown:</h4>
              
              {/* Rent */}
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Monthly Rent</span>
                <span className="font-medium">KSH {tenant.rentAmount.toLocaleString()}</span>
              </div>

              {/* Utilities */}
              {utilityCharges
                .filter((charge) => charge.unitsUsed > 0)
                .map((charge) => (
                  <div key={charge.type} className="flex justify-between text-sm bg-amber-50 p-2 rounded">
                    <span className="text-neutral-700">
                      {charge.type} ({charge.unitsUsed} × KSH {charge.pricePerUnit.toLocaleString()})
                    </span>
                    <span className="font-medium text-amber-700">
                      KSH {charge.total.toLocaleString()}
                    </span>
                  </div>
                ))}

              {/* Total */}
              <div className="pt-3 border-t-2 border-green-600 flex justify-between">
                <span className="font-bold text-lg text-green-900">Total Amount</span>
                <span className="font-bold text-2xl text-green-600">
                  KSH {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              This payment will be recorded and sent to {tenant.name}'s dashboard immediately.
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={recordPaymentMutation.isPending}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPayment}
              disabled={recordPaymentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {recordPaymentMutation.isPending ? "Recording..." : "Confirm & Record Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
