import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { EmployeeLayoutClient } from './layout-client';

// Get organization settings from database (fresh, not from session)
async function getOrgSettings(tenantId: string): Promise<{ enabledModules: string[]; aiChatEnabled: boolean }> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true, aiChatEnabled: true },
  });
  return {
    enabledModules: org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'],
    aiChatEnabled: org?.aiChatEnabled ?? false,
  };
}

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // PROD-003: Auth bypass only when DEV_AUTH_ENABLED is explicitly set
  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';

  // Redirect unauthenticated users
  if (!session && !devAuthEnabled) {
    redirect('/login');
  }

  // Get organization settings from database
  const orgSettings = session?.user?.organizationId
    ? await getOrgSettings(session.user.organizationId)
    : { enabledModules: ['assets', 'subscriptions', 'suppliers'], aiChatEnabled: false };

  return (
    <EmployeeLayoutClient
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
    >
      {children}
    </EmployeeLayoutClient>
  );
}
