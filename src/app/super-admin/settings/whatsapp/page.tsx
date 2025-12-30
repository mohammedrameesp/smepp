'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Building2,
} from 'lucide-react';

interface PlatformConfig {
  configured: boolean;
  config?: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber?: string;
    businessName?: string;
    isActive: boolean;
    webhookVerifyToken: string;
  };
  webhookUrl: string;
}

interface PlatformStats {
  platform: {
    totalMessagesSent: number;
    totalDelivered: number;
    totalFailed: number;
    platformMessages: number;
    customMessages: number;
    tenantsUsingNone: number;
    tenantsUsingPlatform: number;
    tenantsUsingCustom: number;
  };
  topTenants: Array<{
    organizationId: string;
    organizationName: string;
    messageCount: number;
    source: string;
  }>;
}

export default function WhatsAppSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Redirect if not super admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/super-admin/login');
    } else if (status === 'authenticated' && !session?.user?.isSuperAdmin) {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch config and stats
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isSuperAdmin) {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/super-admin/whatsapp/config'),
        fetch('/api/super-admin/whatsapp/stats'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        if (configData.config) {
          setPhoneNumberId(configData.config.phoneNumberId || '');
          setBusinessAccountId(configData.config.businessAccountId || '');
          setDisplayPhoneNumber(configData.config.displayPhoneNumber || '');
          setBusinessName(configData.config.businessName || '');
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch {
      setError('Failed to load WhatsApp configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!phoneNumberId || !businessAccountId || !accessToken) {
      setError('Phone Number ID, Business Account ID, and Access Token are required');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/super-admin/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          businessAccountId,
          accessToken,
          displayPhoneNumber: displayPhoneNumber || undefined,
          businessName: businessName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save configuration');
        return;
      }

      setSuccess('Configuration saved successfully');
      setAccessToken(''); // Clear token after save
      setConfig(data);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/super-admin/whatsapp/config', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to disable WhatsApp');
        return;
      }

      setSuccess('Platform WhatsApp disabled');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to disable WhatsApp');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session?.user?.isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">WhatsApp Integration</h2>
        <p className="text-slate-500">
          Configure platform-wide WhatsApp Business API for approval notifications
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  config?.configured && config?.config?.isActive
                    ? 'bg-green-100'
                    : 'bg-slate-100'
                }`}
              >
                <MessageCircle
                  className={`w-5 h-5 ${
                    config?.configured && config?.config?.isActive
                      ? 'text-green-600'
                      : 'text-slate-500'
                  }`}
                />
              </div>
              <div>
                <CardTitle>Platform WhatsApp Configuration</CardTitle>
                <CardDescription>
                  Organizations can use this configuration for WhatsApp notifications
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config?.configured && config?.config?.isActive ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              ) : config?.configured ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  Disabled
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  Not Configured
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
              <Input
                id="phoneNumberId"
                placeholder="Meta Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAccountId">Business Account ID *</Label>
              <Input
                id="businessAccountId"
                placeholder="WhatsApp Business Account ID"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token *</Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showToken ? 'text' : 'password'}
                placeholder={config?.configured ? '••••••••••••••••' : 'Enter permanent access token'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={isSaving}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {config?.configured ? 'Leave blank to keep existing token' : 'Enter your permanent access token from Meta'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayPhoneNumber">Display Phone Number</Label>
              <Input
                id="displayPhoneNumber"
                placeholder="+974 XXXX XXXX"
                value={displayPhoneNumber}
                onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Human-readable phone number for display</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Durj Platform"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Name shown in notifications</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
            {config?.configured && config?.config?.isActive && (
              <Button variant="outline" onClick={handleDisable} disabled={isSaving}>
                Disable WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      {config?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Webhook Configuration</CardTitle>
            <CardDescription>
              Configure these in your Meta Developer Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input value={config.webhookUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(config.webhookUrl, 'webhookUrl')}
                >
                  {copiedField === 'webhookUrl' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verify Token</Label>
              <div className="flex gap-2">
                <Input
                  value={config.config?.webhookVerifyToken || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(config.config?.webhookVerifyToken || '', 'verifyToken')
                  }
                >
                  {copiedField === 'verifyToken' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Usage Statistics</CardTitle>
                <CardDescription>Platform-wide WhatsApp usage this month</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Messages Sent</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.platform.totalMessagesSent.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Delivered</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.platform.totalDelivered.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-900">
                  {stats.platform.totalFailed.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Organizations</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.platform.tenantsUsingPlatform + stats.platform.tenantsUsingCustom}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Using Platform WhatsApp</p>
                <p className="text-xl font-semibold">{stats.platform.tenantsUsingPlatform}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Using Custom WhatsApp</p>
                <p className="text-xl font-semibold">{stats.platform.tenantsUsingCustom}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">WhatsApp Disabled</p>
                <p className="text-xl font-semibold">{stats.platform.tenantsUsingNone}</p>
              </div>
            </div>

            {stats.topTenants.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Top Organizations by Messages
                </h4>
                <div className="space-y-2">
                  {stats.topTenants.slice(0, 5).map((tenant, index) => (
                    <div
                      key={`${tenant.organizationId}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.organizationName}</p>
                          <p className="text-xs text-muted-foreground">
                            via {tenant.source === 'PLATFORM' ? 'Platform' : 'Custom'} config
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {tenant.messageCount.toLocaleString()} messages
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
