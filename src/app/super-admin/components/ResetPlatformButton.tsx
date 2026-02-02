/**
 * @module super-admin/components/ResetPlatformButton
 * @description Dangerous platform reset button for super admin testing purposes.
 * Provides a confirmation dialog requiring explicit "DELETE ALL" text input
 * before permanently deleting all organizations, users (except super admins),
 * and associated data from the platform.
 *
 * @example
 * ```tsx
 * <ResetPlatformButton />
 * ```
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export function ResetPlatformButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const router = useRouter();

  const handleReset = async () => {
    if (confirmText !== 'DELETE ALL') return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/super-admin/reset-platform', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset platform');
      }

      setResult({ success: true, message: 'Platform reset complete!' });

      // Refresh the page after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 2000);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
          Reset Platform (Testing)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className={ICON_SIZES.md} />
            Reset Entire Platform
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This will <strong className="text-red-600">permanently delete ALL data</strong> including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>All organizations</li>
                <li>All users (except super admins)</li>
                <li>All assets, subscriptions, suppliers</li>
                <li>All HR data, leave, payroll</li>
                <li>All activity logs and settings</li>
              </ul>
              <p className="text-sm font-medium">
                Type <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">DELETE ALL</span> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE ALL"
                className="font-mono"
                disabled={isLoading}
              />
              {result && (
                <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.message}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={confirmText !== 'DELETE ALL' || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
                Delete Everything
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Provides a destructive platform reset capability for super admin testing/development.
 * Implements a multi-step confirmation flow requiring explicit "DELETE ALL" text entry
 * to prevent accidental data destruction.
 *
 * Key Components:
 * - ResetPlatformButton: Self-contained button with AlertDialog confirmation modal
 * - Confirmation input field with exact text matching
 * - Loading state and result feedback display
 *
 * Data Flow:
 * - User clicks button -> Opens AlertDialog
 * - User types "DELETE ALL" -> Enables submit button
 * - POST request to /api/super-admin/reset-platform
 * - Success: Shows message, auto-closes after 2s, refreshes page
 * - Error: Displays error message in dialog
 *
 * Potential Issues:
 * - PRODUCTION RISK: Should be disabled or removed in production environments
 * - No environment check to prevent accidental production use
 * - No audit logging of reset attempts visible in this component
 * - Single confirmation step - could add additional verification for extra safety
 *
 * Security Considerations:
 * - CRITICAL: This is an extremely dangerous operation - deletes all tenant data
 * - Relies on super admin authentication at API route level
 * - Text confirmation provides some protection against accidental clicks
 * - Consider adding TOTP/2FA re-verification for this specific action
 * - Should log all reset attempts with actor identity
 *
 * Recommendations:
 * - Add environment variable check to completely disable in production
 * - Add re-authentication requirement before reset
 * - Consider rate limiting reset attempts
 * - Add explicit warning banner when NODE_ENV !== 'development'
 */
