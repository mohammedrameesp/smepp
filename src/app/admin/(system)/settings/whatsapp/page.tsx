/**
 * @module admin/settings/whatsapp/page
 * @description WhatsApp integration settings page for organization administrators.
 * Displays read-only configuration status (Platform, Custom, or Disabled) and
 * manages user phone number verification for WhatsApp notifications. Configuration
 * changes require platform administrator access.
 *
 * @route /admin/settings/whatsapp
 * @access Admin only
 * @dependencies
 * - GET /api/whatsapp/config - Fetches WhatsApp configuration status
 * - GET /api/whatsapp/phones - Lists user phone numbers
 * - PATCH /api/whatsapp/phones - Verifies phone number
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Loader2, Phone, UserCheck, RefreshCw, Building2, ShieldCheck, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

type WhatsAppSource = 'NONE' | 'PLATFORM' | 'CUSTOM';

interface UserPhone {
  id: string;
  phoneNumber: string;
  isVerified: boolean;
  member: {
    id: string;
    name: string;
    email: string;
  };
}

interface ConfigResponse {
  configured: boolean;
  source: WhatsAppSource;
  platformAvailable: boolean;
  platformDisplayPhone?: string;
  platformBusinessName?: string;
  customConfigured: boolean;
}

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Config state (read-only)
  const [source, setSource] = useState<WhatsAppSource>('NONE');
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [platformDisplayPhone, setPlatformDisplayPhone] = useState<string | null>(null);
  const [platformBusinessName, setPlatformBusinessName] = useState<string | null>(null);
  const [customConfigured, setCustomConfigured] = useState(false);

  // User phones
  const [userPhones, setUserPhones] = useState<UserPhone[]>([]);

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

  const handleVerifyPhone = async (memberId: string) => {
    try {
      const res = await fetch('/api/whatsapp/phones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (res.ok) {
        toast.success('Phone number verified');
        loadUserPhones();
      }
    } catch {
      toast.error('Failed to verify phone');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  const isEnabled = source !== 'NONE';
  const sourceLabel = source === 'PLATFORM' ? 'Platform' : source === 'CUSTOM' ? 'Custom API' : 'Disabled';

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className={ICON_SIZES.md} />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageCircle className={`${ICON_SIZES.md} text-green-600`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Integration</h1>
            <p className="text-muted-foreground">
              WhatsApp Business API for approval notifications
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className={`${ICON_SIZES.md} text-green-600`} />
            ) : (
              <ShieldOff className={`${ICON_SIZES.md} text-muted-foreground`} />
            )}
            WhatsApp Status
          </CardTitle>
          <CardDescription>
            WhatsApp configuration is managed by platform administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              {isEnabled ? (
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageCircle className={`${ICON_SIZES.md} text-green-600`} />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <MessageCircle className={`${ICON_SIZES.md} text-muted-foreground`} />
                </div>
              )}
              <div>
                <p className="font-medium">
                  WhatsApp Integration: {sourceLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled
                    ? 'Approval notifications will be sent via WhatsApp'
                    : 'WhatsApp notifications are currently disabled'
                  }
                </p>
              </div>
            </div>
            <Badge variant={isEnabled ? 'default' : 'secondary'} className={isEnabled ? 'bg-green-600' : ''}>
              {isEnabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>

          {/* Platform Info */}
          {source === 'PLATFORM' && platformAvailable && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className={`${ICON_SIZES.md} text-green-600`} />
                <div>
                  <p className="font-medium text-green-800">
                    Using Platform WhatsApp
                  </p>
                  <p className="text-sm text-green-700">
                    {platformBusinessName || 'Durj Platform'}
                    {platformDisplayPhone && ` • ${platformDisplayPhone}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Info */}
          {source === 'CUSTOM' && customConfigured && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageCircle className={`${ICON_SIZES.md} text-blue-600`} />
                <div>
                  <p className="font-medium text-blue-800">
                    Using Custom WhatsApp API
                  </p>
                  <p className="text-sm text-blue-700">
                    Messages sent from your organization&apos;s WhatsApp Business account
                  </p>
                </div>
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              To change WhatsApp configuration, please contact your platform administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* User Phone Numbers (when WhatsApp is enabled) */}
      {isEnabled && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className={ICON_SIZES.md} />
                User Phone Numbers
              </CardTitle>
              <CardDescription>
                Manage WhatsApp numbers for receiving notifications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadUserPhones}>
              <RefreshCw className={`${ICON_SIZES.sm} mr-2`} />
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
                        <Phone className={`${ICON_SIZES.sm} text-muted-foreground`} />
                      </div>
                      <div>
                        <p className="font-medium">{phone.member.name}</p>
                        <p className="text-sm text-muted-foreground">{phone.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {phone.isVerified ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <UserCheck className={`${ICON_SIZES.xs} mr-1`} />
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
                            onClick={() => handleVerifyPhone(phone.member.id)}
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
    </div>
  );
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * WhatsApp integration status page with read-only configuration display and
 * user phone number management. Configuration is controlled at platform level.
 *
 * STRENGTHS:
 * - Clear status visualization (enabled/disabled with badges)
 * - Platform vs Custom source distinction with appropriate styling
 * - User phone list with verification status
 * - Manual verify action for admin oversight
 * - Refresh button for phone list without page reload
 * - Helpful messaging about contacting platform admin for changes
 * - Conditional UI - phone section only shows when WhatsApp is enabled
 *
 * POTENTIAL IMPROVEMENTS:
 * - Add test message functionality to verify configuration
 * - Consider webhook status/health check display
 * - Add notification preferences per user
 * - Consider bulk verification for multiple phones
 * - Add phone number format validation display
 *
 * SECURITY:
 * - Configuration is read-only at org level (platform admin controlled)
 * - Phone verification requires explicit admin action
 * - No sensitive API credentials exposed in UI
 *
 * MISSING:
 * - Does not follow PageHeader/PageContent pattern (uses custom header)
 * - Consider aligning with other settings pages for consistency
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
