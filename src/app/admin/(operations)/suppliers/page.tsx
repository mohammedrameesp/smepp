/**
 * @file page.tsx
 * @description Admin suppliers list page - displays all suppliers with statistics
 * @module app/admin/(operations)/suppliers
 *
 * Features:
 * - Supplier statistics (total, approved, pending, categories, engagements)
 * - Supplier list with filtering and search
 * - Share supplier registration link functionality
 * - Register new supplier action
 *
 * Security:
 * - Requires authenticated session or impersonation
 * - Requires operations access permission
 * - All queries are tenant-scoped
 */

import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/core/impersonation-check';

import { SupplierListClient, ShareSupplierLinkButton } from '@/features/suppliers';
import { Plus } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

/**
 * Admin suppliers list page component
 * Fetches supplier statistics and renders the supplier management interface
 */
export default async function AdminSuppliersPage(): Promise<React.JSX.Element> {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (operations access required)
  if (!hasAccess(auth, 'operations')) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  let totalSuppliers = 0;
  let approvedSuppliers = 0;
  let pendingSuppliers = 0;
  let uniqueCategories = 0;
  let totalEngagements = 0;
  let organizationSlug: string | undefined;

  try {
    const [organization, suppliersCount, approvedCount, pendingCount, categories, engagementsCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      }),
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
    organizationSlug = organization?.slug;
    totalSuppliers = suppliersCount;
    approvedSuppliers = approvedCount;
    pendingSuppliers = pendingCount;
    uniqueCategories = categories.length;
    totalEngagements = engagementsCount;
  } catch {
    // Statistics fetch failed - continue with default values (zeros)
    // The page will still render with the supplier list
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Manage vendor registrations and engagements"
        actions={
          <>
            {organizationSlug && (
              <ShareSupplierLinkButton organizationSlug={organizationSlug} />
            )}
            <PageHeaderButton href="/suppliers/register" variant="primary">
              <Plus className={ICON_SIZES.sm} />
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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 * - Added JSDoc module documentation at top of file
 * - Added function return type annotation
 * - Removed console.error in catch block (statistics failure is non-critical)
 * - Added inline comments explaining error handling behavior
 * Issues: None - tenant isolation properly implemented with tenantId filtering
 */
