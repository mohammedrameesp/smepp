'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Save, Loader2, Copy, Check, Phone, UserCheck, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

type WhatsAppSource = 'NONE' | 'PLATFORM' | 'CUSTOM';

interface WhatsAppConfig {
  id: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  isActive: boolean;
  accessToken: string;
}

interface UserPhone {
  id: string;
  phoneNumber: string;
  isVerified: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ConfigResponse {
  configured: boolean;
  config?: WhatsAppConfig;
  source: WhatsAppSource;
  platformAvailable: boolean;
  platformDisplayPhone?: string;
  platformBusinessName?: string;
  customConfigured: boolean;
  webhookUrl: string;
}

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [switchingSource, setSwitchingSource] = useState(false);

  // Config state
  const [source, setSource] = useState<WhatsAppSource>('NONE');
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [platformDisplayPhone, setPlatformDisplayPhone] = useState<string | null>(null);
  const [platformBusinessName, setPlatformBusinessName] = useState<string | null>(null);
  const [customConfigured, setCustomConfigured] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  // User phones
  const [userPhones, setUserPhones] = useState<UserPhone[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  // Custom config form state
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Load existing config
  useEffect(() => {
    loadConfig();
    loadUserPhones();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data: ConfigResponse = await res.json();
        setSource(data.source);
        setPlatformAvailable(data.platformAvailable);
        setPlatformDisplayPhone(data.platformDisplayPhone || null);
        setPlatformBusinessName(data.platformBusinessName || null);
        setCustomConfigured(data.customConfigured);
        setWebhookUrl(data.webhookUrl || '');

        if (data.config) {
          setConfig(data.config);
          setPhoneNumberId(data.config.phoneNumberId || '');
          setBusinessAccountId(data.config.businessAccountId || '');
        }
      }
    } catch (error) {
      console.error('Failed to load WhatsApp config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPhones = async () => {
    try {
      const res = await fetch('/api/whatsapp/phones');
      if (res.ok) {
        const data = await res.json();
        setUserPhones(data.phones || []);
      }
    } catch (error) {
      console.error('Failed to load user phones:', error);
    }
  };

  const handleSourceChange = async (newSource: WhatsAppSource) => {
    if (newSource === source) return;

    // Validate before switching
    if (newSource === 'PLATFORM' && !platformAvailable) {
      toast.error('Platform WhatsApp is not available for your organization');
      return;
    }
    if (newSource === 'CUSTOM' && !customConfigured) {
      // Allow switching to CUSTOM to configure - don't block
    }

    setSwitchingSource(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: newSource }),
      });

