'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, LogOut, Loader2, RefreshCw } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Waiting for Invitation</CardTitle>
          <CardDescription>
            Your account is ready, but you haven&apos;t been added to an organization yet.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
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
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
