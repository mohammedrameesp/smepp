'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Check, X, Mail, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

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

      // Redirect to the organization's subdomain - setup wizard for first-time users
      setTimeout(() => {
        const orgSlug = data.organization?.slug;
        if (orgSlug) {
          // Redirect to setup wizard for first-time organization setup
          window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/setup`;
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                  <X className="h-8 w-8 text-red-600 dark:text-red-400" />
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
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
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
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
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
                  <Building2 className="h-8 w-8 text-white" />
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
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Invitation sent to</p>
                  <p className="font-medium">{invitation?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Your role</p>
                  <p className="font-medium capitalize">{invitation?.role.toLowerCase()}</p>
                </div>
              </div>
            </div>

            {/* Error alert */}
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Expiry warning if less than 24 hours */}
            {invitation?.expiresAt && (() => {
              const hoursLeft = (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
              if (hoursLeft > 0 && hoursLeft < 24) {
                return (
                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
                    <Clock className="h-4 w-4" />
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
                  <AlertCircle className="h-4 w-4" />
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
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
                {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
