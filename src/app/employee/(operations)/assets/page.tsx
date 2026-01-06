/**
 * @file page.tsx
 * @description Employee all assets page - browse and search company assets
 * @module app/employee/(operations)/assets
 *
 * Features:
 * - Modern PageHeader layout matching admin design
 * - Server-side pagination and search for better performance
 * - Inline stats badges (My Assets, Available, Pending Requests, Total)
 * - Assignment filter defaulting to "My Assets"
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
import { EmployeeAssetListTableServerSearch } from '@/components/domains/operations/assets/employee-asset-list-table-server-search';
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
  const [myAssetsCount, availableCount, totalCount, requestedCount] = await Promise.all([
    // My Assets: assigned to me
    prisma.asset.count({
      where: { tenantId, assignedMemberId: userId },
    }),
    // Available: SPARE status
    prisma.asset.count({
      where: { tenantId, status: 'SPARE' },
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
        {/* Stats Summary Badges */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Link
            href="/employee/my-assets?tab=assets"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
          >
            <span className="text-blue-400 text-sm font-medium">
              {myAssetsCount} my assets
            </span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">
              {availableCount} available
            </span>
          </div>
          {requestedCount > 0 && (
            <Link
              href="/employee/asset-requests"
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
            >
              <Inbox className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {requestedCount} pending
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <span className="text-slate-400 text-sm font-medium">
              {totalCount} total
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Assets Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Assets</h2>
            <p className="text-sm text-slate-500">
              Search and filter company assets. Default view shows your assigned assets.
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
