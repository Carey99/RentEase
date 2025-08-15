import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, Building, Users, FileText, Settings, LogOut } from "lucide-react";

interface SidebarProps {
  role: 'landlord' | 'tenant';
  userName: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Sidebar({ role, userName, activeTab = 'dashboard', onTabChange }: SidebarProps) {
  const [, setLocation] = useLocation();

  const landlordNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'properties', label: 'Properties', icon: Building },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'bills', label: 'Bills', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tenantNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'apartment', label: 'My Apartment', icon: Home },
    { id: 'bills', label: 'My Bills', icon: FileText },
    { id: 'history', label: 'History', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = role === 'landlord' ? landlordNavItems : tenantNavItems;

  const logout = () => {
    setLocation('/');
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-neutral-200 min-h-screen">
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-2">
          <Home className="text-primary text-xl" />
          <span className="text-xl font-bold text-neutral-900">RentEase</span>
        </div>
        <p className="text-sm text-neutral-600 mt-1">
          {role === 'landlord' ? 'Landlord Portal' : 'Tenant Portal'}
        </p>
      </div>

      <nav className="mt-6">
        <div className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start ${
                  activeTab === item.id 
                    ? 'text-primary bg-blue-50 font-medium' 
                    : 'text-neutral-600 hover:text-primary hover:bg-blue-50'
                }`}
                onClick={() => onTabChange?.(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="border-t border-neutral-200 mt-6 pt-6 px-3">
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:bg-red-50"
            data-testid="button-logout"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </nav>
    </div>
  );
}
