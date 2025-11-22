import { useState, useEffect } from "react";
import { Settings, User, Lock, Bell, Building, HelpCircle, Smartphone, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";
import { Check, X, AlertCircle } from "lucide-react";
import EmailSettings from "@/components/dashboard/landlord/EmailSettings";

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  
  // Length check (minimum 8 characters)
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Has lowercase
  if (/[a-z]/.test(password)) score++;
  
  // Has uppercase
  if (/[A-Z]/.test(password)) score++;
  
  // Has number
  if (/[0-9]/.test(password)) score++;
  
  // Has special character
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'text-red-600' };
  if (score <= 4) return { score, label: 'Medium', color: 'text-orange-600' };
  return { score, label: 'Strong', color: 'text-green-600' };
}

function getPasswordRequirements(password: string) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Contains number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Contains special character (!@#$%^&*)', met: /[^a-zA-Z0-9]/.test(password) },
  ];
}

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
  preferences: {
    currency: string;
    timezone: string;
    language: string;
  };
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<LandlordSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const { toast } = useToast();
  const currentUser = useCurrentUser();

  // Load settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser?.id) return;
      
      try {
        const response = await fetch(`/api/landlords/${currentUser.id}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load settings",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: "Error", 
          description: "Failed to load settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser?.id, toast]);

  // Save settings to backend
  const saveSettings = async (updates: Partial<LandlordSettings>) => {
    if (!currentUser?.id || !settings) return;
    
    setSaving(true);
    try {
      console.log('Saving settings:', updates);
      
      const response = await fetch(`/api/landlords/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Save response:', result);
        
        // The response has { success, settings, message } structure
        const updatedSettings = result.settings || result;
        setSettings(updatedSettings);
        
        toast({
          title: "Success",
          description: result.message || "Settings saved successfully",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
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

  const handleNotificationToggle = (key: keyof LandlordSettings['notifications']) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    });
  };

  const handlePasswordChange = async () => {
    if (!currentUser?.id) return;
    
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
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

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check password strength
    const strength = getPasswordStrength(passwordForm.newPassword);
    if (strength.score < 3) {
      toast({
        title: "Error",
        description: "Password is too weak. Please use a mix of uppercase, lowercase, numbers, and special characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log('Changing password...');
      
      const response = await fetch(`/api/landlords/${currentUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();
      console.log('Password change response:', result);

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: result.message || "Password changed successfully",
        });
        // Clear the form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (field: keyof LandlordSettings['profile'], value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      profile: {
        ...settings.profile,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-600">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-600">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-neutral-900">Settings</h2>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    value={settings.profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={settings.profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={settings.profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="+254712345678"
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input 
                    value={settings.profile.company}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                    placeholder="Company name (optional)"
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input 
                  value={settings.profile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                  placeholder="Your address"
                />
              </div>
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <Switch 
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>SMS Alerts</Label>
                <Switch 
                  checked={settings.notifications.smsNotifications}
                  onCheckedChange={() => handleNotificationToggle('smsNotifications')}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>New Tenant Alerts</Label>
                <Switch 
                  checked={settings.notifications.newTenantAlerts}
                  onCheckedChange={() => handleNotificationToggle('newTenantAlerts')}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Payment Reminders</Label>
                <Switch 
                  checked={settings.notifications.paymentReminders}
                  onCheckedChange={() => handleNotificationToggle('paymentReminders')}
                />
              </div>
              <Button onClick={handleNotificationSave} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSettings landlordId={currentUser?.id || ""} />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input 
                  type="password" 
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  placeholder="Enter new password (min. 8 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                />
                {passwordForm.newPassword && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-600">Password strength:</span>
                      <span className={`text-sm font-semibold ${getPasswordStrength(passwordForm.newPassword).color}`}>
                        {getPasswordStrength(passwordForm.newPassword).label}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          getPasswordStrength(passwordForm.newPassword).score <= 2 
                            ? 'bg-red-500' 
                            : getPasswordStrength(passwordForm.newPassword).score <= 4 
                            ? 'bg-orange-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(getPasswordStrength(passwordForm.newPassword).score / 6) * 100}%` }}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-neutral-600 font-medium">Password must contain:</p>
                      {getPasswordRequirements(passwordForm.newPassword).map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {req.met ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-neutral-400" />
                          )}
                          <span className={`text-xs ${req.met ? 'text-green-600' : 'text-neutral-500'}`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input 
                  type="password" 
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value
                  })}
                />
                {passwordForm.confirmPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    {passwordForm.newPassword === passwordForm.confirmPassword ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600 font-medium">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600 font-medium">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handlePasswordChange} disabled={saving}>
                {saving ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
