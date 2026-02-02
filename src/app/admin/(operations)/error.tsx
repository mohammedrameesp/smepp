/**
 * @module app/admin/(operations)/error
 * @description Error boundary for the Operations route group. Catches and displays
 * errors that occur within operations-related pages (assets, suppliers, subscriptions).
 */

'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function OperationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="Operations module" homeUrl="/admin" />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Provides error boundary handling for the entire operations route group.
 * When any unhandled error occurs in operations pages, this component displays
 * a user-friendly error message with the option to retry or navigate home.
 *
 * Key Features:
 * - Uses shared SegmentError component for consistent error UI
 * - Supports error retry via reset function
 * - Provides navigation back to admin dashboard
 * - Includes error digest for debugging in production
 *
 * Code Quality: Excellent
 * - Follows Next.js App Router error boundary conventions
 * - Uses 'use client' directive as required for error boundaries
 * - Properly typed error prop with digest support
 * - Delegates UI rendering to shared component
 *
 * Potential Improvements:
 * - Consider adding error logging/reporting to external service
 * - Could display different messages based on error type
 */
