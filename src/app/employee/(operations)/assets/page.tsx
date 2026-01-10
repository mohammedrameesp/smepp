/**
 * @file page.tsx
 * @description Employee all assets page - browse and search company assets
 * @module app/employee/(operations)/assets
 *
 * Features:
 * - Modern PageHeader layout matching admin design
 * - Server-side pagination and search for better performance
 * - Inline stats badges (My Assets, Pending Requests, Total)
 * - Assignment filter defaulting to "All Assets"
 * - Hides sensitive fields (price, serial, supplier)
 * - "You" badge on assigned assets
 *
 * Use Cases:
 * - Find available assets to request
 * - View asset specifications before requesting
 * - Search for specific equipment types
 * - Track personal assignments via stats and filters
 *
 * Access: All authenticated employees (tenant-scoped)
 * Route: /employee/assets
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { AssetRequestStatus } from '@prisma/client';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { EmployeeAssetListTableServerSearch } from '@/features/assets';
import { Inbox } from 'lucide-react';
import Link from 'next/link';

/**
 * Employee all assets page component
 * Displays browsable list of all company assets with modern UI
 */
export default async function EmployeeAllAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  const userId = session.user.id;

  // Fetch stats for badges
  const [myAssetsCount, totalCount, requestedCount] = await Promise.all([
    // My Assets: assigned to me
    prisma.asset.count({
      where: { tenantId, assignedMemberId: userId },
    }),
    // Total organizational assets (for context)
    prisma.asset.count({
      where: { tenantId },
    }),
    // My pending requests
    prisma.assetRequest.count({
      where: {
        tenantId,
        memberId: userId,
        status: {
          in: [
            AssetRequestStatus.PENDING_ADMIN_APPROVAL,
            AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          ],
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Assets"
        subtitle="Browse and search company assets"
      >
        <StatChipGroup>
          <StatChip value={myAssetsCount} label="my assets" color="blue" href="/employee/my-assets?tab=assets" />
          <StatChip
            value={requestedCount}
            label="pending"
            color="amber"
            icon={<Inbox className="h-4 w-4" />}
            href="/employee/asset-requests"
            hideWhenZero
          />
          <StatChip value={totalCount} label="total" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Assets Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Assets</h2>
            <p className="text-sm text-slate-500">
              Search and filter company assets. Use the assignment filter to view specific groups.
            </p>
          </div>
          <div className="p-4">
            <EmployeeAssetListTableServerSearch currentUserId={userId} />
          </div>
        </div>
      </PageContent>
    </>
  );
}
