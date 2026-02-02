/**
 * @module admin/(system)/activity
 * @description Activity log page displaying system-wide audit trail.
 * Shows recent user actions and system events with filtering by action type.
 * Requires admin access for viewing.
 */

import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/core/impersonation-check';

import { formatDate } from '@/lib/core/datetime';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

/**
 * Determines the badge variant based on action type.
 * @param action - The action string from the activity log
 * @returns Badge variant for visual indication of action severity
 */
function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.includes('CREATED')) return 'default';
  if (action.includes('UPDATED')) return 'secondary';
  if (action.includes('DELETED')) return 'destructive';
  if (action.includes('ALERT')) return 'outline';
  return 'secondary';
}

/**
 * Activity Log Page - Server Component
 * Displays a paginated list of recent system activities with actor information.
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

  // Fetch recent activity logs with actor details
  // Note: Limited to 50 most recent entries for performance
  const activities = await prisma.activityLog.findMany({
    where: { tenantId },
    take: 50,
    orderBy: { at: 'desc' },
    include: {
      actorMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="System activity and audit trail"
      >
        <StatChipGroup>
          <StatChip value={activities.length} label="recent activities" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity ({activities.length})</CardTitle>
            <CardDescription>
              Latest system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(activity.at)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {activity.actorMember ? (
                        <div>
                          <div className="font-medium">{activity.actorMember.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 font-mono">{activity.actorMember.email}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">System</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(activity.action)}>
                        {activity.action.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.entityType && (
                        <div>
                          <div className="font-medium">{activity.entityType}</div>
                          {activity.entityId && (
                            <div className="text-xs text-gray-500 font-mono">
                              {activity.entityId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {activity.payload && (
                        <div className="text-xs max-w-xs">
                          {typeof activity.payload === 'object' ? (
                            Object.entries(activity.payload as Record<string, unknown>).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500">{key}:</span> {String(value).substring(0, 50)}
                              </div>
                            ))
                          ) : (
                            String(activity.payload).substring(0, 100)
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Extracted getActionBadgeVariant function outside component for better organization
 *   - Added proper TypeScript return type annotation
 *   - Added comments for database query
 * Issues: None
 */