import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { SupplierListTableServerSearch } from '@/components/domains/operations/suppliers/supplier-list-table-server-search';
import { Plus } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

export default async function AdminSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

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
          <PageHeaderButton href="/suppliers/register" variant="primary">
            <Plus className="h-4 w-4" />
            Register Supplier
          </PageHeaderButton>
        }
      >
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">{totalSuppliers} total</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{approvedSuppliers} approved</span>
          </div>
          {pendingSuppliers > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-sm font-medium">{pendingSuppliers} pending</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
            <span className="text-purple-400 text-sm font-medium">{uniqueCategories} categories</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <span className="text-slate-400 text-sm font-medium">{totalEngagements} engagements</span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Suppliers Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Suppliers</h2>
            <p className="text-sm text-slate-500">Complete list with status and contact information</p>
          </div>
          <div className="p-4">
            <SupplierListTableServerSearch />
          </div>
        </div>
      </PageContent>
    </>
  );
}
