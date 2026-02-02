/**
 * @module app/employee/(operations)/suppliers/page
 * @description Employee supplier directory page. Displays all approved company suppliers
 * in a searchable, filterable table. Shows aggregate statistics including total suppliers,
 * engagement counts, and category diversity. Read-only view without admin actions.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { EmployeeSupplierListTable } from '@/features/suppliers';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Building2, Users, FolderOpen } from 'lucide-react';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ICON_SIZES } from '@/lib/constants';
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
            icon={<Building2 className={ICON_SIZES.sm} />}
          />
          <StatChip
            value={totalEngagements}
            label="engagements"
            color="emerald"
            icon={<Users className={ICON_SIZES.sm} />}
          />
          <StatChip
            value={uniqueCategories}
            label="categories"
            color="purple"
            icon={<FolderOpen className={ICON_SIZES.sm} />}
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Server component for employee supplier directory. Displays all approved suppliers
 * with aggregate statistics and search/filter capabilities via the table component.
 *
 * Key Features:
 * - Fetches only APPROVED suppliers (filters out pending/rejected)
 * - Includes engagement count per supplier via Prisma _count
 * - Calculates aggregate stats: total suppliers, total engagements, unique categories
 * - Renders searchable/filterable table via EmployeeSupplierListTable
 *
 * Critical Logic:
 * - Session validation with redirect to login if unauthenticated
 * - Supplier query filters by status: 'APPROVED' only
 * - Set-based unique category counting for stat chip
 *
 * Edge Cases Handled:
 * - Empty supplier list shows friendly empty state with emoji
 * - Session check prevents unauthorized access
 *
 * Potential Issues:
 * - No tenant filtering in query - relies on Prisma extension for multi-tenancy
 * - No pagination for large supplier lists (could cause performance issues)
 * - Empty state uses emoji which may not render consistently across platforms
 * - No error handling for database query failures
 *
 * Security Considerations:
 * - Server-side session validation before data fetch
 * - Read-only access - no mutation endpoints exposed
 * - Only approved suppliers visible to employees
 *
 * Performance:
 * - Single database query with include for count aggregation
 * - Server component - no client-side hydration overhead
 * - Consider adding pagination for orgs with many suppliers
 */
