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
