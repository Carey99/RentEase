/**
 * Email Settings Component
 * Allows landlords to configure email notification preferences
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmailHistory from './EmailHistory';

interface EmailSettings {
  enabled: boolean;
  autoRemindersEnabled: boolean;
  reminderDaysBefore: number;
  fromName: string;
  templates: {
    welcome: {
      subject: string;
      customMessage: string;
    };
    paymentReceived: {
      subject: string;
      customMessage: string;
    };
    rentReminder: {
      subject: string;
      customMessage: string;
    };
  };
}

interface EmailSettingsProps {
  landlordId: string;
}

export default function EmailSettings({ landlordId }: EmailSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: true,
    autoRemindersEnabled: false,
    reminderDaysBefore: 3,
    fromName: 'RentEase',
    templates: {
      welcome: {
        subject: 'Welcome to Your New Home!',
        customMessage: '',
      },
      paymentReceived: {
        subject: 'Payment Received - Thank You!',
        customMessage: '',
      },
      rentReminder: {
        subject: 'Rent Payment Reminder',
        customMessage: '',
      },
    },
  });

  // Fetch settings
  useEffect(() => {
    fetchSettings();
  }, [landlordId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/emails/settings/${landlordId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch email settings');
      }

      const data = await response.json();
      if (data.emailSettings) {
        setSettings(data.emailSettings);
      }
    } catch (error: any) {
      console.error('Error fetching email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/emails/settings/${landlordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailSettings: settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'Email notification settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">Email History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure automatic email notifications for your tenants
                  </CardDescription>
                </div>
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Send automated emails for payments, reminders, and welcome messages
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
              />
            </div>

            {settings.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Rent Reminders</Label>
                    <p className="text-sm text-gray-500">
                      Automatically send rent reminders before due date
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoRemindersEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoRemindersEnabled: checked })
                    }
                  />
                </div>

                {settings.autoRemindersEnabled && (
                  <div className="space-y-2">
                    <Label>Send Reminder Days Before Due Date</Label>
                    <Select
                      value={settings.reminderDaysBefore.toString()}
                      onValueChange={(value) =>
                        setSettings({ ...settings, reminderDaysBefore: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                          <SelectItem key={days} value={days.toString()}>
                            {days} {days === 1 ? 'day' : 'days'} before
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={settings.fromName}
                    onChange={(e) =>
                      setSettings({ ...settings, fromName: e.target.value })
                    }
                    placeholder="RentEase"
                  />
                  <p className="text-sm text-gray-500">
                    This name will appear as the sender in email notifications
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Email Templates */}
          {settings.enabled && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Customize the messages that will be sent to your tenants
                </p>

                <Tabs defaultValue="welcome" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="welcome">Welcome</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="reminder">Reminder</TabsTrigger>
                  </TabsList>

                  <TabsContent value="welcome" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        value={settings.templates.welcome.subject}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              welcome: {
                                ...settings.templates.welcome,
                                subject: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Welcome to Your New Home!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Message (Optional)</Label>
                      <Textarea
                        value={settings.templates.welcome.customMessage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              welcome: {
                                ...settings.templates.welcome,
                                customMessage: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Add a personal welcome message for new tenants..."
                        rows={4}
                      />
                      <p className="text-sm text-gray-500">
                        This message will be included in the welcome email sent when a tenant
                        completes onboarding
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="payment" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        value={settings.templates.paymentReceived.subject}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              paymentReceived: {
                                ...settings.templates.paymentReceived,
                                subject: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Payment Received - Thank You!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Message (Optional)</Label>
                      <Textarea
                        value={settings.templates.paymentReceived.customMessage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              paymentReceived: {
                                ...settings.templates.paymentReceived,
                                customMessage: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Add a personal thank you message..."
                        rows={4}
                      />
                      <p className="text-sm text-gray-500">
                        This message will be included in payment confirmation emails
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="reminder" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject Line</Label>
                      <Input
                        value={settings.templates.rentReminder.subject}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              rentReminder: {
                                ...settings.templates.rentReminder,
                                subject: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Rent Payment Reminder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Message (Optional)</Label>
                      <Textarea
                        value={settings.templates.rentReminder.customMessage}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              rentReminder: {
                                ...settings.templates.rentReminder,
                                customMessage: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="Add a friendly reminder message..."
                        rows={4}
                      />
                      <p className="text-sm text-gray-500">
                        This message will be included in rent reminder emails
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Emails are sent via Resend using your configured sender address. Test
                  emails help verify your setup is working correctly.
                </AlertDescription>
              </Alert>
            </>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <EmailHistory landlordId={landlordId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
