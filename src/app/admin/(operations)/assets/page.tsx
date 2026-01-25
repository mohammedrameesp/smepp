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

import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { AssetRequestStatus } from '@prisma/client';
import { AssetListClient } from '@/features/assets';
import { Plus, Inbox, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { getAdminAuthContext, hasAccess } from '@/lib/auth/impersonation-check';

/**
 * Admin assets list page component
 * Fetches asset statistics and renders the asset management interface
 */
export default async function AdminAssetsPage() {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (impersonation grants full access)
  if (!hasAccess(auth, 'operations')) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  const [assetStats, assignedCount, pendingRequests, pendingReturns, deletedCount] = await Promise.all([
    prisma.asset.aggregate({
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
      _sum: { priceQAR: true },
    }),
    prisma.asset.count({
      where: { tenantId, deletedAt: null, assignedMemberId: { not: null } },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
    }),
    prisma.asset.count({
      where: { tenantId, deletedAt: { not: null } },
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
            {deletedCount > 0 && (
              <PageHeaderButton href="/admin/assets/deleted" variant="outline">
                <Trash2 className="h-4 w-4" />
                Trash
                <span className="bg-slate-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {deletedCount}
                </span>
              </PageHeaderButton>
            )}
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
            <AssetListClient />
          </div>
        </div>
      </PageContent>
    </>
  );
}
