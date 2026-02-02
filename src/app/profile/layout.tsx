/**
 * @module app/profile/layout
 * @description Profile page layout with admin navigation shell.
 *
 * This layout wraps the profile page with the standard admin layout shell,
 * providing consistent navigation, sidebar, and organization context.
 * It reuses the AdminLayoutClient component to maintain UI consistency.
 *
 * Key features:
 * - Dynamic page title with organization name
 * - Authentication check with redirect to login
 * - Fetches badge counts for navigation indicators (pending requests, approvals)
 * - Fetches org settings for enabled modules and AI chat
 * - Uses AdminLayoutClient for consistent admin UI shell
 *
 * Badge counts fetched:
 * - Profile change requests
 * - Leave requests
 * - Supplier approvals
 * - Spend requests
 * - Asset requests (new + returns)
 * - General approval steps
 *
 * @dependencies
 * - next-auth: getServerSession for auth check
 * - prisma: Database queries for badge counts and org settings
 * - AdminLayoutClient: Admin UI shell component
 */
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AdminLayoutClient } from '@/app/admin/layout-client';
import type { Metadata } from 'next';

// Dynamic page titles with organization name
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const orgName = session?.user?.organizationName || 'Durj';

  return {
    title: {
      template: `%s | ${orgName}`,
      default: `Profile | ${orgName}`,
    },
  };
}

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

async function getBadgeCounts(tenantId: string) {
  const [
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingSpendRequests,
    pendingAssetRequestsCount,
    pendingAssetReturnsCount,
    pendingApprovalSteps,
  ] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.assetRequest.count({ where: { tenantId, status: 'PENDING_ADMIN_APPROVAL' } }),
    prisma.assetRequest.count({ where: { tenantId, status: 'PENDING_RETURN_APPROVAL' } }),
    prisma.approvalStep.groupBy({
      by: ['entityType', 'entityId'],
      where: { tenantId, status: 'PENDING' },
    }).then((groups) => groups.length),
  ]);

  return {
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingSpendRequests,
    pendingAssetRequests: pendingAssetRequestsCount + pendingAssetReturnsCount,
    pendingApprovals: pendingApprovalSteps,
  };
}

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const tenantId = session.user?.organizationId;
  const [badgeCounts, orgSettings] = tenantId
    ? await Promise.all([
        getBadgeCounts(tenantId),
        getOrgSettings(tenantId),
      ])
    : [
        {
          pendingChangeRequests: 0,
          pendingLeaveRequests: 0,
          pendingSuppliers: 0,
          pendingSpendRequests: 0,
          pendingAssetRequests: 0,
          pendingApprovals: 0,
        },
        { enabledModules: ['assets', 'subscriptions', 'suppliers'], aiChatEnabled: false },
      ];

  return (
    <AdminLayoutClient
      badgeCounts={badgeCounts}
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
    >
      {children}
    </AdminLayoutClient>
  );
}

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * WHAT THIS FILE DOES:
 * Server-side layout that wraps the profile page with the admin navigation shell.
 * Fetches necessary data for navigation badges and module visibility.
 *
 * KEY FUNCTIONS:
 * - generateMetadata: Dynamic page title with org name
 * - getOrgSettings: Fetches enabled modules and AI chat setting
 * - getBadgeCounts: Fetches counts for all pending approval items
 *
 * POTENTIAL ISSUES:
 * 1. [LOW] Default enabledModules hardcoded in two places (getOrgSettings and fallback)
 * 2. [MEDIUM] Badge counts query runs 7 parallel queries - could be optimized into
 *    fewer queries or cached
 * 3. [LOW] No error handling for failed badge count queries - could cause page crash
 *
 * SECURITY CONSIDERATIONS:
 * - Authentication check with redirect to login
 * - Tenant-scoped queries (all use tenantId filter)
 *
 * PERFORMANCE:
 * - Badge counts and org settings fetched in parallel via Promise.all
 * - Individual count queries are indexed (tenantId + status)
 * - Could benefit from caching for frequently accessed orgs
 *
 * LAST REVIEWED: 2025-01-27
 * REVIEWED BY: Code Review System
 * =========================================================================== */
