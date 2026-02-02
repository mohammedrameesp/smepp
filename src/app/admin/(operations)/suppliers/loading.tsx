/**
 * @module app/admin/(operations)/suppliers/loading
 * @description Loading skeleton for the suppliers list page. Displays a table skeleton
 * with 5 columns and 10 rows while the suppliers data is being fetched.
 */

import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function SuppliersLoading() {
  return <PageWithTableSkeleton columns={5} rows={10} />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Provides a loading state skeleton for the suppliers list page using Next.js
 * App Router's loading convention. Improves perceived performance by showing a
 * placeholder UI while data loads.
 *
 * Key Features:
 * - Uses shared PageWithTableSkeleton component for consistent loading UI
 * - Configures 5 columns and 10 rows to match the suppliers table layout
 *
 * Code Quality: Excellent
 * - Simple and focused component
 * - Follows Next.js App Router conventions
 * - Uses shared UI components for consistency
 *
 * Potential Improvements:
 * - None needed - this is a minimal, well-implemented loading component
 */
