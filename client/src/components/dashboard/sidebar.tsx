import { Home, LayoutDashboard, Building2, Users, Wallet, AlertCircle, Settings, Power } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: 'landlord' | 'tenant';
  userName: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Sidebar({ role, userName, activeTab = 'dashboard', onTabChange }: SidebarProps) {
  const { logout } = useAuth();

  const landlordNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'debt-tracking', label: 'Debt Tracking', icon: AlertCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tenantNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apartment', label: 'My Apartment', icon: Home },
    { id: 'payments', label: 'Payment History', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = role === 'landlord' ? landlordNavItems : tenantNavItems;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-neutral-100 dark:border-slate-800 h-screen sticky top-0 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">RentEase</span>
          </div>
          {role === 'landlord' && <NotificationBell />}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          {role === 'landlord' ? 'Landlord Portal' : 'Tenant Portal'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            MAIN MENU
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                data-testid={`nav-${item.id}`}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-slate-800 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-white" : "text-neutral-500 dark:text-neutral-400"
                )} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Theme Toggle & Logout */}
      <div className="p-3 border-t border-neutral-100 dark:border-slate-800 space-y-2">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Theme</span>
          <ThemeToggle />
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          data-testid="button-logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
        >
          <Power className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
