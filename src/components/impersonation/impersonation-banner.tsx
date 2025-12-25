'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X, ExternalLink, Loader2 } from 'lucide-react';

interface ImpersonationInfo {
  isImpersonating: boolean;
  superAdmin?: {
    id: string;
    email: string;
    name: string | null;
  };
  organization?: {
    id: string;
    slug: string;
    name: string;
  };
  startedAt?: string;
  expiresAt?: string;
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

/**
 * ImpersonationBanner
 *
 * Shows a prominent banner when a super admin is impersonating a client's portal.
 * Provides context about who is impersonating and allows exiting impersonation.
 */
export function ImpersonationBanner() {
  const router = useRouter();
  const [info, setInfo] = useState<ImpersonationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Check impersonation status on mount
    fetch('/api/impersonate/verify')
      .then((res) => res.json())
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setInfo({ isImpersonating: false });
        setLoading(false);
      });
  }, []);

  const handleExitImpersonation = async () => {
    setExiting(true);
    try {
      await fetch('/api/impersonate/verify', { method: 'DELETE' });

      // Redirect back to super admin dashboard
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${APP_DOMAIN}/super-admin`;
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
      setExiting(false);
    }
  };

  const handleBackToOrg = () => {
    if (info?.organization) {
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${APP_DOMAIN}/super-admin/organizations/${info.organization.id}`;
    }
  };

  // Don't show anything if not impersonating or still loading
  if (loading || !info?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5" />
            <div className="text-sm">
              <span className="font-semibold">Impersonation Mode:</span>
              {' '}Viewing{' '}
              <span className="font-bold">{info.organization?.name}</span>
              {' '}as super admin{' '}
              <span className="opacity-80">({info.superAdmin?.email})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOrg}
              className="text-white hover:bg-white/20 text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Org Details
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExitImpersonation}
              disabled={exiting}
              className="bg-white text-orange-600 hover:bg-orange-100 text-xs font-semibold"
            >
              {exiting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Exiting...
                </>
              ) : (
                <>
                  <X className="h-3 w-3 mr-1" />
                  Exit Impersonation
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
