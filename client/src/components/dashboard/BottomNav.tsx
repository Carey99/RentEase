import { LayoutDashboard, Building2, Users, AlertCircle, Home, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  role: 'landlord' | 'tenant';
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ role, activeTab, onTabChange }: BottomNavProps) {
  const landlordNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'debt-tracking', label: 'Debt', icon: AlertCircle },
  ];

  const tenantNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apartment', label: 'Apartment', icon: Home },
    { id: 'payments', label: 'Payments', icon: Wallet },
  ];

  const navItems = role === 'landlord' ? landlordNavItems : tenantNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-neutral-200 dark:border-slate-800 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-primary/10")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
