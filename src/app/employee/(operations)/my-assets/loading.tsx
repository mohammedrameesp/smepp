/**
 * @module app/employee/(operations)/my-assets
 * @description Loading skeleton for the employee's asset holdings page.
 *
 * Uses the standard PageDetailSkeleton component for consistent loading state.
 * Shows while fetching the employee's assigned assets and subscriptions.
 */
import { PageDetailSkeleton } from '@/components/ui/table-skeleton';

export default function MyHoldingsLoading() {
  return <PageDetailSkeleton />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - uses shared skeleton component
 */
