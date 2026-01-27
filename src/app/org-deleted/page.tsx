'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

/**
 * Organization Deleted Page
 *
 * This page is shown when a user tries to access an organization that has been deleted.
 * It automatically signs them out and redirects to the login page with an error message.
 */
export default function OrgDeletedPage() {
  useEffect(() => {
    // Auto sign out and redirect to login with error
    signOut({ callbackUrl: '/login?error=OrgDeleted' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Loader2 className={`${ICON_SIZES.xl} animate-spin text-slate-600 mb-4`} />
      <p className="text-slate-600">Signing out...</p>
    </div>
  );
}
