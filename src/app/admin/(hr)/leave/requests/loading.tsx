/**
 * @module app/admin/(hr)/leave/requests/loading
 * @description Loading state component for the leave requests list page.
 * Displays a skeleton table while leave request data is being fetched.
 *
 * @see {@link @/components/ui/table-skeleton} for skeleton component
 */
import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function LeaveRequestsLoading() {
  return <PageWithTableSkeleton columns={6} rows={10} />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Provides visual loading feedback for the leave requests page
 *
 * Strengths:
 * - Uses standardized skeleton component for consistent UX
 * - Matches expected table structure (6 columns, 10 rows)
 * - Simple and maintainable implementation
 *
 * Weaknesses: None identified
 *
 * Security: N/A - Pure UI component with no data handling
 *
 * Recommendations:
 * - Consider using shared constants for skeleton dimensions
 *   to maintain consistency with actual table columns
 */
