import { Suspense } from 'react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { PageWithTableSkeleton } from '@/components/ui/table-skeleton';
import { AccessControlClient } from './client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Access Control',
  description: 'Manage team member permissions and access levels',
};

export default function AccessControlPage() {
  return (
    <>
      <PageHeader
        title="Access Control"
        subtitle="Manage who has access to what across your organization"
        breadcrumbs={[
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Access Control' },
        ]}
      />
      <PageContent>
        <Suspense fallback={<PageWithTableSkeleton />}>
          <AccessControlClient />
        </Suspense>
      </PageContent>
    </>
  );
}
