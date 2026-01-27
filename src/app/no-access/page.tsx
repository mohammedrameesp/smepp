'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

/**
 * No Access Page
 *
 * This page is shown when a user (typically a misconfigured service account)
 * doesn't have access to either the admin or employee portal.
 */
export default function NoAccessPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className={`${ICON_SIZES.lg} text-red-600`} />
          </div>
          <CardTitle>Access Not Configured</CardTitle>
          <CardDescription>
            Your account doesn&apos;t have access to any portal
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p className="mb-4">
            Your account ({session?.user?.email}) is set up as a service account but doesn&apos;t have
            administrator privileges. This may be a configuration error.
          </p>
          <p>
            Please contact your organization administrator to grant you the appropriate access.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = `mailto:support@durj.com?subject=Access%20Issue&body=User%20email:%20${session?.user?.email}`}
          >
            <Mail className={`mr-2 ${ICON_SIZES.sm}`} />
            Contact Support
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className={`mr-2 ${ICON_SIZES.sm}`} />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
