import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, CheckCircle2, XCircle, Clock, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLog {
  _id: string;
  landlordId: string;
  tenantId?: string;
  type: 'welcome' | 'payment_received' | 'rent_reminder';
  status: 'sent' | 'failed' | 'pending';
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  resendEmailId?: string;
  error?: string;
  metadata?: {
    propertyName?: string;
    amount?: number;
    dueDate?: string;
    paymentMethod?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface EmailHistoryProps {
  landlordId: string;
}

export default function EmailHistory({ landlordId }: EmailHistoryProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailHistory();
  }, [landlordId, page]);

  const fetchEmailHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/emails/history/${landlordId}?page=${page}&limit=20`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch email history");
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching email history:", error);
      toast({
        title: "Error",
        description: "Failed to load email history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      welcome: "Welcome Email",
      payment_received: "Payment Confirmation",
      rent_reminder: "Rent Reminder",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      welcome: "bg-blue-100 text-blue-800",
      payment_received: "bg-green-100 text-green-800",
      rent_reminder: "bg-orange-100 text-orange-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // Filter logs based on search and filters
  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === "all" || log.type === filterType;
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesSearch =
      searchQuery === "" ||
      log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email History</CardTitle>
            <CardDescription>
              View all email notifications sent to your tenants
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEmailHistory}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by email, name, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Email Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="welcome">Welcome</SelectItem>
              <SelectItem value="payment_received">Payment</SelectItem>
              <SelectItem value="rent_reminder">Reminder</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">No email history found</p>
            <p className="text-sm text-neutral-500 mt-2">
              {searchQuery || filterType !== "all" || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Email notifications will appear here once sent"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log._id}
                className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(log.status)}
                      <Badge
                        variant="secondary"
                        className={getTypeColor(log.type)}
                      >
                        {getTypeLabel(log.type)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={getStatusColor(log.status)}
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-neutral-900 mb-1">
                      {log.subject}
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {log.recipientEmail}
                      </span>
                      {log.recipientName && (
                        <span className="text-neutral-500">
                          {log.recipientName}
                        </span>
                      )}
                    </div>
                    {log.metadata && (
                      <div className="mt-2 text-sm text-neutral-600">
                        {log.metadata.propertyName && (
                          <span className="mr-4">
                            Property: {log.metadata.propertyName}
                          </span>
                        )}
                        {log.metadata.amount && (
                          <span className="mr-4">
                            Amount: KES {log.metadata.amount.toLocaleString()}
                          </span>
                        )}
                        {log.metadata.paymentMethod && (
                          <span className="mr-4">
                            Method: {log.metadata.paymentMethod}
                          </span>
                        )}
                        {log.metadata.dueDate && (
                          <span>
                            Due: {format(new Date(log.metadata.dueDate), "MMM dd, yyyy")}
                          </span>
                        )}
                      </div>
                    )}
                    {log.error && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {log.error}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm text-neutral-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM dd, yyyy")}
                    <div className="text-xs">
                      {format(new Date(log.createdAt), "h:mm a")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-neutral-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
