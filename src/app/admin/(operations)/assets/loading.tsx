import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function AssetsLoading() {
  return <PageWithTableSkeleton columns={7} rows={10} />;
}
