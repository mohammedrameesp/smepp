import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function SpendRequestsLoading() {
  return <PageWithTableSkeleton columns={7} rows={10} />;
}
