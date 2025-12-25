import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { EmployeeLayoutClient } from './layout-client';

// Get enabled modules from database (fresh, not from session)
async function getEnabledModules(tenantId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'];
}

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Get enabled modules from database
  const enabledModules = session?.user?.organizationId
    ? await getEnabledModules(session.user.organizationId)
    : ['assets', 'subscriptions', 'suppliers'];

  return <EmployeeLayoutClient enabledModules={enabledModules}>{children}</EmployeeLayoutClient>;
}
