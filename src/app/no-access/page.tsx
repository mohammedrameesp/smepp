/**
 * @module app/no-access/page
 * @description No Access page for users without portal access.
 *
 * This page is displayed when a user is authenticated but has no access to
 * either the admin or employee portal. This typically occurs with:
 * - Misconfigured service accounts
 * - Users with isServiceAccount=true but lacking admin privileges
 * - Database inconsistencies in user role assignments
 *
 * The page provides:
 * - Clear explanation of the access issue
 * - Contact support option (via email link)
 * - Sign out button to switch accounts
 *
 * Redirected here from:
 * - middleware.ts: When service account users lack proper access
 *
 * @see {@link module:middleware} - Access control middleware
 */
'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Page displayed when authenticated users have no access to any portal,
 * typically due to misconfigured service accounts.
 *
 * Key Features:
 * - Clear explanation of the access configuration issue
 * - Displays user's email for context
 * - Contact support button with pre-filled email mailto link
 * - Sign out button to switch to different account
 * - Uses shadcn/ui Card components for consistent styling
 *
 * Target Users:
 * - Service accounts without admin privileges
 * - Users with broken/incomplete role assignments
 * - Edge cases from database inconsistencies
 *
 * UX Considerations:
 * - Non-alarming messaging (configuration error, not rejection)
 * - Actionable next steps (contact admin or support)
 * - Easy account switching via sign out
 *
 * Security Considerations:
 * - User email is exposed in mailto link (acceptable for support)
 * - No sensitive data displayed
 *
 * Potential Improvements:
 * - Add in-app support ticket creation
 * - Add link to organization admin contact if available
 * - Track occurrences for identifying configuration issues
 *
 * Dependencies:
 * - next-auth/react: signOut, useSession
 * - @/components/ui/button, card: UI components
 * - lucide-react: ShieldX, LogOut, Mail icons
 * - @/lib/constants: ICON_SIZES
 */
