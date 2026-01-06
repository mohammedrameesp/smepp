import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function AssetRequestsLoading() {
  return <PageWithTableSkeleton columns={7} rows={10} />;
}
