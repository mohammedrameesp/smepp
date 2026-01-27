'use client';

import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ICON_SIZES } from '@/lib/constants';

interface TwoFactorBannerProps {
  /** Whether the banner can be dismissed (default: false for enforcement) */
  dismissible?: boolean;
}

/**
 * Banner displayed to super admins who haven't enabled 2FA.
 * Shows a prominent warning encouraging them to enable two-factor authentication.
 */
export function TwoFactorBanner({ dismissible = false }: TwoFactorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white">
      <div className="px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <ShieldAlert className={ICON_SIZES.sm} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Two-Factor Authentication Required
              </p>
              <p className="text-xs text-white/80 hidden sm:block">
                Secure your super admin account by enabling 2FA. This is required for all administrator accounts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/super-admin/settings/security"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-amber-600 text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
            >
              Enable 2FA
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className={ICON_SIZES.sm} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