      if (res.ok) {
        setSource(newSource);
        toast.success(`WhatsApp ${newSource === 'NONE' ? 'disabled' : `switched to ${newSource.toLowerCase()}`}`);
        loadConfig(); // Reload to get updated state
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update WhatsApp source');
      }
    } catch (error) {
      toast.error('Failed to update WhatsApp source');
    } finally {
      setSwitchingSource(false);
    }
  };

  const handleSaveCustomConfig = async () => {
    if (!phoneNumberId || !businessAccountId || !accessToken) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          businessAccountId,
          accessToken,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('WhatsApp configuration saved successfully');
        setConfig(data.config);
        setCustomConfigured(true);
        setSource('CUSTOM');
        setAccessToken(''); // Clear the token input
        loadConfig(); // Reload to get updated state
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPhone = async (userId: string) => {
    try {
      const res = await fetch('/api/whatsapp/phones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast.success('Phone number verified');
        loadUserPhones();
      }
    } catch (error) {
      toast.error('Failed to verify phone');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Integration</h1>
            <p className="text-muted-foreground">
              Configure WhatsApp Business API for approval notifications
            </p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      {source !== 'NONE' && (
        <Alert className="border-green-200 bg-green-50">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            WhatsApp integration is active using {source === 'PLATFORM' ? 'platform' : 'custom'} configuration.
            Approval notifications will be sent via WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Source Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Source</CardTitle>
          <CardDescription>
            Choose how WhatsApp notifications are sent for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={source}
            onValueChange={(value: string) => handleSourceChange(value as WhatsAppSource)}
            disabled={switchingSource}
          >
            {/* Disabled Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="NONE" id="source-none" />
              <div className="flex-1">
                <Label htmlFor="source-none" className="font-medium cursor-pointer">
                  Disable WhatsApp
                </Label>
                <p className="text-sm text-muted-foreground">
                  Turn off WhatsApp notifications completely
                </p>
              </div>
            </div>

            {/* Platform Option */}
            <div className={`flex items-center space-x-3 p-4 border rounded-lg ${
              platformAvailable ? 'hover:bg-muted/50' : 'opacity-60'
            }`}>
              <RadioGroupItem
                value="PLATFORM"
                id="source-platform"
                disabled={!platformAvailable}
              />
              <div className="flex-1">
                <Label htmlFor="source-platform" className="font-medium cursor-pointer flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Use Platform WhatsApp
                  {!platformAvailable && (
                    <Badge variant="secondary" className="text-xs">Not Available</Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {platformAvailable
                    ? `Use Durj platform account${platformDisplayPhone ? ` (${platformDisplayPhone})` : ''}`
                    : 'Your organization does not have access to platform WhatsApp'
                  }
                </p>
              </div>
            </div>

            {/* Custom Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="CUSTOM" id="source-custom" />
              <div className="flex-1">
                <Label htmlFor="source-custom" className="font-medium cursor-pointer">
                  Use Own WhatsApp Business API
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configure your own WhatsApp Business API credentials
                </p>
              </div>
              {customConfigured && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Configured
                </Badge>
              )}
            </div>
          </RadioGroup>

          {switchingSource && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Info (when using platform) */}
      {source === 'PLATFORM' && platformAvailable && (
        <Card>
          <CardHeader>
            <CardTitle>Platform WhatsApp</CardTitle>
            <CardDescription>
              You are using the Durj platform WhatsApp account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">
                    {platformBusinessName || 'Durj Platform'}
                  </p>
                  {platformDisplayPhone && (
                    <p className="text-sm text-green-700">{platformDisplayPhone}</p>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Messages will be sent from the Durj platform WhatsApp Business account.
              You only need to manage user phone numbers below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Custom Configuration Card (when using custom or setting up) */}
      {(source === 'CUSTOM' || (!customConfigured && source !== 'PLATFORM')) && (
        <Card>
          <CardHeader>
            <CardTitle>Custom API Configuration</CardTitle>
            <CardDescription>
              Enter your WhatsApp Business API credentials from Meta Business Manager
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g., 123456789012345"
                />
                <p className="text-xs text-muted-foreground">
                  Found in Meta Business Manager under your phone number settings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID *</Label>
                <Input
                  id="businessAccountId"
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="e.g., 123456789012345"
                />
                <p className="text-xs text-muted-foreground">
                  Your WhatsApp Business Account ID from Meta
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Permanent Access Token *</Label>
              <Input
                id="accessToken"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={customConfigured ? '••••••••••••••••' : 'Enter your access token'}
              />
              <p className="text-xs text-muted-foreground">
                Generate a permanent token in Meta Business Manager (never expires)
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveCustomConfig} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration (for custom only) */}
      {source === 'CUSTOM' && customConfigured && config && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>
              Configure these values in your Meta App settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, 'url')}
                >
                  {copied === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verify Token</Label>
              <div className="flex gap-2">
                <Input
                  value={config?.webhookVerifyToken || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(config?.webhookVerifyToken || '', 'token')}
                >
                  {copied === 'token' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Subscribe to the <code className="bg-muted px-1 rounded">messages</code> webhook field
                to receive button click callbacks.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* User Phone Numbers (when WhatsApp is enabled) */}
      {source !== 'NONE' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                User Phone Numbers
              </CardTitle>
              <CardDescription>
                Manage WhatsApp numbers for receiving notifications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadUserPhones}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {userPhones.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No phone numbers registered yet. Users can add their WhatsApp numbers from their profile.
              </p>
            ) : (
              <div className="space-y-3">
                {userPhones.map((phone) => (
                  <div
                    key={phone.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{phone.user.name}</p>
                        <p className="text-sm text-muted-foreground">{phone.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phone.isVerified ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                            Pending
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyPhone(phone.user.id)}
                          >
                            Verify
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions (only for custom config) */}
      {source === 'CUSTOM' && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Create a Meta Business Account</h4>
              <p className="text-sm text-muted-foreground">
                Go to{' '}
                <a
                  href="https://business.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  business.facebook.com
                </a>{' '}
                and create a business account if you don't have one.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">2. Set up WhatsApp Business API</h4>
              <p className="text-sm text-muted-foreground">
                Create a Meta App and add WhatsApp as a product. Configure your business phone number.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">3. Create Message Templates</h4>
              <p className="text-sm text-muted-foreground">
                Submit the following templates for approval in Meta Business Manager:
              </p>
              <ul className="text-sm text-muted-foreground list-disc ml-6 space-y-1">
                <li><code>leave_approval_request</code> - For leave request notifications</li>
                <li><code>purchase_approval_request</code> - For purchase request notifications</li>
                <li><code>asset_approval_request</code> - For asset request notifications</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">4. Configure Webhook</h4>
              <p className="text-sm text-muted-foreground">
                In your Meta App settings, configure the webhook URL and verify token shown above.
                Subscribe to the <code>messages</code> field.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
