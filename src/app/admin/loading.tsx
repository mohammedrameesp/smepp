/**
 * @module AdminLoading
 * @description Loading state for the admin dashboard page.
 * Displayed automatically by Next.js during page transitions and data fetching.
 */

import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

/**
 * Loading component for the admin dashboard.
 * @returns Dashboard skeleton placeholder while content loads
 */
export default function AdminLoading(): React.ReactElement {
  return <DashboardSkeleton />;
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
