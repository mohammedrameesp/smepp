import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SupplierListTableServerSearch } from '@/components/suppliers/supplier-list-table-server-search';
import { Building2, Plus, Tags, Handshake } from 'lucide-react';

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{totalSuppliers}</span>
            </div>
            <p className="text-sm font-medium">Total Suppliers</p>
            <p className="text-xs text-white/70">Registered in system</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvedSuppliers}</span>
            </div>
            <p className="text-sm font-medium">Approved</p>
            <p className="text-xs text-white/70">Active vendors</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Tags className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{uniqueCategories}</span>
            </div>
            <p className="text-sm font-medium">Categories</p>
            <p className="text-xs text-white/70">Unique types</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Handshake className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{totalEngagements}</span>
            </div>
            <p className="text-sm font-medium">Engagements</p>
            <p className="text-xs text-white/70">Recorded interactions</p>
          </div>
        </div>
      </div>

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
