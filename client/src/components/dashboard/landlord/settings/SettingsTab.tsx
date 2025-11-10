import { useState, useEffect } from "react";
import { Settings, User, Lock, Bell, Building, HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/dashboard/useDashboard";

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
      const response = await fetch(`/api/landlords/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
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

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
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

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        // Clear the form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                />
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
