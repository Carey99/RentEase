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
      return formatRentStatusText(tenant.rentCycle.daysRemaining, tenant.rentCycle.rentStatus);
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
          return tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1);
      }
    }
    return tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.avatar} alt={tenant.name} />
              <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-neutral-900">{tenant.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-neutral-600 mt-1">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {tenant.email}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {tenant.phone}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center text-sm text-neutral-600 mb-1">
                <MapPin className="h-4 w-4 mr-1" />
                {tenant.propertyName}
              </div>
              <p className="text-sm font-medium">{tenant.unitType}</p>
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-green-600">
                KSH {tenant.rentAmount.toLocaleString()}/month
              </p>
              <Badge className={`${getStatusColor(tenant.status)} mt-1`}>
                {getRentStatusBadgeText()}
              </Badge>
            </div>
            
            <TenantActions
              tenant={tenant}
              onViewDetails={onViewDetails}
              onTenantDeleted={onTenantDeleted}
            />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between text-sm text-neutral-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Lease: {new Date(tenant.leaseStart).toLocaleDateString()} - {new Date(tenant.leaseEnd).toLocaleDateString()}</span>
              </div>
              {tenant.rentCycle?.nextDueDate && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Next due: {new Date(tenant.rentCycle.nextDueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <span className="font-medium">{getStatusMessage(tenant.status)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
