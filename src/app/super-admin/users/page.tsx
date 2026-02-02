/**
 * @module super-admin/users/page
 * @description Platform-wide users listing page showing all TeamMembers across organizations.
 * Server component that provides a read-only view of all registered users.
 *
 * @features
 * - List all active team members across all organizations
 * - Display user details: name, email, organization, role, join date
 * - Responsive card-based layout for user information
 * - Empty state handling when no users exist
 *
 * @data
 * - Queries TeamMember (not User) to show organization-specific memberships
 * - Filters out soft-deleted members (isDeleted: false)
 * - Includes tenant relationship for organization context
 *
 * @note
 * - Read-only view, no edit/delete capabilities on this page
 * - Users may appear multiple times if they belong to multiple organizations
 */
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

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * File: src/app/super-admin/users/page.tsx
 * Type: Server Component
 * Last Reviewed: 2026-02-01
 *
 * PURPOSE:
 * Displays all platform users (TeamMembers) across all organizations in a
 * read-only list format for super admin oversight.
 *
 * ARCHITECTURE:
 * - Server component with direct database query
 * - Simple data model: TeamMember with tenant relationship
 * - Card-based layout instead of table for responsiveness
 * - Uses shared utility functions for display formatting
 *
 * DATA MODEL:
 * - Queries TeamMember (organization memberships) not User (global accounts)
 * - Filters soft-deleted members (isDeleted: false)
 * - Orders by creation date (newest first)
 * - Includes tenant for organization context
 *
 * DISPLAY FIELDS:
 * - Name and email (with initials avatar)
 * - Organization name
 * - Role badge (Admin/Member)
 * - Join date (relative time)
 *
 * SECURITY CONSIDERATIONS:
 * [+] Read-only view - no modification capabilities
 * [+] Uses utility functions for safe email display
 * [!] No pagination - may have performance issues with large user bases
 *
 * UI/UX:
 * [+] Responsive card layout
 * [+] Empty state handling
 * [+] Relative timestamps for recency
 * [-] No search or filtering functionality
 * [-] No detail view or drill-down
 *
 * POTENTIAL IMPROVEMENTS:
 * - Add pagination for scalability
 * - Implement search by name/email
 * - Add filter by organization
 * - Add user detail modal or page
 * - Show last activity timestamp
 * - Add export functionality (CSV)
 * - Consider showing User account status (verified, 2FA)
 *
 * =========================================================================== */
