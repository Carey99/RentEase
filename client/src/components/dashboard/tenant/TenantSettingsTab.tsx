import { useState, useEffect } from "react";
import { Settings, User, Lock, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getPasswordStrength, getPasswordRequirements } from "@/lib/password-utils";

interface TenantProfile {
  fullName: string;
  email: string;
  phone: string;
}

interface TenantSettingsTabProps {
  tenantId?: string;
}

export default function TenantSettingsTab({ tenantId }: TenantSettingsTabProps) {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!tenantId) return;
      
      try {
        const response = await fetch(`/api/tenants/${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          setProfile({
            fullName: data.fullName || '',
            email: data.email || '',
            phone: data.phone || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [tenantId]);

  const handleProfileSave = async () => {
    if (!tenantId || !profile) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        
        // Update localStorage
        const userData = localStorage.getItem('rentease_user');
        if (userData) {
          const user = JSON.parse(userData);
          user.fullName = profile.fullName;
          user.phone = profile.phone;
          localStorage.setItem('rentease_user', JSON.stringify(user));
        }
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!tenantId) return;
    
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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!passwordRegex.test(passwordForm.newPassword)) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/password`, {
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

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: result.message || "Password changed successfully",
        });
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

  const handleProfileChange = (field: keyof TenantProfile, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger value="profile" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Profile</TabsTrigger>
          <TabsTrigger value="security" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm text-gray-600 dark:text-gray-400">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-gray-600 dark:text-gray-400">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cannot be changed</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm text-gray-600 dark:text-gray-400">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+254712345678"
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <Button 
                onClick={handleProfileSave} 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 mt-4"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Current Password</Label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value
                  })}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">New Password</Label>
                <Input
                  type="password"
                  placeholder="Min 8 chars with uppercase, lowercase, number, symbol"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400"
                />
                {passwordForm.newPassword && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Password Strength</span>
                      <span className={`text-xs font-semibold ${getPasswordStrength(passwordForm.newPassword).color}`}>
                        {getPasswordStrength(passwordForm.newPassword).label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          getPasswordStrength(passwordForm.newPassword).score <= 2
                            ? 'bg-red-500'
                            : getPasswordStrength(passwordForm.newPassword).score <= 4
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(getPasswordStrength(passwordForm.newPassword).score / 6) * 100}%` }}
                      />
                    </div>
                    <div className="space-y-2 mt-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Requirements:</p>
                      {getPasswordRequirements(passwordForm.newPassword).map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {req.met ? (
                            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                          )}
                          <span className={`text-xs ${req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value
                  })}
                  className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400"
                />
                {passwordForm.confirmPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    {passwordForm.newPassword === passwordForm.confirmPassword ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button 
                onClick={handlePasswordChange} 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 mt-4"
              >
                {saving ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
