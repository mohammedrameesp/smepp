/**
 * @module app/employee/(projects)
 * @description Error boundary for the Employee Projects section.
 *
 * Catches and displays errors that occur within project-related pages
 * (spend requests) in the employee portal.
 * Uses the shared SegmentError component for consistent error display.
 *
 * Features:
 * - Displays user-friendly error message
 * - Shows error digest for debugging
 * - Provides reset button to retry
 * - Links back to employee dashboard
 */
'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function EmployeeProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="Projects section" homeUrl="/employee" />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - simple error boundary using shared component
 */
