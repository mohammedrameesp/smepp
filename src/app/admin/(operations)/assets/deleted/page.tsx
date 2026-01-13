/**
 * @file page.tsx
 * @description Admin page for managing deleted (trashed) assets
 * @module app/admin/(operations)/assets/deleted
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { DeletedAssetsTable } from './deleted-assets-table';

export default async function DeletedAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const deletedAssets = await prisma.asset.findMany({
    where: {
      tenantId,
      deletedAt: { not: null },
    },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      assetTag: true,
      model: true,
      brand: true,
      type: true,
      status: true,
      deletedAt: true,
      deletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assetCategory: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  // Add recovery deadline info
  const assetsWithDeadline = deletedAssets.map(asset => ({
    ...asset,
    recoveryDeadline: asset.deletedAt
      ? new Date(new Date(asset.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null,
    daysRemaining: asset.deletedAt
      ? Math.max(0, Math.ceil((new Date(asset.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0,
  }));

  return (
    <>
      <PageHeader
        title="Deleted Assets"
        subtitle={`${deletedAssets.length} asset${deletedAssets.length !== 1 ? 's' : ''} in trash - Auto-deleted after 7 days`}
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: 'Deleted' },
        ]}
        actions={
          <PageHeaderButton href="/admin/assets" variant="outline">
            Back to Assets
          </PageHeaderButton>
        }
      />

      <PageContent>
        <DeletedAssetsTable assets={assetsWithDeadline} />
      </PageContent>
    </>
  );
}
