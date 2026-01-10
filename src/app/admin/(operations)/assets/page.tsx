/**
 * @file page.tsx
 * @description Admin assets list page - displays all organization assets with stats and server-side search
 * @module app/admin/(operations)/assets
 *
 * Features:
 * - Asset statistics (total count, total value in QAR, assigned count)
 * - Pending request/return indicators
 * - Server-side search and filtering via AssetListTableServerSearch component
 * - Quick actions: Add new asset, Import assets
 *
 * Access: Admin only (enforced via role check)
 * Route: /admin/assets
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import { AssetListTableServerSearch } from '@/features/assets';
import { Plus, Inbox } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

/**
 * Admin assets list page component
 * Fetches asset statistics and renders the asset management interface
 */
export default async function AdminAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const [assetStats, assignedCount, pendingRequests, pendingReturns] = await Promise.all([
    prisma.asset.aggregate({
      where: { tenantId },
      _count: { _all: true },
      _sum: { priceQAR: true },
    }),
    prisma.asset.count({
      where: { tenantId, assignedMemberId: { not: null } },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
    }),
  ]);

  const totalAssets = assetStats._count._all;
  const totalValueQAR = Number(assetStats._sum.priceQAR || 0);
  const totalPendingRequests = pendingRequests + pendingReturns;

  return (
    <>
      <PageHeader
        title="Assets"
        subtitle="Manage company assets and equipment"
        actions={
          <>
            <PageHeaderButton href="/admin/asset-requests" variant="secondary">
              <Inbox className="h-4 w-4" />
              Requests
              {totalPendingRequests > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {totalPendingRequests}
                </span>
              )}
            </PageHeaderButton>
            <PageHeaderButton href="/admin/assets/new" variant="primary">
              <Plus className="h-4 w-4" />
              Add Asset
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={totalAssets} label="total assets" color="blue" />
          <StatChip value={assignedCount} label="assigned" color="emerald" />
          <StatChip value={`QAR ${totalValueQAR.toLocaleString()}`} label="value" color="purple" />
          <StatChip
            value={totalPendingRequests}
            label="pending requests"
            color="amber"
            href="/admin/asset-requests"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Assets Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Assets</h2>
            <p className="text-sm text-slate-500">Complete inventory with filters and sorting</p>
          </div>
          <div className="p-4">
            <AssetListTableServerSearch />
          </div>
        </div>
      </PageContent>
    </>
  );
}
