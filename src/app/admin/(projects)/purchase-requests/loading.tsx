import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function PurchaseRequestsLoading() {
  return <PageWithTableSkeleton columns={7} rows={10} />;
}
