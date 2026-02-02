/**
 * @module app/org-deleted/page
 * @description Organization deleted redirect page.
 *
 * This page handles the case when a user attempts to access an organization
 * that has been deleted (soft-deleted or permanently removed). It:
 * - Automatically signs out the user
 * - Redirects to login with OrgDeleted error parameter
 * - Displays a loading spinner during the sign-out process
 *
 * The login page should display an appropriate error message when it
 * receives the ?error=OrgDeleted query parameter.
 *
 * Redirected here from:
 * - middleware.ts: When organization lookup fails (deleted org)
 * - API routes: When tenant context cannot be established
 *
 * @see {@link module:middleware} - Access control middleware
 * @see {@link module:app/(auth)/login/page} - Login page error handling
 */
'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Transition page for users whose organization has been deleted,
 * automatically signing them out and redirecting to login with error.
 *
 * Key Features:
 * - Automatic signOut on mount with OrgDeleted error parameter
 * - Simple loading spinner during sign-out process
 * - Redirect to login page with error context
 * - Minimal UI (just spinner and "Signing out..." text)
 *
 * Flow:
 * 1. User tries to access deleted organization
 * 2. Middleware redirects to /org-deleted
 * 3. Page auto-signs out user
 * 4. User lands on /login?error=OrgDeleted
 * 5. Login page displays appropriate error message
 *
 * UX Considerations:
 * - Automatic action - no user interaction required
 * - Brief transition state shown during sign-out
 * - Error context preserved in URL for login page
 *
 * Security Considerations:
 * - Forces sign-out to clear stale session data
 * - Prevents access to orphaned organization data
 * 
 * Dependencies:
 * - next-auth/react: signOut
 * - lucide-react: Loader2 icon
 * - @/lib/constants: ICON_SIZES
 */
