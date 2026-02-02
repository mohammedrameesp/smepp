/**
 * @module app/admin/(projects)/error
 * @description Error boundary for the Projects route group. Catches and displays
 * errors that occur within project-related pages (spend requests, project management).
 */

'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="Projects module" homeUrl="/admin" />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Provides error boundary handling for the entire projects route group.
 * When any unhandled error occurs in project pages, this component displays
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
