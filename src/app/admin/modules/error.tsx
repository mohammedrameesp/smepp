/**
 * @module ModulesError
 * @description Error boundary for the modules page.
 * Displays a user-friendly error message with retry option.
 */

'use client';

import { SegmentError } from '@/components/ui/segment-error';

/**
 * Error boundary component for the Modules page.
 * @param props.error - The error that was thrown
 * @param props.reset - Function to reset the error boundary and retry
 * @returns Error UI with retry button
 */
export default function ModulesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return <SegmentError error={error} reset={reset} segment="Modules" homeUrl="/admin" />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation
 *   - Added explicit return type annotation
 * Issues: None
 */
