'use client';

import { useState } from 'react';
import { UserCog, Loader2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ICON_SIZES } from '@/lib/constants';

interface ImpersonateButtonProps {
  organizationId: string;
  organizationName: string;
}

export function ImpersonateButton({ organizationId, organizationName }: ImpersonateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showReauthDialog, setShowReauthDialog] = useState(false);
  const [reauthCode, setReauthCode] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [isReauthing, setIsReauthing] = useState(false);

  const handleImpersonate = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if 2FA re-auth is required
        if (data.error === 'Recent2FARequired' && data.requiresReAuth) {
          setShowReauthDialog(true);
          return;
        }
        throw new Error(data.error || 'Failed to impersonate');
      }

      // Redirect to the organization portal
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to impersonate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauth = async () => {
    if (!reauthCode) return;

    setIsReauthing(true);
    setReauthError('');

    try {
      const response = await fetch('/api/super-admin/auth/reauth-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: reauthCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReauthError(data.error || 'Verification failed');
        return;
      }

      // 2FA verified - close dialog and retry impersonation
      setShowReauthDialog(false);
      setReauthCode('');
      handleImpersonate();
    } catch {
      setReauthError('Verification failed');
    } finally {
      setIsReauthing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleImpersonate}
        disabled={isLoading}
        className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded disabled:opacity-50"
        title="Impersonate"
      >
        {isLoading ? (
          <Loader2 className={`${ICON_SIZES.sm} animate-spin`} />
        ) : (
          <UserCog className={ICON_SIZES.sm} />
        )}
      </button>

      {/* 2FA Re-authentication Dialog */}
      <Dialog open={showReauthDialog} onOpenChange={setShowReauthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className={`${ICON_SIZES.md} text-amber-500`} />
              2FA Verification Required
            </DialogTitle>
            <DialogDescription>
              Enter your authenticator code to impersonate <strong>{organizationName}</strong>.
              This is required for security before accessing tenant data.
            </DialogDescription>
          </DialogHeader>

          {reauthError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {reauthError}
            </div>
          )}

          <div>
            <Label htmlFor="reauth-code">Verification Code</Label>
            <Input
              id="reauth-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={reauthCode}
              onChange={(e) => setReauthCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reauthCode.length === 6) {
                  handleReauth();
                }
              }}
              className="mt-1 text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              Or enter a backup code if you don&apos;t have access to your authenticator app.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReauthDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReauth}
              disabled={reauthCode.length < 6 || isReauthing}
            >
              {isReauthing ? (
                <Loader2 className={`${ICON_SIZES.sm} animate-spin`} />
              ) : (
                'Verify & Continue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
