/**
 * @module app/admin/(hr)/error
 * @description Error boundary component for the HR module route group.
 * Catches runtime errors in any HR page and displays a user-friendly
 * error message with recovery options.
 *
 * @see {@link @/components/ui/segment-error} for error display component
 */
'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function HRError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="HR module" homeUrl="/admin" />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Provides error handling for all routes under /admin/(hr)/*
 *
 * Strengths:
 * - Uses standardized SegmentError component for consistent error UX
 * - Properly typed error prop with digest for error tracking
 * - Reset function enables error recovery without full page reload
 * - Correct homeUrl pointing to admin dashboard
 *
 * Weaknesses: None identified
 *
 * Security: N/A - Pure UI component with no sensitive data exposure
 *
 * Recommendations:
 * - Consider adding error logging/reporting integration
 * - Error digest could be displayed for support purposes
 */
