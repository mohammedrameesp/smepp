/**
 * @module app/invite/[token]/page
 * @description Organization invitation acceptance page.
 *
 * This page handles the flow when a user clicks an invitation link to join
 * an organization. It validates the invitation token, displays invitation
 * details, and processes the acceptance.
 *
 * Key features:
 * - Fetches and displays invitation details (org name, role, expiry)
 * - Tenant branding via useTenantBranding hook
 * - Handles both new users (redirect to signup) and existing users (accept directly)
 * - Email mismatch detection (warns if signed in with different email)
 * - Expiry warning for invitations expiring within 24 hours
 * - Session update after acceptance to include new organization
 * - Redirects to org subdomain admin portal after successful join
 *
 * User flows:
 * 1. Not logged in: Shows "Create Account & Join" button -> redirects to /signup
 * 2. Logged in (matching email): Shows "Accept Invitation" button -> joins org
 * 3. Logged in (different email): Shows warning, accept button disabled
 *
 * @dependencies
 * - next-auth/react: useSession for auth state, signIn for login redirect
 * - useTenantBranding: Fetch org branding from invitation
 * - formatDate: Date formatting utility
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Check, X, Mail, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { ICON_SIZES } from '@/lib/constants';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { formatDate } from '@/lib/core/datetime';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

interface InvitationData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isEmployee: boolean | null;
  isOnWps: boolean | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  expiresAt: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session, status, update } = useSession();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get tenant branding based on invitation org slug
  const orgSlug = invitation?.organization?.slug || null;
  const { branding, isLoading: brandingLoading } = useTenantBranding(orgSlug);

  // Dynamic colors based on branding
  const primaryColor = branding?.primaryColor || '#0f172a';
  const orgName = branding?.organizationName || invitation?.organization?.name || 'Durj';
  const logoUrl = branding?.logoUrl || invitation?.organization?.logoUrl;

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invitation');
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error('Fetch invitation error:', err);
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Handle accept invitation
  const handleAccept = async () => {
    if (!session?.user) {
      // Redirect to login with callback to this page
      signIn(undefined, { callbackUrl: `/invite/${token}` });
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      // Employee status is set by admin in invitation - no user confirmation needed
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);

      // Update the session with the new organization ID
      // This refreshes the JWT token with organization info
      if (data.organization?.id) {
        await update({ organizationId: data.organization.id });
      }

      // Redirect to the organization's subdomain - admin portal (middleware handles role-based access)
      setTimeout(() => {
        const orgSlug = data.organization?.slug;
        if (orgSlug) {
          // Redirect to admin - middleware will redirect to /employee if user lacks admin access
          window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
        } else {
          // Fallback - just go to home which will redirect properly
          window.location.href = APP_URL;
        }
      }, 1500);
    } catch (err) {
      console.error('Accept invitation error:', err);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  // Mobile logo header component
  const MobileLogo = () => (
    <div className="text-center mb-6">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={orgName}
          className="h-12 w-auto mx-auto"
        />
      ) : (
        <div className="flex items-center justify-center gap-2">
          <img src="/sme-icon-shield-512.png" alt="Durj" className="h-10 w-10" />
          <span className="text-2xl font-bold text-slate-900 dark:text-white">Durj</span>
        </div>
      )}
    </div>
  );

  // Loading state
  if (loading || status === 'loading' || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <MobileLogo />
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className={`${ICON_SIZES.xl} text-red-600 dark:text-red-400`} />
                </div>
              </div>
              <CardTitle className="text-xl">Invalid Invitation</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/login">
                <Button variant="outline" className="w-full">Go to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <MobileLogo />
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className={`${ICON_SIZES.xl} text-green-600 dark:text-green-400`} />
                </div>
              </div>
              <CardTitle className="text-xl">Welcome to {orgName}!</CardTitle>
              <CardDescription>
                You&apos;ve successfully joined the organization
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Redirecting to your dashboard...
              </p>
              <Loader2 className={`${ICON_SIZES.md} animate-spin mx-auto`} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main invitation view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={orgName}
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 className={`${ICON_SIZES.xl} text-white`} />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
            <CardDescription>
              Join <span className="font-semibold text-foreground">{orgName}</span> on Durj
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invitation details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className={`${ICON_SIZES.sm} text-muted-foreground`} />
                <div>
                  <p className="text-xs text-muted-foreground">Invitation sent to</p>
                  <p className="font-medium">{invitation?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className={`${ICON_SIZES.sm} text-muted-foreground`} />
                <div>
                  <p className="text-xs text-muted-foreground">Your role</p>
                  <p className="font-medium capitalize">{invitation?.role.toLowerCase()}</p>
                </div>
              </div>
            </div>

            {/* Error alert */}
            {error && (
              <Alert variant="error">
                <AlertCircle className={ICON_SIZES.sm} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Expiry warning if less than 24 hours */}
            {invitation?.expiresAt && (() => {
              const hoursLeft = (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
              if (hoursLeft > 0 && hoursLeft < 24) {
                return (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
                    <Clock className={ICON_SIZES.sm} />
                    <AlertDescription>
                      This invitation expires in {Math.ceil(hoursLeft)} hour{Math.ceil(hoursLeft) !== 1 ? 's' : ''}. Accept it soon!
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

            {/* Email mismatch warning */}
            {session?.user?.email && invitation?.email &&
              session.user.email.toLowerCase() !== invitation.email.toLowerCase() && (
                <Alert variant="error">
                  <AlertCircle className={ICON_SIZES.sm} />
                  <AlertDescription>
                    You&apos;re signed in as <strong>{session.user.email}</strong>, but this invitation was sent to{' '}
                    <strong>{invitation.email}</strong>. Please sign out and sign in with the correct email.
                  </AlertDescription>
                </Alert>
              )}

            {/* Action buttons */}
            <div className="space-y-3">
              {!session?.user ? (
                <>
                  <Button
                    className="w-full h-12 text-white"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => {
                      // Redirect to signup with pre-filled email and name
                      const params = new URLSearchParams({
                        email: invitation?.email || '',
                        invite: token,
                      });
                      if (invitation?.name) {
                        params.set('name', invitation.name);
                      }
                      router.push(`/signup?${params.toString()}`);
                    }}
                    disabled={accepting}
                  >
                    Create Account & Join
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      href={`/login?callbackUrl=/invite/${token}`}
                      className="font-medium hover:underline"
                      style={{ color: primaryColor }}
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              ) : (
                <Button
                  className="w-full h-12 text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleAccept}
                  disabled={accepting || (session.user.email?.toLowerCase() !== invitation?.email.toLowerCase())}
                >
                  {accepting ? (
                    <>
                      <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Check className={`mr-2 ${ICON_SIZES.sm}`} />
                      Accept Invitation
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full"
                asChild
              >
                <Link href="/">
                  Decline
                </Link>
              </Button>
            </div>

            {/* Expiry notice */}
            {invitation?.expiresAt && (
              <p className="text-xs text-center text-muted-foreground">
                This invitation expires on{' '}
                {formatDate(invitation.expiresAt)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * WHAT THIS FILE DOES:
 * Handles the complete invitation acceptance flow - from viewing invitation
 * details to joining the organization. Supports both new and existing users.
 *
 * KEY FLOWS:
 * 1. Unauthenticated user: Shows org details, "Create Account" redirects to signup
 * 2. Authenticated (matching email): Shows "Accept Invitation" to join directly
 * 3. Authenticated (wrong email): Shows warning, accept button disabled
 *
 * POTENTIAL ISSUES:
 * 1. [MEDIUM] APP_URL and APP_DOMAIN defined at module level - could fail if
 *    env vars not available at build time
 * 2. [LOW] 1.5 second delay before redirect after acceptance is arbitrary
 * 3. [LOW] MobileLogo component defined inside the component - could be extracted
 *
 * SECURITY CONSIDERATIONS:
 * - Email mismatch check prevents accepting invitation for different user
 * - Session updated with new organizationId after acceptance
 * - Token validated server-side before showing details
 *
 * PERFORMANCE:
 * - Invitation details fetched once on mount
 * - Session update triggers token refresh
 * - Branding loaded based on invitation org slug
 *
 * ACCESSIBILITY:
 * - Expiry warning for soon-expiring invitations (< 24 hours)
 * - Clear role and email display
 * - Disabled state for mismatched email
 *
 * LAST REVIEWED: 2025-01-27
 * REVIEWED BY: Code Review System
 * =========================================================================== */
