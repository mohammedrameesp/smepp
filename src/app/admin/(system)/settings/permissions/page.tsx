/**
 * @module admin/settings/permissions/page
 * @description Server page for role permission management. Fetches organization
 * data and current permissions for Manager and Member roles, then renders the
 * PermissionsClient component. Only accessible by Owner and Admin users.
 *
 * @route /admin/settings/permissions
 * @access Owner and Admin only (server-side auth check)
 * @dependencies
 * - @/lib/access-control - getPermissionsForRole, PERMISSION_GROUPS
 * - Prisma: Organization (enabledModules)
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { PermissionsClient } from './client';
import { getPermissionsForRole, PERMISSION_GROUPS } from '@/lib/access-control';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function PermissionsSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only OWNER and ADMIN can manage permissions
  if (!session.user.isOwner && !session.user.isAdmin) {
    redirect('/admin');
  }

  const tenantId = session.user.organizationId;
  if (!tenantId) {
    redirect('/admin');
  }

  // Fetch organization data
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      enabledModules: true,
    },
  });

  if (!org) {
    redirect('/admin');
  }

  // Get current permissions for each role
  const [managerPermissions, memberPermissions] = await Promise.all([
    getPermissionsForRole(tenantId, 'MANAGER', org.enabledModules),
    getPermissionsForRole(tenantId, 'MEMBER', org.enabledModules),
  ]);

  return (
    <>
      <PageHeader
        title="Role Permissions"
        subtitle="Configure what each role can do in your organization. OWNER and ADMIN roles always have full access."
        breadcrumbs={[
          { label: 'Settings', href: '/admin/settings' },
          { label: 'Permissions' },
        ]}
      />
      <PageContent>
        <PermissionsClient
          organizationName={org.name}
          enabledModules={org.enabledModules}
          initialPermissions={{
            MANAGER: managerPermissions,
            MEMBER: memberPermissions,
          }}
          permissionGroups={PERMISSION_GROUPS}
        />
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
 * Server component that fetches organization and permission data before
 * rendering the client-side permission management interface.
 *
 * STRENGTHS:
 * - Server-side auth check with appropriate redirects
 * - Parallel permission fetching with Promise.all
 * - Uses centralized PERMISSION_GROUPS constant
 * - Passes enabledModules to client for module-aware UI
 * - Clean data flow from server to client component
 *
 * POTENTIAL IMPROVEMENTS:
 * - Add loading.tsx for streaming SSR experience
 * - Consider error boundary for graceful error handling
 * - Could add metadata export for SEO
 *
 * SECURITY:
 * - Multiple auth checks: session, isOwner/isAdmin, organizationId
 * - Tenant context validated before database query
 * - Redirects to /admin on authorization failure
 * - getPermissionsForRole respects enabled modules
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
