import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { SupplierListClient, ShareSupplierLinkButton } from '@/features/suppliers';
import { Plus } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with Operations access
  const hasAccess = session.user.isAdmin || session.user.hasOperationsAccess;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId || !session.user.organizationSlug) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  const organizationSlug = session.user.organizationSlug;

  let totalSuppliers = 0;
  let approvedSuppliers = 0;
  let pendingSuppliers = 0;
  let uniqueCategories = 0;
  let totalEngagements = 0;

  try {
    const [suppliersCount, approvedCount, pendingCount, categories, engagementsCount] = await Promise.all([
      prisma.supplier.count({ where: { tenantId } }),
      prisma.supplier.count({ where: { tenantId, status: 'APPROVED' } }),
      prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.supplier.findMany({
        where: { tenantId },
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.supplierEngagement.count({ where: { tenantId } }),
    ]);
    totalSuppliers = suppliersCount;
    approvedSuppliers = approvedCount;
    pendingSuppliers = pendingCount;
    uniqueCategories = categories.length;
    totalEngagements = engagementsCount;
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor registrations and engagements"
        actions={
          <>
            <ShareSupplierLinkButton organizationSlug={organizationSlug} />
            <PageHeaderButton href="/suppliers/register" variant="primary">
              <Plus className="h-4 w-4" />
              Register Supplier
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={totalSuppliers} label="total" color="blue" />
          <StatChip value={approvedSuppliers} label="approved" color="emerald" />
          <StatChip value={pendingSuppliers} label="pending" color="amber" hideWhenZero />
          <StatChip value={uniqueCategories} label="categories" color="purple" />
          <StatChip value={totalEngagements} label="engagements" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Suppliers Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Suppliers</h2>
            <p className="text-sm text-slate-500">Complete list with status and contact information</p>
          </div>
          <div className="p-4">
            <SupplierListClient />
          </div>
        </div>
      </PageContent>
    </>
  );
}
