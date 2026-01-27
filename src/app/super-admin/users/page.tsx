import { prisma } from '@/lib/core/prisma';
import { Card, CardContent } from '@/components/ui/card';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Building2, Calendar } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { getDisplayInitials, getDisplayEmail } from '@/lib/utils/user-display';

async function getUsers() {
  // Query TeamMembers with their organizations
  const members = await prisma.teamMember.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    include: {
      tenant: {
        select: { name: true, slug: true },
      },
    },
  });

  return members;
}

export default async function SuperAdminUsersPage() {
  const members = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Users</h2>
        <p className="text-muted-foreground">
          {members.length} users registered on the platform
        </p>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className={`${ICON_SIZES['3xl']} text-muted-foreground mb-4`} />
            <h3 className="text-lg font-semibold mb-2">No users yet</h3>
            <p className="text-muted-foreground">
              Users will appear here when they sign up
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-slate-600">
                        {getDisplayInitials(member.name, member.email)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.name || 'No name'}</p>
                      {getDisplayEmail(member.email) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className={`${ICON_SIZES.xs} flex-shrink-0`} />
                          <span className="truncate">{getDisplayEmail(member.email)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 pl-13 sm:pl-0">
                    <div className="hidden md:block">
                      {member.tenant ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className={`${ICON_SIZES.sm} text-muted-foreground`} />
                          <span className="truncate max-w-[150px]">{member.tenant.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No organization</span>
                      )}
                    </div>

                    <Badge variant="outline">{member.isAdmin ? 'Admin' : 'Member'}</Badge>

                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className={ICON_SIZES.xs} />
                      <span className="hidden sm:inline">{formatDistanceToNow(member.createdAt, { addSuffix: true })}</span>
                      <span className="sm:hidden">{formatDistanceToNow(member.createdAt)}</span>
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
