/**
 * @module app/admin/(hr)/employees/loading
 * @description Loading state component for the employees list page.
 * Displays a skeleton table while the employee data is being fetched.
 *
 * @see {@link @/components/ui/table-skeleton} for skeleton component
 */
import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function EmployeesLoading() {
  return <PageWithTableSkeleton columns={6} rows={10} />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Provides visual loading feedback for the employees list page
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
 * - Consider making column/row counts configurable via constants
 *   if they need to match the actual table structure
 */
