import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function SubscriptionsLoading() {
  return <PageWithTableSkeleton columns={6} rows={10} />;
}
