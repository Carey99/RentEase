import { useState, useEffect } from "react";
import { Settings, User, Lock, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TenantProfile {
  fullName: string;
  email: string;
  phone: string;
}

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
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

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

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
        <div className="text-neutral-600">Loading settings...</div>
      </div>
    );
  }

  if (!profile) {
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-neutral-100"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  placeholder="+254712345678"
                />
              </div>
              <Button onClick={handleProfileSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
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
