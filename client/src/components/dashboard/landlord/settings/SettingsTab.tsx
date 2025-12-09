/**
 * Modern Settings Tab - Redesigned UI
 * Features: Responsive design, modern icons, better organization
 */

import { useState, useEffect } from "react";
import { 
  User, 
  Lock, 
  Mail, 
  Bell,
  Eye,
  EyeOff
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { Check, X } from "lucide-react";
import EmailSettings from "../EmailSettings";
import { cn } from "@/lib/utils";
import { getPasswordStrength, getPasswordRequirements } from "@/lib/password-utils";

interface LandlordSettings {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    company: string;
    address: string;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    newTenantAlerts: boolean;
    paymentReminders: boolean;
  };
}

type SettingsTab = 'profile' | 'notifications' | 'email' | 'security';

export default function ModernSettingsTab() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('email');
  const [settings, setSettings] = useState<LandlordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const { toast } = useToast();
  const currentUser = useCurrentUser();

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser?.id) return;
      
      try {
        const response = await fetch(`/api/landlords/${currentUser.id}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser?.id]);

  // Save settings
  const saveSettings = async (updates: Partial<LandlordSettings>) => {
    if (!currentUser?.id || !settings) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/landlords/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedSettings = result.settings || result;
        setSettings(updatedSettings);
        
        toast({
          title: "Saved",
          description: result.message || "Settings updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async () => {
    if (!settings) return;
    await saveSettings({ profile: settings.profile });
  };

  const handleNotificationSave = async () => {
    if (!settings) return;
    await saveSettings({ notifications: settings.notifications });
  };

  const handlePasswordChange = async () => {
    if (!currentUser?.id) return;
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error", 
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const strength = getPasswordStrength(passwordForm.newPassword);
    if (strength.score < 3) {
      toast({
        title: "Error",
        description: "Password is too weak",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/landlords/${currentUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { id: 'profile' as const, icon: User, label: 'Profile', description: 'Manage your account information' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications', description: 'Configure notification preferences' },
    { id: 'email' as const, icon: Mail, label: 'Email', description: 'Email templates and settings' },
    { id: 'security' as const, icon: Lock, label: 'Security', description: 'Password and security settings' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-neutral-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs Navigation - Fixed */}
      <div className="flex border-b border-neutral-200 dark:border-slate-700 overflow-x-auto mb-6 flex-shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2",
              activeTab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Scrollable */}
      <div className="space-y-6 flex-1 overflow-y-auto">
          {/* Email Tab */}
          {activeTab === 'email' && (
            <EmailSettings landlordId={currentUser?.id || ""} />
          )}

        {/* Profile Tab */}
        {activeTab === 'profile' && settings && (
          <Card className="border-neutral-200">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Profile Information</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Update your account details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</Label>
                    <Input 
                      id="fullName"
                      value={settings.profile.fullName}
                      onChange={(e) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, fullName: e.target.value }
                      })}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      value={settings.profile.email}
                      readOnly
                      disabled
                      className="h-11 bg-neutral-50 dark:bg-slate-800 cursor-not-allowed opacity-60"
                      title="Email address cannot be changed"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Email address cannot be changed for security reasons</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-neutral-700">Phone Number</Label>
                    <Input 
                      id="phone"
                      value={settings.profile.phone}
                      onChange={(e) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, phone: e.target.value }
                      })}
                      placeholder="+254 712 345 678"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium text-neutral-700">Company (Optional)</Label>
                    <Input 
                      id="company"
                      value={settings.profile.company}
                      onChange={(e) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, company: e.target.value }
                      })}
                      placeholder="Company name"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-neutral-700">Address</Label>
                  <Input 
                    id="address"
                    value={settings.profile.address}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, address: e.target.value }
                    })}
                    placeholder="Your address"
                    className="h-11"
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleProfileSave} 
                    disabled={saving}
                    className="h-11 px-6"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && settings && (
          <Card className="border-neutral-200">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Notification Preferences</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Manage how you receive notifications</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b dark:border-slate-700">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium text-neutral-900 dark:text-white">Email Notifications</Label>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Receive notifications via email</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailNotifications: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b dark:border-slate-700">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium text-neutral-900 dark:text-white">SMS Alerts</Label>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Get text message alerts</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.smsNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, smsNotifications: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b dark:border-slate-700">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium text-neutral-900 dark:text-white">New Tenant Alerts</Label>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Notify when new tenants are added</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.newTenantAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, newTenantAlerts: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium text-neutral-900 dark:text-white">Payment Reminders</Label>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Send reminders for upcoming payments</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.paymentReminders}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, paymentReminders: checked }
                        })
                      }
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleNotificationSave} 
                    disabled={saving}
                    className="h-11 px-6"
                  >
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card className="border-neutral-200">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Security Settings</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Update your password and security preferences</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="currentPassword"
                        type={showPassword.current ? "text" : "password"}
                        placeholder="Enter current password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      >
                        {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-neutral-700">New Password</Label>
                    <div className="relative">
                      <Input 
                        id="newPassword"
                        type={showPassword.new ? "text" : "password"}
                        placeholder="Enter new password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      >
                        {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.newPassword && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="text-neutral-600">Password strength:</span>
                              <span className={cn("font-medium", 
                                getPasswordStrength(passwordForm.newPassword).label === 'Weak' ? 'text-red-600' :
                                getPasswordStrength(passwordForm.newPassword).label === 'Medium' ? 'text-amber-600' :
                                'text-emerald-600'
                              )}>
                                {getPasswordStrength(passwordForm.newPassword).label}
                              </span>
                            </div>
                            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full transition-all rounded-full", getPasswordStrength(passwordForm.newPassword).color)}
                                style={{ width: `${(getPasswordStrength(passwordForm.newPassword).score / 6) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 bg-neutral-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-neutral-700">Password requirements:</p>
                          {getPasswordRequirements(passwordForm.newPassword).map((req, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {req.met ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-neutral-400" />
                              )}
                              <span className={cn("text-xs", req.met ? 'text-emerald-700' : 'text-neutral-600')}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">Confirm New Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword"
                        type={showPassword.confirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                      >
                        {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.confirmPassword && (
                      <div className="flex items-center gap-2 mt-2">
                        {passwordForm.newPassword === passwordForm.confirmPassword ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm text-emerald-700 font-medium">Passwords match</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700 font-medium">Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handlePasswordChange} 
                    disabled={saving}
                    className="h-11 px-6"
                  >
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </Card>
          )}
      </div>
    </div>
  );
}
