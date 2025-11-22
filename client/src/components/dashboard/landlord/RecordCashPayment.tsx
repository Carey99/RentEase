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
import { CalendarIcon, Loader2, DollarSign, Search, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Record Cash Payment
          </DialogTitle>
          <DialogDescription>
            Manually record a cash payment received from a tenant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Selection with Search */}
          <div className="space-y-2" ref={dropdownRef}>
            <Label htmlFor="tenant">Tenant *</Label>
            
            {/* Searchable Combobox */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search tenant by name, property, or unit..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-9 pr-10"
                />
                <ChevronDown 
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground cursor-pointer" 
                  onClick={() => setShowDropdown(!showDropdown)}
                />
              </div>

              {/* Dropdown Results - Only show when there are filtered results */}
              {showDropdown && filteredTenants.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-auto">
                  <div className="py-1">
                    {filteredTenants.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTenant(t)}
                        className={cn(
                          "px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors",
                          selectedTenant === t.id && "bg-blue-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.propertyName} - {t.unitNumber}
                            </div>
                          </div>
                          {selectedTenant === t.id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* No results message - only show when user has typed something */}
              {showDropdown && searchQuery.trim() && filteredTenants.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No tenant found matching "{searchQuery}"
                  </div>
                </div>
              )}
            </div>

            {tenant && suggestedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Rent amount: KSH {suggestedAmount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Payment Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Payment For Month *</Label>
              <Select value={forMonth} onValueChange={setForMonth}>
                <SelectTrigger id="month">
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
              <Label htmlFor="year">Year *</Label>
              <Select value={forYear} onValueChange={setForYear}>
                <SelectTrigger id="year">
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KSH) *</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
              />
              <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {tenant && suggestedAmount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(suggestedAmount))}
                className="text-xs"
              >
                Use rent amount (KSH {suggestedAmount.toLocaleString()})
              </Button>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date *</Label>
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
                  {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error Message */}
          {recordPaymentMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {recordPaymentMutation.error instanceof Error
                ? recordPaymentMutation.error.message
                : "Failed to record payment"}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={recordPaymentMutation.isPending}
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
