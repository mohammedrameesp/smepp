/**
 * @module app/employee/(operations)/assets
 * @description Loading skeleton for the employee assets list page.
 *
 * Uses the standard PageWithTableSkeleton component for consistent loading state.
 * Displays a 9-column table skeleton with 10 placeholder rows.
 */
import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function EmployeeAssetsLoading() {
  return <PageWithTableSkeleton columns={9} rows={10} />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - uses shared skeleton component
 */
