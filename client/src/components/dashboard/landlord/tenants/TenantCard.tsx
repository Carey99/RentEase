import { Mail, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TenantActions from "./TenantActions";
import { formatRentStatusText, getRentStatusColor } from "@/lib/rent-cycle-utils";
import type { Tenant } from "@/types/dashboard";

interface TenantCardProps {
  tenant: Tenant;
  onViewDetails: (tenant: Tenant) => void;
  onTenantDeleted?: () => void;
}

export default function TenantCard({ 
  tenant, 
  onViewDetails, 
  onTenantDeleted 
}: TenantCardProps) {
  const getStatusColor = (status: string) => {
    // Use rent status if available, otherwise fallback to general status
    if (tenant.rentCycle?.rentStatus) {
      return getRentStatusColor(tenant.rentCycle.rentStatus);
    }
    
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getStatusMessage = (status: string) => {
    // Use rent cycle status if available
    if (tenant.rentCycle?.rentStatus && tenant.rentCycle.daysRemaining !== undefined) {
      return formatRentStatusText(
        tenant.rentCycle.daysRemaining, 
        tenant.rentCycle.rentStatus, 
        tenant.rentCycle.advancePaymentDays
      );
    }
    
    switch (status) {
      case "active":
        return "Current tenant";
      case "pending":
        return "Pending move-in";
      case "inactive":
        return "Lease expired";
      case "overdue":
        return "Rent overdue";
      default:
        return "";
    }
  };

  const getRentStatusBadgeText = () => {
    if (tenant.rentCycle?.rentStatus) {
      switch (tenant.rentCycle.rentStatus) {
        case 'paid_in_advance':
          if (tenant.rentCycle.advancePaymentMonths && tenant.rentCycle.advancePaymentMonths > 0) {
            return `${tenant.rentCycle.advancePaymentMonths} month${tenant.rentCycle.advancePaymentMonths > 1 ? 's' : ''} ahead`;
          }
          return 'Paid in Advance';
        case 'active':
          if (tenant.rentCycle.daysRemaining && tenant.rentCycle.daysRemaining <= 3) {
            return `Due in ${tenant.rentCycle.daysRemaining}d`;
          }
          return 'Active';
        case 'grace_period':
          return 'Grace Period';
        case 'overdue':
          return 'Overdue';
        default:
          return tenant.rentCycle.rentStatus;
      }
    }
    return '';
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.profileImage || tenant.avatar} />
              <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{tenant.name}</h3>
              <Badge 
                className={`${getStatusColor(tenant.status)} border-0`}
              >
                {getRentStatusBadgeText() || tenant.status}
              </Badge>
            </div>
          </div>
          <TenantActions
            tenant={tenant}
            onViewDetails={() => onViewDetails(tenant)}
            onTenantDeleted={onTenantDeleted}
          />
        </div>

        <div className="space-y-2 text-sm text-neutral-600 mb-4">
          <div className="flex items-center space-x-2">
            <Mail size={16} />
            <span>{tenant.email}</span>
          </div>
          {tenant.phone && (
            <div className="flex items-center space-x-2">
              <Phone size={16} />
              <span>{tenant.phone}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <MapPin size={16} />
            <span>{tenant.propertyAddress || tenant.propertyName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={16} />
            <span>Lease: {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Monthly Rent:</span>
            <span className="font-semibold">${tenant.monthlyRent || tenant.rentAmount}</span>
          </div>
          {getStatusMessage(tenant.status) && (
            <div className="mt-2 flex items-center space-x-2">
              <Clock size={16} className="text-neutral-400" />
              <span className="text-sm text-neutral-600">
                {getStatusMessage(tenant.status)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
