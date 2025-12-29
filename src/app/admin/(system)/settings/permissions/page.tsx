import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { PermissionsClient } from './client';
import { getPermissionsForRole, PERMISSION_GROUPS } from '@/lib/access-control';
import { PageHeader } from '@/components/ui/page-header';

export default async function PermissionsSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only OWNER and ADMIN can manage permissions
  const orgRole = session.user.orgRole;
  if (orgRole !== 'OWNER' && orgRole !== 'ADMIN') {
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Role Permissions"
            subtitle="Configure what each role can do in your organization. OWNER and ADMIN roles always have full access."
            breadcrumbs={[
              { label: 'Settings', href: '/admin/settings' },
              { label: 'Permissions' },
            ]}
          />

          <PermissionsClient
            organizationName={org.name}
            enabledModules={org.enabledModules}
            initialPermissions={{
              MANAGER: managerPermissions,
              MEMBER: memberPermissions,
            }}
            permissionGroups={PERMISSION_GROUPS}
          />
        </div>
      </div>
    </div>
  );
}
