import { useState } from "react";
import { Menu, X, Settings, LogOut, Wallet, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  role: 'landlord' | 'tenant';
  userName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showNotifications?: React.ReactNode;
}

export default function HamburgerMenu({ 
  role, 
  userName, 
  activeTab, 
  onTabChange,
  showNotifications 
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const landlordMenuItems = [
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tenantMenuItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = role === 'landlord' ? landlordMenuItems : tenantMenuItems;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Menu</span>
            {showNotifications && <div>{showNotifications}</div>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-8 space-y-1">
          {/* User Info */}
          <div className="px-3 py-4 mb-4 bg-neutral-50 dark:bg-slate-900 rounded-lg">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {role}
            </p>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
              "text-neutral-700 dark:text-neutral-300",
              "hover:bg-neutral-100 dark:hover:bg-slate-800"
            )}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5" />
                <span className="text-sm font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span className="text-sm font-medium">Dark Mode</span>
              </>
            )}
          </button>

          {/* Menu Items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
              "text-red-600 dark:text-red-400",
              "hover:bg-red-50 dark:hover:bg-red-950"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
