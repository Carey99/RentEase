import { Home } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  role: 'landlord' | 'tenant';
  userName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showNotifications?: React.ReactNode;
  title?: string;
}

export default function MobileHeader({ 
  role, 
  userName, 
  activeTab, 
  onTabChange,
  showNotifications,
  title
}: MobileHeaderProps) {
  const getTitle = () => {
    if (title) return title;
    
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'properties': return 'Properties';
      case 'tenants': return 'Tenants';
      case 'debt-tracking': return 'Debt Tracking';
      case 'apartment': return 'My Apartment';
      case 'payments': return role === 'landlord' ? 'Payments' : 'Payment History';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-950 border-b border-neutral-200 dark:border-slate-800 md:hidden">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {getTitle()}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <HamburgerMenu
            role={role}
            userName={userName}
            activeTab={activeTab}
            onTabChange={onTabChange}
            showNotifications={showNotifications}
          />
        </div>
      </div>
    </header>
  );
}
