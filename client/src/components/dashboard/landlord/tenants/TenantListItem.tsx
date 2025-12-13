import { Mail, Phone, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import TenantActions from "./TenantActions";
import { getRentStatusColor } from "@/lib/rent-cycle-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tenant } from "@/types/dashboard";

interface TenantListItemProps {
  tenant: Tenant;
  onViewDetails: (tenant: Tenant) => void;
  onTenantDeleted?: () => void;
}

export default function TenantListItem({ 
  tenant, 
  onViewDetails, 
  onTenantDeleted 
}: TenantListItemProps) {
  const isMobile = useIsMobile();
  
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getStatusColor = (status: string) => {
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

  const getRentStatusBadgeText = () => {
    if (tenant.rentCycle?.rentStatus) {
      switch (tenant.rentCycle.rentStatus) {
        case 'paid':
          return 'Paid';
        case 'active':
          return 'Active';
        case 'grace_period':
          return 'Grace Period';
        case 'overdue':
          return 'Overdue';
        default:
          return tenant.rentCycle.rentStatus;
      }
    }
    return tenant.status;
  };

  // Mobile-optimized view
  if (isMobile) {
    return (
      <div 
        className="flex items-start justify-between p-3 border border-neutral-200 dark:border-slate-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        onClick={() => onViewDetails(tenant)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={tenant.profileImage || tenant.avatar} />
            <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            {/* Name and Status */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{tenant.name}</h3>
              <Badge className={`${getStatusColor(tenant.status)} border-0 text-xs flex-shrink-0`}>
                {getRentStatusBadgeText()}
              </Badge>
            </div>

            {/* Property */}
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 truncate">
              {tenant.propertyName} • Unit {tenant.unitNumber || 'N/A'}
            </p>

            {/* Contact - Truncated */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <div className="flex items-center gap-1 truncate">
                <Phone size={12} />
                <span className="truncate">{tenant.phone || 'No phone'}</span>
              </div>
            </div>

            {/* Rent and Status */}
            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Rent: </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  KSH {tenant.rentAmount?.toLocaleString()}
                </span>
              </div>
              
              {tenant.rentCycle?.daysRemaining !== undefined && (
                <div className={`font-medium ${
                  tenant.rentCycle.rentStatus === 'overdue' || tenant.rentCycle.rentStatus === 'grace_period'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}>
                  {tenant.rentCycle.rentStatus === 'overdue' || tenant.rentCycle.rentStatus === 'grace_period'
                    ? `${Math.abs(tenant.rentCycle.daysRemaining)}d overdue`
                    : `${tenant.rentCycle.daysRemaining}d left`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-2">
          <TenantActions
            tenant={tenant}
            onViewDetails={() => onViewDetails(tenant)}
            onTenantDeleted={onTenantDeleted}
          />
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div 
      className="flex items-center justify-between p-4 border border-neutral-200 dark:border-slate-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      onClick={() => onViewDetails(tenant)}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Avatar and Name */}
        <Avatar className="h-10 w-10">
          <AvatarImage src={tenant.profileImage || tenant.avatar} />
          <AvatarFallback>{getInitials(tenant.name)}</AvatarFallback>
        </Avatar>
        
        <div className="flex items-center gap-6 flex-1">
          {/* Name and Status */}
          <div className="min-w-[180px]">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">{tenant.name}</h3>
            <Badge className={`${getStatusColor(tenant.status)} border-0 text-xs mt-1`}>
              {getRentStatusBadgeText()}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 flex-1">
            <div className="flex items-center gap-1">
              <Mail size={14} />
              <span className="truncate max-w-[150px]">{tenant.email}</span>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-1">
                <Phone size={14} />
                <span>{tenant.phone}</span>
              </div>
            )}
          </div>

          {/* Property and Rent */}
          <div className="flex items-center gap-6 text-xs">
            <div className="min-w-[120px]">
              <p className="text-neutral-500 dark:text-neutral-400">Property</p>
              <p className="font-medium text-neutral-900 dark:text-white">{tenant.propertyName}</p>
            </div>
            
            <div className="min-w-[100px]">
              <p className="text-neutral-500 dark:text-neutral-400">Monthly Rent</p>
              <p className="font-semibold text-neutral-900 dark:text-white">KSH {tenant.rentAmount?.toLocaleString()}</p>
            </div>

            {/* Days Remaining/Overdue */}
            {tenant.rentCycle?.daysRemaining !== undefined && (
              <div className="min-w-[100px]">
                <p className="text-neutral-500 dark:text-neutral-400">
                  {tenant.rentCycle.rentStatus === 'overdue' || tenant.rentCycle.rentStatus === 'grace_period'
                    ? 'Overdue'
                    : `${tenant.rentCycle.daysRemaining === 1 ? 'Day' : 'Days'} Left`}
                </p>
                <p className={`font-semibold ${
                  tenant.rentCycle.rentStatus === 'overdue' || tenant.rentCycle.rentStatus === 'grace_period'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}>
                  {tenant.rentCycle.rentStatus === 'overdue' || tenant.rentCycle.rentStatus === 'grace_period'
                    ? `${Math.abs(tenant.rentCycle.daysRemaining)} ${Math.abs(tenant.rentCycle.daysRemaining) === 1 ? 'day' : 'days'}`
                    : `${tenant.rentCycle.daysRemaining} ${tenant.rentCycle.daysRemaining === 1 ? 'day' : 'days'}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <TenantActions
          tenant={tenant}
          onViewDetails={() => onViewDetails(tenant)}
          onTenantDeleted={onTenantDeleted}
        />
      </div>
    </div>
  );
}
