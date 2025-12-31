import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function SuppliersLoading() {
  return <PageWithTableSkeleton columns={5} rows={10} />;
}
