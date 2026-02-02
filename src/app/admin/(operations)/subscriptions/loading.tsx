/**
 * @file loading.tsx
 * @description Loading skeleton for subscriptions list page
 * @module app/admin/(operations)/subscriptions
 *
 * Shows animated skeleton with 6 columns and 10 rows while
 * the main subscription list page loads data.
 */
import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function SubscriptionsLoading() {
  return <PageWithTableSkeleton columns={6} rows={10} />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
