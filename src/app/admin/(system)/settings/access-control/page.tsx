/**
 * @module admin/settings/access-control/page
 * @description Server page wrapper for the access control settings. Renders the
 * AccessControlClient component with proper loading states. Part of the admin
 * settings section for managing team member permissions.
 *
 * @route /admin/settings/access-control
 * @access Admin only
 */
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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Simple server page wrapper that follows the standard PageHeader/PageContent
 * pattern with proper Suspense boundary for the client component.
 *
 * STRENGTHS:
 * - Clean separation of server page and client component
 * - Proper loading skeleton while client component hydrates
 * - Metadata export for SEO/browser title
 * - Consistent breadcrumb navigation
 *
 * POTENTIAL IMPROVEMENTS:
 * - Could add server-side auth check before rendering (currently relies on
 *   middleware and client component)
 *
 * SECURITY:
 * - Protected by middleware admin route checks
 * - Authentication deferred to client component API calls
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
