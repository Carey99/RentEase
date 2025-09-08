import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Edit
} from "lucide-react";
import type { Tenant } from "@/types/dashboard";

interface TenantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

export default function TenantDetailsDialog({ open, onOpenChange, tenant }: TenantDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!tenant) return null;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

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

  // Mock payment history data (replace with real data later)
  const paymentHistory = [
    { id: 1, month: "August 2025", amount: tenant.rentAmount, status: "paid", date: "2025-08-01", method: "Bank Transfer" },
    { id: 2, month: "July 2025", amount: tenant.rentAmount, status: "paid", date: "2025-07-01", method: "M-Pesa" },
    { id: 3, month: "June 2025", amount: tenant.rentAmount, status: "paid", date: "2025-06-01", method: "Bank Transfer" },
    { id: 4, month: "May 2025", amount: tenant.rentAmount, status: "late", date: "2025-05-05", method: "Cash" },
  ];

  // Mock lease documents (replace with real data later)
  const leaseDocuments = [
    { id: 1, name: "Lease Agreement", type: "PDF", size: "2.1 MB", uploadDate: "2025-08-01" },
    { id: 2, name: "ID Copy", type: "PDF", size: "1.5 MB", uploadDate: "2025-08-01" },
    { id: 3, name: "Income Verification", type: "PDF", size: "3.2 MB", uploadDate: "2025-08-01" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.avatar} alt={tenant.name} />
              <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span>{tenant.name}</span>
                <Badge className={`${getStatusColor(tenant.status)} flex items-center gap-1`}>
                  {getStatusIcon(tenant.status)}
                  {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-neutral-600 font-normal">{tenant.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Detailed information about {tenant.name}'s tenancy and rental history.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lease">Lease Details</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
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
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-neutral-600">{tenant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-neutral-600">{tenant.phone || "Not provided"}</p>
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
                    <DollarSign className="h-4 w-4 text-neutral-500" />
                    <div>
                      <p className="text-sm font-medium">Monthly Rent</p>
                      <p className="text-sm font-semibold text-green-600">KSH {tenant.rentAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">On-time Payments</p>
                      <p className="text-2xl font-bold text-green-600">3/4</p>
                      <p className="text-xs text-neutral-500">Last 4 months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Total Paid</p>
                      <p className="text-2xl font-bold text-blue-600">KSH {(tenant.rentAmount * 4).toLocaleString()}</p>
                      <p className="text-xs text-neutral-500">Since lease start</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-neutral-600">Days Remaining</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {Math.ceil((new Date(tenant.leaseEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                      </p>
                      <p className="text-xs text-neutral-500">Until lease end</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lease" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lease Agreement Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Lease Start Date</p>
                    <p className="text-lg font-semibold">{new Date(tenant.leaseStart).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Lease End Date</p>
                    <p className="text-lg font-semibold">{new Date(tenant.leaseEnd).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Monthly Rent</p>
                    <p className="text-lg font-semibold text-green-600">KSH {tenant.rentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Lease Duration</p>
                    <p className="text-lg font-semibold">
                      {Math.ceil((new Date(tenant.leaseEnd).getTime() - new Date(tenant.leaseStart).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">Lease Terms</p>
                  <ul className="text-sm text-neutral-700 space-y-1">
                    <li>• Rent due on the 1st of each month</li>
                    <li>• Security deposit: KSH {(tenant.rentAmount * 2).toLocaleString()}</li>
                    <li>• Late payment fee: KSH 5,000 after 5 days</li>
                    <li>• Utilities included: Water, Garbage collection</li>
                    <li>• 30-day notice required for lease termination</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${
                          payment.status === 'paid' ? 'bg-green-500' : 
                          payment.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{payment.month}</p>
                          <p className="text-sm text-neutral-600">
                            Paid on {new Date(payment.date).toLocaleDateString()} • {payment.method}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">KSH {payment.amount.toLocaleString()}</p>
                        <Badge className={`${
                          payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payment.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lease Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaseDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-neutral-600">
                            {doc.type} • {doc.size} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
            <Button>
              <Mail className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
