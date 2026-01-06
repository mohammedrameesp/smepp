import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeSupplierListTable } from '@/components/domains/operations/suppliers/employee-supplier-list-table';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Building2, Users, FolderOpen } from 'lucide-react';

export default async function EmployeeSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch all approved suppliers with related data
  const suppliers = await prisma.supplier.findMany({
    where: {
      status: 'APPROVED',
    },
    include: {
      _count: {
        select: {
          engagements: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate stats
  const totalEngagements = suppliers.reduce((sum, s) => sum + s._count.engagements, 0);
  const uniqueCategories = new Set(suppliers.map(s => s.category)).size;

  return (
    <>
      <PageHeader
        title="All Suppliers"
        subtitle="Browse and search approved company suppliers"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Suppliers' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              {suppliers.length} approved suppliers
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <Users className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">
              {totalEngagements} engagements
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
            <FolderOpen className="h-4 w-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">
              {uniqueCategories} categories
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Company Suppliers</h2>
              <p className="text-sm text-slate-500">Search, filter, and browse all approved suppliers</p>
            </div>
          </div>
          <div className="p-5">
            {suppliers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No suppliers found</p>
              </div>
            ) : (
              <EmployeeSupplierListTable suppliers={suppliers} />
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
