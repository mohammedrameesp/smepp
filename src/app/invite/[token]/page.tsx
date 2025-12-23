'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Check, X, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  expiresAt: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session, status } = useSession();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);

      // Redirect to admin after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Accept invitation error:', err);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Welcome to {invitation?.organization.name}!</CardTitle>
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
    );
  }

  // Main invitation view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join <span className="font-semibold text-foreground">{invitation?.organization.name}</span> on SME++
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

          {/* Email mismatch warning */}
          {session?.user?.email && invitation?.email &&
            session.user.email.toLowerCase() !== invitation.email.toLowerCase() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You&apos;re signed in as <strong>{session.user.email}</strong>, but this invitation was sent to{' '}
                  <strong>{invitation.email}</strong>. Please sign in with the correct account.
                </AlertDescription>
              </Alert>
            )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!session?.user ? (
              <>
                <Button
                  className="w-full"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    'Sign in to Accept'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link href={`/signup?email=${encodeURIComponent(invitation?.email || '')}&invite=${token}`} className="text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </>
            ) : (
              <Button
                className="w-full"
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
  );
}
