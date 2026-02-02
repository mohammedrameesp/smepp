/**
 * @module app/admin/(operations)/asset-requests/loading
 * @description Loading skeleton for the asset requests list page. Displays a table skeleton
 * with 7 columns and 10 rows while the asset requests data is being fetched.
 */

import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function AssetRequestsLoading() {
  return <PageWithTableSkeleton columns={7} rows={10} />;
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Provides a loading state skeleton for the asset requests list page using Next.js
 * App Router's loading convention. Improves perceived performance by showing a
 * placeholder UI while data loads.
 *
 * Key Features:
 * - Uses shared PageWithTableSkeleton component for consistent loading UI
 * - Configures 7 columns and 10 rows to match the asset requests table layout
 *
 * Code Quality: Excellent
 * - Simple and focused component
 * - Follows Next.js App Router conventions
 * - Uses shared UI components for consistency
 *
 * Potential Improvements:
 * - None needed - this is a minimal, well-implemented loading component
 */
