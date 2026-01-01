import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

import { formatDate } from '@/lib/date-format';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function ActivityLogPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  // Fetch recent activity logs
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

  function getActionBadgeVariant(action: string) {
    if (action.includes('CREATED')) return 'default';
    if (action.includes('UPDATED')) return 'secondary';
    if (action.includes('DELETED')) return 'destructive';
    if (action.includes('ALERT')) return 'outline';
    return 'secondary';
  }

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="System activity and audit trail"
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <span className="text-slate-300 text-sm font-medium">{activities.length} recent activities</span>
          </div>
        </div>
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
                            Object.entries(activity.payload as Record<string, any>).map(([key, value]) => (
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