import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  User, 
  Building, 
  CreditCard,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X,
  Bell,
  Loader2
} from "lucide-react";
import type { Tenant } from "@/types/dashboard";

interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onTenantUpdate?: (updatedTenant: Tenant) => void; // Callback to refresh parent component
}

export default function TenantDetailsDialog({ open, onOpenChange, tenant, onTenantUpdate }: TenantDetailsDialogProps) {
  // State management for dialog tabs and edit mode
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
  const [sendingReminder, setSendingReminder] = useState(false);
  const { toast } = useToast();

  // Fetch actual payment history for this tenant
  const { data: paymentHistory = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['tenantPaymentHistory', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const response = await fetch(`/api/payment-history/tenant/${tenant.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!tenant?.id && open, // Only fetch when dialog is open and tenant exists
  });

  if (!tenant) return null;

  // Initialize form data when user clicks "Edit Details"
  const handleEditMode = () => {
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      unitNumber: tenant.unitNumber,
      rentAmount: tenant.rentAmount,
      status: tenant.status,
    });
    setIsEditMode(true);
  };

  // Save changes to database and update UI
  const handleSaveEdit = async () => {
    try {
      // Send PUT request to update tenant information
      const response = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone,
          unitNumber: editFormData.unitNumber,
          rentAmount: editFormData.rentAmount,
          status: editFormData.status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tenant');
      }

      const updatedBackendTenant = await response.json();
      
      // Create updated tenant object for frontend state
      const updatedTenant: Tenant = {
        ...tenant,
        name: editFormData.name || tenant.name,
        email: editFormData.email || tenant.email,
        phone: editFormData.phone || tenant.phone,
        unitNumber: editFormData.unitNumber || tenant.unitNumber,
        rentAmount: editFormData.rentAmount || tenant.rentAmount,
        status: editFormData.status || tenant.status,
      };
      
      toast({
        title: "Tenant Updated",
        description: "Tenant details have been successfully updated.",
      });

      // Notify parent component to refresh tenant list
      if (onTenantUpdate) {
        onTenantUpdate(updatedTenant);
      }

      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: "Failed to update tenant details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Cancel editing and reset form
  const handleCancelEdit = () => {
    setEditFormData({});
    setIsEditMode(false);
  };

  // Send rent reminder email to tenant
  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const response = await fetch(`/api/emails/send-reminder/${tenant.id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      toast({
        title: "Reminder Sent",
        description: `Rent reminder email sent to ${tenant.name}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Reminder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  // Helper function to get user initials for avatar
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  // Color coding for tenant status badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Icons for different tenant statuses
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "inactive":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.avatar} alt={tenant.name} />
              <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <Input
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-lg font-semibold"
                  />
                ) : (
                  <span>{tenant.name}</span>
                )}
                
                {isEditMode ? (
                  <Select
                    value={editFormData.status || tenant.status}
                    onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                      setEditFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`${getStatusColor(tenant.status)} flex items-center gap-1`}>
                    {getStatusIcon(tenant.status)}
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-neutral-600 font-normal">{tenant.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detailed information about {tenant.name}'s tenancy and rental history.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-neutral-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email</p>
                      {isEditMode ? (
                        <Input
                          type="email"
                          value={editFormData.email || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-neutral-600">{tenant.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Phone</p>
                      {isEditMode ? (
                        <Input
                          type="tel"
                          value={editFormData.phone || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-neutral-600">{tenant.phone || "Not provided"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium">Tenant Since</p>
                      <p className="text-sm text-neutral-600">{new Date(tenant.leaseStart).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium">Property</p>
                      <p className="text-sm text-neutral-600">{tenant.propertyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium">Unit Type</p>
                      <p className="text-sm text-neutral-600">{tenant.unitType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-neutral-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Unit Number</p>
                      {isEditMode ? (
                        <Input
                          value={editFormData.unitNumber || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
                          placeholder="Enter unit number"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm text-neutral-600">{tenant.unitNumber || "Not assigned"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-neutral-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Monthly Rent</p>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={editFormData.rentAmount || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, rentAmount: parseInt(e.target.value) || 0 }))}
                          placeholder="Enter rent amount"
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-green-600">KSH {tenant.rentAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats - Real Dynamic Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total Debt Owed */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      (tenant.rentCycle?.hasPartialPayment && tenant.rentCycle?.partialPaymentInfo && tenant.rentCycle.partialPaymentInfo.remainingBalance > 0)
                        ? 'bg-red-100' 
                        : 'bg-green-100'
                    }`}>
                      <DollarSign className={`h-4 w-4 ${
                        (tenant.rentCycle?.hasPartialPayment && tenant.rentCycle?.partialPaymentInfo && tenant.rentCycle.partialPaymentInfo.remainingBalance > 0)
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Debt Owed</p>
                      <p className={`text-2xl font-bold ${
                        (tenant.rentCycle?.hasPartialPayment && tenant.rentCycle?.partialPaymentInfo && tenant.rentCycle.partialPaymentInfo.remainingBalance > 0)
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        KSH {tenant.rentCycle?.hasPartialPayment && tenant.rentCycle?.partialPaymentInfo
                          ? tenant.rentCycle.partialPaymentInfo.remainingBalance.toLocaleString()
                          : '0'}
                      </p>
                      <p className="text-xs text-neutral-500">Outstanding balance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Card 2: Payment Status */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      tenant.rentCycle?.rentStatus === 'paid' ? 'bg-green-100' :
                      tenant.rentCycle?.rentStatus === 'overdue' ? 'bg-red-100' :
                      tenant.rentCycle?.rentStatus === 'grace_period' ? 'bg-orange-100' :
                      'bg-yellow-100'
                    }`}>
                      <CreditCard className={`h-4 w-4 ${
                        tenant.rentCycle?.rentStatus === 'paid' ? 'text-green-600' :
                        tenant.rentCycle?.rentStatus === 'overdue' ? 'text-red-600' :
                        tenant.rentCycle?.rentStatus === 'grace_period' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Payment Status</p>
                      <p className={`text-xl font-bold ${
                        tenant.rentCycle?.rentStatus === 'paid' ? 'text-green-600' :
                        tenant.rentCycle?.rentStatus === 'overdue' ? 'text-red-600' :
                        tenant.rentCycle?.rentStatus === 'grace_period' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {tenant.rentCycle?.hasPartialPayment 
                          ? `Partial`
                          : tenant.rentCycle?.rentStatus === 'paid' 
                          ? 'Paid'
                          : tenant.rentCycle?.rentStatus === 'overdue'
                          ? 'Overdue'
                          : tenant.rentCycle?.rentStatus === 'grace_period'
                          ? 'Grace Period'
                          : 'Active'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {tenant.rentCycle?.hasPartialPayment && tenant.rentCycle?.partialPaymentInfo
                          ? `KSH ${tenant.rentCycle.partialPaymentInfo.remainingBalance.toLocaleString()} remaining`
                          : tenant.rentCycle?.rentStatus === 'paid'
                          ? 'Current month paid'
                          : tenant.rentCycle?.rentStatus === 'overdue'
                          ? `${Math.abs(tenant.rentCycle?.daysRemaining || 0)} ${Math.abs(tenant.rentCycle?.daysRemaining || 0) === 1 ? 'day' : 'days'} overdue`
                          : 'Payment pending'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Days to Next Payment */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      tenant.rentCycle?.rentStatus === 'overdue' ? 'bg-red-100' :
                      tenant.rentCycle?.rentStatus === 'grace_period' ? 'bg-orange-100' :
                      'bg-blue-100'
                    }`}>
                      <Clock className={`h-4 w-4 ${
                        tenant.rentCycle?.rentStatus === 'overdue' ? 'text-red-600' :
                        tenant.rentCycle?.rentStatus === 'grace_period' ? 'text-orange-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">
                        {tenant.rentCycle?.rentStatus === 'overdue' || tenant.rentCycle?.rentStatus === 'grace_period'
                          ? `${Math.abs(tenant.rentCycle?.daysRemaining || 0) === 1 ? 'Day' : 'Days'} Overdue`
                          : `${(tenant.rentCycle?.daysRemaining || 0) === 1 ? 'Day' : 'Days'} Remaining`}
                      </p>
                      <p className={`text-2xl font-bold ${
                        tenant.rentCycle?.rentStatus === 'overdue' ? 'text-red-600' :
                        tenant.rentCycle?.rentStatus === 'grace_period' ? 'text-orange-600' :
                        'text-blue-600'
                      }`}>
                        {tenant.rentCycle?.rentStatus === 'overdue' || tenant.rentCycle?.rentStatus === 'grace_period'
                          ? Math.abs(tenant.rentCycle?.daysRemaining || 0)
                          : (tenant.rentCycle?.daysRemaining || 0)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {tenant.rentCycle?.rentStatus === 'overdue' || tenant.rentCycle?.rentStatus === 'grace_period'
                          ? 'Past due date'
                          : 'Until next payment'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPayments ? (
                  <div className="text-center py-8 text-neutral-500">
                    Loading payment history...
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No payment history available
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {paymentHistory.map((payment: any) => {
                      const paymentDate = new Date(payment.createdAt || payment.dueDate);
                      const monthYear = paymentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      
                      // Determine display status and color
                      const getPaymentDisplay = () => {
                        if (payment.status === 'completed') {
                          return { label: 'Paid', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' };
                        } else if (payment.status === 'partial') {
                          return { label: 'Partial', color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500' };
                        } else if (payment.status === 'overpaid') {
                          return { label: 'Overpaid', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' };
                        } else if (payment.status === 'pending') {
                          return { label: 'Pending', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' };
                        } else {
                          return { label: 'Failed', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' };
                        }
                      };
                      
                      const displayStatus = getPaymentDisplay();
                      
                      // Parse amounts safely - they might be numbers or objects
                      const parseAmount = (value: any): number => {
                        if (typeof value === 'number') return value;
                        if (typeof value === 'object' && value !== null) return 0;
                        return Number(value) || 0;
                      };
                      
                      const amountPaid = parseAmount(payment.amount);
                      const monthlyRent = parseAmount(payment.monthlyRent);
                      const totalUtilityCost = parseAmount(payment.totalUtilityCost);
                      
                      // Total expected is monthlyRent + totalUtilityCost from the payment record
                      // If not available, fall back to tenant's rent amount
                      const totalExpected = monthlyRent > 0 
                        ? monthlyRent + totalUtilityCost 
                        : tenant.rentAmount;
                      
                      return (
                        <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`h-3 w-3 rounded-full ${displayStatus.dotColor}`} />
                            <div>
                              <p className="font-medium">{monthYear}</p>
                              <p className="text-sm text-neutral-600">
                                {payment.status === 'completed' && payment.createdAt
                                  ? `Paid on ${new Date(payment.createdAt).toLocaleDateString()}`
                                  : payment.status === 'partial'
                                  ? `Partial payment: KSH ${amountPaid.toLocaleString()} of ${totalExpected.toLocaleString()}`
                                  : `Due: ${new Date(payment.dueDate).toLocaleDateString()}`}
                                {totalUtilityCost > 0 && (
                                  <span className="ml-2 text-xs text-neutral-500">
                                    (Rent: {monthlyRent.toLocaleString()} + Utils: {totalUtilityCost.toLocaleString()})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              KSH {amountPaid.toLocaleString()}
                              {payment.status !== 'completed' && payment.status !== 'overpaid' && (
                                <span className="text-sm text-neutral-500 font-normal">
                                  {' '}/ {totalExpected.toLocaleString()}
                                </span>
                              )}
                            </p>
                            <Badge className={displayStatus.color}>
                              {displayStatus.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEditMode}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                >
                  {sendingReminder ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="mr-2 h-4 w-4" />
                  )}
                  {sendingReminder ? "Sending..." : "Send Reminder"}
                </Button>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
