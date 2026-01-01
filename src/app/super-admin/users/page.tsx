import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Building2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

async function getUsers() {
  const users = await prisma.user.findMany({
    where: { isSuperAdmin: false },
    orderBy: { createdAt: 'desc' },
    include: {
      organizationMemberships: {
        include: {
          organization: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  });

  return users;
}

export default async function SuperAdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Users</h2>
        <p className="text-muted-foreground">
          {users.length} users registered on the platform
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users yet</h3>
            <p className="text-muted-foreground">
              Users will appear here when they sign up
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-slate-600">
                        {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 pl-13 sm:pl-0">
                    <div className="hidden md:block">
                      {user.organizationMemberships.length > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{user.organizationMemberships[0].organization.name}</span>
                          {user.organizationMemberships.length > 1 && (
                            <Badge variant="secondary" className="ml-1">
                              +{user.organizationMemberships.length - 1}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No organization</span>
                      )}
                    </div>

                    <Badge variant="outline">{user.role}</Badge>

                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span className="hidden sm:inline">{formatDistanceToNow(user.createdAt, { addSuffix: true })}</span>
                      <span className="sm:hidden">{formatDistanceToNow(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
