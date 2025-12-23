import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { formatDate, formatDateTime } from '@/lib/date-format';

export default async function ActivityLogPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Fetch recent activity logs
  const activities = await prisma.activityLog.findMany({
    take: 50,
    orderBy: { at: 'desc' },
    include: {
      actorUser: {
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Log</h1>
          <p className="text-gray-600">
            System activity and audit trail
          </p>
        </div>

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
                      {activity.actorUser ? (
                        <div>
                          <div className="font-medium">{activity.actorUser.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 font-mono">{activity.actorUser.email}</div>
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
      </div>
    </div>
  );
}