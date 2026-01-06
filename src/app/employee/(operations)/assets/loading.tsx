import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function EmployeeAssetsLoading() {
  return <PageWithTableSkeleton columns={9} rows={10} />;
}
