import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, DollarSign, Search, Check, ChevronDown, Home, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyName?: string;
  unitNumber?: string;
  rentAmount?: string;
}

interface RecordCashPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  landlordId: string;
}

interface CashPaymentData {
  tenantId: string;
  amount: number;
  paymentDate: Date;
  forMonth: number;
  forYear: number;
  notes?: string;
}

export default function RecordCashPayment({
  open,
  onOpenChange,
  tenants,
  landlordId,
}: RecordCashPaymentProps) {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [forMonth, setForMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [forYear, setForYear] = useState<string>(String(new Date().getFullYear()));
  const [notes, setNotes] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tenants based on search query - only show when user is typing
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.propertyName?.toLowerCase().includes(query) ||
        t.unitNumber?.toLowerCase().includes(query)
    );
  }, [tenants, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: CashPaymentData) => {
      const response = await fetch("/api/payments/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          landlordId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to record payment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-properties"] }); // Add this for tenant dashboard
      
      // Reset form
      setSelectedTenant("");
      setSearchQuery("");
      setShowDropdown(false);
      setAmount("");
      setPaymentDate(new Date());
      setForMonth(String(new Date().getMonth() + 1));
      setForYear(String(new Date().getFullYear()));
      setNotes("");
      
      onOpenChange(false);
    },
  });

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant.id);
    setSearchQuery(tenant.name);
    setShowDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenant || !amount || !paymentDate) {
      alert("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    recordPaymentMutation.mutate({
      tenantId: selectedTenant,
      amount: amountNum,
      paymentDate,
      forMonth: parseInt(forMonth),
      forYear: parseInt(forYear),
      notes: notes.trim() || undefined,
    });
  };

  const tenant = tenants.find((t) => t.id === selectedTenant);
  const suggestedAmount = tenant?.rentAmount ? parseFloat(tenant.rentAmount) : 0;

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Record Payment</DialogTitle>
          <DialogDescription>Manually record a cash payment received from a tenant</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Tenant Information</h3>
            </div>
            
            <div className="space-y-2" ref={dropdownRef}>
              <Label htmlFor="tenant" className="text-sm font-medium">Select Tenant *</Label>
              
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tenant name, property, or unit..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-9 pr-10 text-sm"
                  />
                  <ChevronDown 
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                    onClick={() => setShowDropdown(!showDropdown)}
                  />
                </div>
              </div>

              {/* Dropdown Results */}
              {showDropdown && filteredTenants.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[250px] overflow-auto">
                  <div className="py-1">
                    {filteredTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTenant(t)}
                        className={cn(
                          "px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
                          selectedTenant === t.id && "bg-blue-50 dark:bg-blue-950"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">{t.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {t.propertyName} • Unit {t.unitNumber}
                            </div>
                          </div>
                          {selectedTenant === t.id && (
                            <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No results message */}
              {showDropdown && searchQuery.trim() && filteredTenants.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="py-6 text-center text-sm text-gray-500">
                    No tenant found
                  </div>
                </div>
              )}

              {/* Selected Tenant Info Card */}
              {tenant && (
                <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/30">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Selected Tenant</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{tenant.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{tenant.propertyName} • {tenant.unitNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly Rent</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">KSH {suggestedAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Payment Details Section */}
          {tenant && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Payment Details</h3>
                
                {/* Payment For - Month & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="month" className="text-sm font-medium">Payment For Month *</Label>
                    <Select value={forMonth} onValueChange={setForMonth}>
                      <SelectTrigger id="month" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">Year *</Label>
                    <Select value={forYear} onValueChange={setForYear}>
                      <SelectTrigger id="year" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">Payment Amount (KSH) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9 text-lg font-semibold"
                    />
                  </div>
                  {suggestedAmount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(String(suggestedAmount))}
                      className="w-full text-xs"
                    >
                      Use Monthly Rent (KSH {suggestedAmount.toLocaleString()})
                    </Button>
                  )}
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm",
                          !paymentDate && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={(date) => date && setPaymentDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Amount Summary */}
              {amount && parseFloat(amount) > 0 && (
                <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Total Amount</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">KSH {parseFloat(amount).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes Section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes or reference details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Error Message */}
              {recordPaymentMutation.isError && (
                <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {recordPaymentMutation.error instanceof Error
                      ? recordPaymentMutation.error.message
                      : "Failed to record payment"}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPaymentMutation.isPending || !tenant}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
