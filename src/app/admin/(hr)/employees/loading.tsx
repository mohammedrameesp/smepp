import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';

export default function EmployeesLoading() {
  return <PageWithTableSkeleton columns={6} rows={10} />;
}
