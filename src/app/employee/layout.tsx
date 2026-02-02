/**
 * @module app/employee
 * @description Root layout for the Employee Portal.
 *
 * This server component handles authentication, authorization, and context setup
 * for all employee-facing pages. It fetches organization settings from the database
 * and passes them to the client layout component.
 *
 * Features:
 * - Authentication enforcement (redirects to /login if unauthenticated)
 * - Role-based access control (non-employees redirected to /admin or /no-access)
 * - Organization deletion detection (redirects to /org-deleted if org no longer exists)
 * - Dynamic metadata generation with organization name
 * - Admin employee-view mode support via cookie
 * - Onboarding status checking for new employees
 * - AI chat feature flag passed to client layout
 *
 * @see EmployeeLayoutClient - Client component that renders the actual layout
 */
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

  // Non-employees (service accounts) cannot access employee portal
  // Check if they have admin access before redirecting to prevent infinite loop
  if (session?.user?.isEmployee === false) {
    const hasAdminAccess = session?.user?.isOwner ||
                           session?.user?.isAdmin ||
                           session?.user?.hasFinanceAccess ||
                           session?.user?.hasHRAccess ||
                           session?.user?.hasOperationsAccess ||
                           session?.user?.canApprove;

    if (hasAdminAccess) {
      redirect('/admin');
    } else {
      // Service account without admin access - redirect to no-access page
      // This prevents an infinite redirect loop between /admin and /employee
      redirect('/no-access');
    }
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

  // Check if user has partial admin access (Finance/HR/Operations/Manager)
  const hasPartialAdminAccess = !isAdmin && (
    session?.user?.hasFinanceAccess ||
    session?.user?.hasHRAccess ||
    session?.user?.hasOperationsAccess ||
    session?.user?.canApprove  // Managers can access admin for approvals
  );

  return (
    <EmployeeLayoutClient
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
      onboardingComplete={onboardingComplete}
      isAdminInEmployeeView={isAdminInEmployeeView}
      hasPartialAdminAccess={hasPartialAdminAccess}
    >
      {children}
    </EmployeeLayoutClient>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - well-structured server component with proper auth checks
 */
