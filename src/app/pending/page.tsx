/**
 * @module app/pending/page
 * @description Pending organization page for users awaiting invitation.
 *
 * This page serves as a safety net for authenticated users who don't belong
 * to any organization. It is critical for preventing redirect loops.
 *
 * DO NOT REMOVE - Handles important edge cases:
 * - User account exists but was removed from their organization
 * - Invitation flow was partially completed
 * - Database inconsistencies where user has no org membership
 *
 * Features:
 * - Session status checking with automatic redirect when org is assigned
 * - "Check Again" button to refresh session and check for pending invitations
 * - Integration with /api/invitations/pending API
 * - Sign out option to switch accounts
 *
 * Redirected here from:
 * - middleware.ts: When authenticated users without org access protected routes
 * - login/page.tsx: After login if user has no organization
 * - signup/page.tsx: After signup if invitation flow wasn't completed
 * - setup wizard: "Skip" button for users who want to wait for invitation
 *
 * With signup-by-invitation-only flow, this page is rarely reached but serves
 * as a safety net to prevent redirect loops and provide clear user guidance.
 *
 * @see {@link module:middleware} - Access control middleware
 * @see {@link module:app/api/invitations/pending} - Pending invitations API
 */
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import Link from 'next/link';

export default function PendingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.organizationId) {
      // User now has an org - redirect
      router.push('/');
    }
  }, [status, session, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      // Refresh the session to get latest org membership
      const updatedSession = await update();

      // Check if user now has an organization
      if (updatedSession?.user?.organizationId) {
        // User has been added to an org - redirect via home to let middleware route properly
        window.location.href = '/';
        return;
      }

      // Also check for pending invitations via API
      const response = await fetch('/api/invitations/pending');
      if (response.ok) {
        const data = await response.json();
        if (data.invitations?.length > 0) {
          // User has pending invitations - redirect to the first one
          router.push(`/invite/${data.invitations[0].token}`);
          return;
        }
      }

      // No org and no pending invitations - just show a message
      // The button will return to normal state
    } finally {
      setChecking(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Mobile Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <img src="/sme-icon-shield-512.png" alt="Durj" className="h-10 w-10" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">Durj</span>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className={`${ICON_SIZES.xl} text-amber-600 dark:text-amber-400`} />
              </div>
            </div>
            <CardTitle className="text-2xl">Waiting for Invitation</CardTitle>
            <CardDescription>
              Your account is ready, but you haven&apos;t been added to an organization yet.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className={`${ICON_SIZES.sm} text-muted-foreground`} />
                <span className="text-muted-foreground">Signed in as:</span>
              </div>
              <p className="font-medium">{session?.user?.email}</p>
            </div>

            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>
                Please contact your organization administrator to send you an invitation.
              </p>
              <p>
                Once you receive an invitation email, click the link to join your organization.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full h-12"
              >
                {checking ? (
                  <>
                    <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className={`${ICON_SIZES.sm} mr-2`} />
                    Check Again
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => signOut({ callbackUrl: '/login?signedOut=true' })}
                className="w-full text-muted-foreground"
              >
                <LogOut className={`${ICON_SIZES.sm} mr-2`} />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Safety net page for authenticated users who don't belong to any organization,
 * preventing redirect loops and guiding users to wait for invitation.
 *
 * Key Features:
 * - Automatic redirect to login if unauthenticated
 * - Automatic redirect to home if user gains organization membership
 * - "Check Again" button that:
 *   - Refreshes session to check for new org membership
 *   - Calls /api/invitations/pending to find pending invitations
 *   - Redirects to invitation page if found
 * - Sign out option with signedOut query param
 * - Dark mode support
 * - Durj branding/logo display
 *
 * Edge Cases Handled:
 * - User removed from organization
 * - Partially completed invitation flow
 * - Database inconsistencies (no org membership)
 * - Signup-by-invitation flow users waiting for invite
 *
 * IMPORTANT: DO NOT REMOVE - Critical for preventing redirect loops
 *
 * UX Considerations:
 * - Clear messaging about waiting state
 * - Proactive invitation checking
 * - Multiple ways to resolve (check again, sign out)
 *
 * Potential Improvements:
 * - Add polling interval for automatic status checks
 * - Show list of pending invitations if multiple exist
 * - Add notification when invitation arrives (WebSocket/SSE)
 *
 * Dependencies:
 * - next-auth/react: useSession, signOut, update
 * - next/navigation: useRouter
 * - @/components/ui/button, card: UI components
 * - lucide-react: Clock, Mail, LogOut, Loader2, RefreshCw icons
 * - @/lib/constants: ICON_SIZES
 */
