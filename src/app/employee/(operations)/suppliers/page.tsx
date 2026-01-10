import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeSupplierListTable } from '@/features/suppliers';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Building2, Users, FolderOpen } from 'lucide-react';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';

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
        <StatChipGroup>
          <StatChip
            value={suppliers.length}
            label="approved suppliers"
            color="blue"
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatChip
            value={totalEngagements}
            label="engagements"
            color="emerald"
            icon={<Users className="h-4 w-4" />}
          />
          <StatChip
            value={uniqueCategories}
            label="categories"
            color="purple"
            icon={<FolderOpen className="h-4 w-4" />}
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <DetailCard icon={Building2} iconColor="indigo" title="Company Suppliers" subtitle="Search, filter, and browse all approved suppliers">
          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-4">📦</div>
              <p>No suppliers found</p>
            </div>
          ) : (
            <EmployeeSupplierListTable suppliers={suppliers} />
          )}
        </DetailCard>
      </PageContent>
    </>
  );
}
