/**
 * @module app/admin/(system)/error
 * @description Client-side error boundary for the system settings route segment.
 * Catches and displays errors that occur within the (system) route group,
 * providing a user-friendly error message and recovery option.
 *
 * @dependencies
 * - SegmentError: Reusable error display component with reset functionality
 *
 * @routes
 * - Catches errors from all /admin/(system)/* routes
 *
 * @props
 * - error: Error object with optional digest for debugging
 * - reset: Function to attempt re-rendering the errored component tree
 *
 * @behavior
 * - Displays error message specific to "System settings" segment
 * - Provides navigation back to /admin dashboard
 * - Exposes reset function for retry attempts
 */

'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function SystemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="System settings" homeUrl="/admin" />;
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Date: 2026-02-01
 * Reviewer: Claude (AI Code Review)
 *
 * Overall Assessment: PASS
 * Simple and effective error boundary implementation.
 *
 * Strengths:
 * 1. Proper 'use client' directive for error boundary
 * 2. Correct Next.js error boundary signature (error + reset)
 * 3. Reuses centralized SegmentError component
 * 4. Provides appropriate homeUrl for navigation recovery
 * 5. Type-safe error object with optional digest
 *
 * Potential Improvements:
 * 1. Could log errors to monitoring service (Sentry, etc.)
 * 2. Consider adding error classification for different messaging
 *
 * Security: No concerns - error details handled by SegmentError
 * Performance: Minimal - simple render component
 * Maintainability: Excellent - follows DRY pattern with shared component
 */
