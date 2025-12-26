import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SupplierListTableServerSearch } from '@/components/suppliers/supplier-list-table-server-search';
import { Building2, Plus, Tags, Handshake } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

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

  const [totalSuppliers, approvedSuppliers, categories, totalEngagements] = await Promise.all([
    prisma.supplier.count({ where: { tenantId } }),
    prisma.supplier.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.supplier.findMany({
      where: { tenantId },
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.supplierEngagement.count({ where: { tenantId } }),
  ]);

  const uniqueCategories = categories.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-slate-500 text-sm">Manage vendor registrations and engagements</p>
        </div>
        <Link
          href="/suppliers/register"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register Supplier
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Total Suppliers"
          subtitle="Registered in system"
          value={totalSuppliers}
          icon={Building2}
          color="blue"
        />
        <StatsCard
          title="Approved"
          subtitle="Active vendors"
          value={approvedSuppliers}
          icon={Building2}
          color="emerald"
        />
        <StatsCard
          title="Categories"
          subtitle="Unique types"
          value={uniqueCategories}
          icon={Tags}
          color="amber"
        />
        <StatsCard
          title="Engagements"
          subtitle="Recorded interactions"
          value={totalEngagements}
          icon={Handshake}
          color="purple"
        />
      </StatsCardGrid>

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
    </div>
  );
}
