import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { EmployeeLayoutClient } from './layout-client';
import type { Metadata } from 'next';

// Dynamic page titles with organization name
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const orgName = session?.user?.organizationName || 'Durj';

  return {
    title: {
      template: `%s | ${orgName}`,
      default: `Employee Portal | ${orgName}`,
    },
  };
}

// Get organization settings from database (fresh, not from session)
// Returns null if organization doesn't exist (was deleted)
async function getOrgSettings(tenantId: string): Promise<{ enabledModules: string[]; aiChatEnabled: boolean } | null> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true, aiChatEnabled: true },
  });

  // Return null if org doesn't exist (deleted)
  if (!org) {
    return null;
  }

  return {
    enabledModules: org.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'],
    aiChatEnabled: org.aiChatEnabled ?? false,
  };
}

// Check if user has completed onboarding (now on TeamMember)
async function checkOnboardingComplete(memberId: string): Promise<boolean> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { onboardingComplete: true },
  });
  return member?.onboardingComplete ?? false;
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

  // Non-employees cannot access employee portal
  if (session?.user?.isEmployee === false) {
    redirect('/admin');
  }

  // Check onboarding status - no longer force redirect, allow employees to skip
  let onboardingComplete = true;
  // Check isAdmin using boolean flags
  const isAdmin = session?.user?.isOwner || session?.user?.isAdmin;
  if (session?.user?.id && !isAdmin) {
    onboardingComplete = await checkOnboardingComplete(session.user.id);
  }

  // Get organization settings from database
  let orgSettings = { enabledModules: ['assets', 'subscriptions', 'suppliers'], aiChatEnabled: false };

  if (session?.user?.organizationId) {
    const fetchedOrgSettings = await getOrgSettings(session.user.organizationId);

    // Check if organization still exists
    if (!fetchedOrgSettings) {
      // Organization was deleted - redirect to auto-signout page
      redirect('/org-deleted');
    }

    orgSettings = fetchedOrgSettings;
  }

  // Check if admin is in employee view mode
  const cookieStore = await cookies();
  const viewModeCookie = cookieStore.get('durj-view-mode');
  const isAdminInEmployeeView = isAdmin && viewModeCookie?.value === 'employee';

  return (
    <EmployeeLayoutClient
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
      onboardingComplete={onboardingComplete}
      isAdminInEmployeeView={isAdminInEmployeeView}
    >
      {children}
    </EmployeeLayoutClient>
  );
}
