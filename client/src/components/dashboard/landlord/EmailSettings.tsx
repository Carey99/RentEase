/**
 * Modern Email Settings Component
 * Redesigned with better UX and responsive layout
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Send, 
  Clock, 
  FileText, 
  Eye,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [activeTemplate, setActiveTemplate] = useState<'welcome' | 'paymentReceived' | 'rentReminder'>('welcome');
  const [showPreview, setShowPreview] = useState(false);
  
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: true,
    autoRemindersEnabled: false,
    reminderDaysBefore: 3,
    fromName: 'RentEase Property Management',
    templates: {
      welcome: {
        subject: 'Welcome to Your New Home!',
        customMessage: '',
      },
      paymentReceived: {
        subject: 'Payment Confirmation - Rent Receipt',
        customMessage: 'Thank you for your prompt payment. We appreciate your timely payments!',
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

      if (!response.ok) throw new Error('Failed to fetch settings');

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

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Saved',
        description: 'Email settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-neutral-500">Loading email settings...</div>
      </div>
    );
  }

  const templateOptions = [
    { id: 'welcome' as const, label: 'Welcome', icon: Sparkles, description: 'Sent when tenant completes onboarding' },
    { id: 'paymentReceived' as const, label: 'Payment Due', icon: FileText, description: 'Sent when payment is received' },
    { id: 'rentReminder' as const, label: 'Reminder', icon: Bell, description: 'Sent before rent is due' },
  ];

  return (
    <div className="space-y-8">
      {/* Email Notifications Section */}
      <div>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Email Notifications</h2>
            <p className="text-sm text-neutral-600 mt-1">Configure automatic email notifications for your tenants.</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Enable Email Notifications */}
          <div className="flex items-start justify-between py-4 border-b">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium text-neutral-900">Enable Email Notifications</Label>
                {settings.enabled && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <p className="text-sm text-neutral-600">
                Send automated emails for payments, reminders, and welcome messages.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              className="ml-4"
            />
          </div>

          {settings.enabled && (
            <>
              {/* Automatic Rent Reminders */}
              <div className="flex items-start justify-between py-4 border-b">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium text-neutral-900">Automatic Rent Reminders</Label>
                    {settings.autoRemindersEnabled && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">
                    Automatically send rent reminders before due date.
                  </p>
                </div>
                <Switch
                  checked={settings.autoRemindersEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoRemindersEnabled: checked })
                  }
                  className="ml-4"
                />
              </div>

              {/* Reminder Settings */}
              {settings.autoRemindersEnabled && (
                <div className="bg-neutral-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 text-neutral-700">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Reminder Settings</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reminderDays" className="text-sm font-medium text-neutral-700">
                      Send Reminder Days Before Due Date
                    </Label>
                    <Select
                      value={settings.reminderDaysBefore.toString()}
                      onValueChange={(value) =>
                        setSettings({ ...settings, reminderDaysBefore: parseInt(value) })
                      }
                    >
                      <SelectTrigger id="reminderDays" className="h-11 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">On due date</SelectItem>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="2">2 days before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="5">5 days before</SelectItem>
                        <SelectItem value="7">7 days before</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500">
                      Tenants will receive reminders {settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'day' : 'days'} before their rent is due.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sender Information Section */}
      {settings.enabled && (
        <div>
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Sender Information</h2>
              <p className="text-sm text-neutral-600 mt-1">Customize the sender details for your outgoing emails.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromName" className="text-sm font-medium text-neutral-700">From Name</Label>
              <Input
                id="fromName"
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                placeholder="RentEase Property Management"
                className="h-11"
              />
              <p className="text-xs text-neutral-500">
                This name will appear as the sender in email notifications.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-700">Reply-To Email</Label>
              <Input
                value="support@rentease.com"
                disabled
                className="h-11 bg-neutral-50"
              />
              <p className="text-xs text-neutral-500">
                Replies will be directed to this email address.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates Section */}
      {settings.enabled && (
        <div>
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-neutral-900">Email Templates</h2>
              <p className="text-sm text-neutral-600 mt-1">Customize the messages that will be sent to your tenants.</p>
            </div>
          </div>

          {/* Template Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {templateOptions.map((template) => (
              <button
                key={template.id}
                onClick={() => setActiveTemplate(template.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTemplate === template.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                )}
              >
                <template.icon className="h-4 w-4" />
                {template.label}
              </button>
            ))}
          </div>

          {/* Template Editor */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium text-neutral-700">Subject Line</Label>
              <Input
                id="subject"
                value={settings.templates[activeTemplate].subject}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templates: {
                      ...settings.templates,
                      [activeTemplate]: {
                        ...settings.templates[activeTemplate],
                        subject: e.target.value,
                      },
                    },
                  })
                }
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage" className="text-sm font-medium text-neutral-700">
                Custom Message (Optional)
              </Label>
              <Textarea
                id="customMessage"
                value={settings.templates[activeTemplate].customMessage}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templates: {
                      ...settings.templates,
                      [activeTemplate]: {
                        ...settings.templates[activeTemplate],
                        customMessage: e.target.value,
                      },
                    },
                  })
                }
                placeholder="Dear [Tenant Name],&#10;&#10;Welcome to RentEase and your new home at [Property Address]! We are thrilled to have you as part of our community. This email confirms your lease and provides essential information to get started. You can access your tenant portal here: [Portal Link].&#10;&#10;Best regards,&#10;RentEase Property Management"
                rows={6}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-neutral-500">
                This message will be included in {templateOptions.find(t => t.id === activeTemplate)?.description.toLowerCase()}.
              </p>
            </div>

            {/* Live Preview Toggle */}
            <div className="pt-4 border-t">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Hide' : 'Show'} Live Email Preview
              </button>
            </div>

            {showPreview && (
              <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
                  <div className="text-xs text-neutral-500 mb-4">
                    This is a simulated preview. Actual formatting may vary slightly.
                  </div>
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b">
                      <h3 className="text-lg font-semibold text-neutral-800">RENTEASE</h3>
                    </div>
                    <h2 className="text-xl font-semibold text-neutral-900">
                      {settings.templates[activeTemplate].subject}
                    </h2>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-neutral-700 whitespace-pre-wrap">
                        {settings.templates[activeTemplate].customMessage || 'Your custom message will appear here...'}
                      </p>
                    </div>
                    <div className="pt-4 border-t text-sm text-neutral-600">
                      <p>Best regards,</p>
                      <p className="font-medium">{settings.fromName}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-2">
        <Button
          onClick={saveSettings}
          disabled={saving || !settings.enabled}
          className="h-10 px-6"
        >
          {saving ? "Saving Settings..." : "Save Settings"}
        </Button>
      </div>

      {/* Info Alert */}
      {!settings.enabled && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Email notifications are currently disabled. Enable them to start sending automated emails to your tenants.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
