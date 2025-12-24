import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, Calendar, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ResetPlatformButton } from './components/ResetPlatformButton';

async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          members: true,
          assets: true,
          invitations: {
            where: { acceptedAt: null },
          },
        },
      },
      members: {
        where: { isOwner: true },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        take: 1,
      },
    },
  });

  return organizations;
}

async function getStats() {
  const [orgCount, userCount, pendingInvites] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.organizationInvitation.count({ where: { acceptedAt: null } }),
  ]);

  return { orgCount, userCount, pendingInvites };
}

export default async function SuperAdminDashboard() {
  let organizations;
  let stats;

  try {
    [organizations, stats] = await Promise.all([
      getOrganizations(),
      getStats(),
    ]);
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Database Connection Error</h2>
          <p className="text-red-600 mb-4">
            Failed to load dashboard data. Please check:
          </p>
          <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
            <li>DATABASE_URL environment variable is set correctly</li>
            <li>Database is accessible from this deployment</li>
            <li>Prisma migrations are up to date</li>
          </ul>
          <p className="text-xs text-red-500 mt-4 font-mono">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Organizations</CardDescription>
            <CardTitle className="text-4xl">{stats.orgCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-4xl">{stats.userCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invitations</CardDescription>
            <CardTitle className="text-4xl">{stats.pendingInvites}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Testing Tools - Remove in production */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-800">Testing Tools</CardTitle>
          <CardDescription className="text-red-600">
            These tools are for development/testing only. Remove before production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPlatformButton />
        </CardContent>
      </Card>

      {/* Organizations List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Organizations</h2>
            <p className="text-muted-foreground">Manage all organizations on the platform</p>
          </div>
          <Link href="/super-admin/organizations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </Link>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first organization to get started
              </p>
              <Link href="/super-admin/organizations/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {organizations.map((org) => {
              const owner = org.members[0]?.user;
              return (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="h-12 w-12 rounded-lg object-contain bg-gray-100"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{org.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            {org.slug}.smepp.com
                          </p>
                          {owner && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Owner: {owner.name || owner.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold">{org._count.members}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Members</p>
                        </div>

                        {org._count.invitations > 0 && (
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-amber-600">
                              <Mail className="h-4 w-4" />
                              <span className="font-semibold">{org._count.invitations}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                        )}

                        <div className="text-center">
                          <Badge variant={org.subscriptionTier === 'FREE' ? 'secondary' : 'default'}>
                            {org.subscriptionTier}
                          </Badge>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(org.createdAt, { addSuffix: true })}
                          </div>
                        </div>

                        <Link href={`/super-admin/organizations/${org.id}`}>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
