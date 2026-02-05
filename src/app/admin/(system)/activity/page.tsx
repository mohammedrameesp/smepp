/**
 * @module admin/(system)/activity
 * @description Activity log page displaying system-wide audit trail.
 * Shows recent user actions and system events with filtering and pagination.
 * Requires admin access for viewing.
 */

import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/core/impersonation-check';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { ActivityLogClient } from './activity-log-client';

/**
 * Activity Log Page - Server Component
 * Fetches team members for filter dropdown and renders client component.
 */
export default async function ActivityLogPage(): Promise<React.JSX.Element> {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (admin access required)
  if (!hasAccess(auth, 'admin')) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  // Fetch filter options in parallel
  const [teamMembers, entityTypesResult, actorsResult] = await Promise.all([
    // Team members for actor filter dropdown
    prisma.teamMember.findMany({
      where: { tenantId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
    // Distinct entity types that have activity logs
    prisma.activityLog.groupBy({
      by: ['entityType'],
      where: { tenantId, entityType: { not: null } },
      orderBy: { entityType: 'asc' },
    }),
    // Distinct actors who have activity logs
    prisma.activityLog.groupBy({
      by: ['actorMemberId'],
      where: { tenantId, actorMemberId: { not: null } },
    }),
  ]);

  // Extract entity types and filter to only actors with logs
  const entityTypes = entityTypesResult
    .map((r) => r.entityType)
    .filter((t): t is string => t !== null);

  const actorIds = new Set(actorsResult.map((r) => r.actorMemberId));
  const actorsWithLogs = teamMembers.filter((m) => actorIds.has(m.id));

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="System activity and audit trail"
      />

      <PageContent>
        <ActivityLogClient
          teamMembers={actorsWithLogs}
          entityTypes={entityTypes}
        />
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-05
 * Reviewer: Claude
 * Status: Refactored
 * Changes:
 *   - Converted to use ActivityLogClient for client-side data fetching
 *   - Page now uses /api/activity endpoint instead of direct Prisma queries
 *   - Added filtering by actor and entity type
 *   - Added pagination support
 *   - Server component now only fetches team members for filter dropdown
 * Issues: None
 */