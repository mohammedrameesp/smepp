/**
 * @module app/employee/(operations)/assets/[id]
 * @description Loading skeleton for the employee asset detail page.
 *
 * Uses the standard PageDetailSkeleton component for consistent loading state.
 */
import { PageDetailSkeleton } from '@/components/ui/table-skeleton';

export default function EmployeeAssetDetailLoading() {
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
