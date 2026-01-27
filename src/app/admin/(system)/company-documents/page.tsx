import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCheck, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getQatarStartOfDay } from '@/lib/core/datetime';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/features/company-documents';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

async function getCompanyDocuments(tenantId: string) {
  const documents = await prisma.companyDocument.findMany({
    where: { tenantId },
    orderBy: { expiryDate: 'asc' },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          brand: true,
          model: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return documents.map(doc => ({
    ...doc,
    expiryInfo: getDocumentExpiryInfo(doc.expiryDate),
  }));
}

async function getDocumentStats(tenantId: string) {
  const today = getQatarStartOfDay();
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  const [total, expired, expiring] = await Promise.all([
    prisma.companyDocument.count({ where: { tenantId } }),
    prisma.companyDocument.count({ where: { tenantId, expiryDate: { lt: today } } }),
    prisma.companyDocument.count({
      where: { tenantId, expiryDate: { gte: today, lte: warningDate } },
    }),
  ]);

  return { total, expired, expiring, valid: total - expired - expiring };
}

function ExpiryBadge({ status, daysRemaining }: { status: string; daysRemaining: number }) {
  if (status === 'expired') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired {Math.abs(daysRemaining)}d ago
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
        <Clock className="h-3 w-3" />
        {daysRemaining}d left
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
      <CheckCircle className="h-3 w-3" />
      Valid
    </Badge>
  );
}

async function DocumentList({ tenantId }: { tenantId: string }) {
  const documents = await getCompanyDocuments(tenantId);
  await getDocumentStats(tenantId);

  return (
    <>
      {/* Stats Summary in header is handled by parent */}

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Documents</h2>
          <p className="text-sm text-slate-500">Company and vehicle documents with expiry tracking</p>
        </div>
        <div className="p-4">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">No documents yet</h3>
              <p className="text-slate-500 text-sm mb-4">Add your first company document to get started</p>
              <Link href="/admin/company-documents/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-slate-600 text-sm">Document Type</th>
                    <th className="pb-3 font-medium text-slate-600 text-sm">Reference</th>
                    <th className="pb-3 font-medium text-slate-600 text-sm">Expiry Date</th>
                    <th className="pb-3 font-medium text-slate-600 text-sm">Status</th>
                    <th className="pb-3 font-medium text-slate-600 text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3">
                        <div className="font-medium text-slate-900">{doc.documentTypeName}</div>
                        {doc.asset && (
                          <div className="text-xs text-slate-500">
                            {doc.asset.assetTag || doc.asset.brand}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {doc.referenceNumber || '-'}
                      </td>
                      <td className="py-3 text-sm text-slate-600">
                        {format(new Date(doc.expiryDate), 'dd MMM yyyy')}
                      </td>
                      <td className="py-3">
                        <ExpiryBadge
                          status={doc.expiryInfo.status}
                          daysRemaining={doc.expiryInfo.daysRemaining}
                        />
                      </td>
                      <td className="py-3">
                        <Link href={`/admin/company-documents/${doc.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

async function DocumentStats({ tenantId }: { tenantId: string }) {
  const stats = await getDocumentStats(tenantId);

  return (
    <StatChipGroup>
      <StatChip value={stats.total} label="total" color="blue" />
      <StatChip
        value={stats.expired}
        label="expired"
        color="rose"
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        hideWhenZero
      />
      <StatChip
        value={stats.expiring}
        label="expiring soon"
        color="amber"
        icon={<Clock className="h-3.5 w-3.5" />}
        hideWhenZero
      />
      <StatChip
        value={stats.valid}
        label="valid"
        color="emerald"
        icon={<CheckCircle className="h-3.5 w-3.5" />}
      />
    </StatChipGroup>
  );
}

export default async function CompanyDocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with any department access
  const hasAccess = session.user.isAdmin ||
                    session.user.hasFinanceAccess ||
                    session.user.hasHRAccess ||
                    session.user.hasOperationsAccess ||
                    session.user.canApprove;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  return (
    <>
      <PageHeader
        title="Company Documents"
        subtitle="Track licenses, registrations, and vehicle documents"
        actions={
          <PageHeaderButton href="/admin/company-documents/new" variant="primary">
            <Plus className="h-4 w-4" />
            Add Document
          </PageHeaderButton>
        }
      >
        <Suspense fallback={<div className="h-8" />}>
          <DocumentStats tenantId={tenantId} />
        </Suspense>
      </PageHeader>

      <PageContent>
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }>
          <DocumentList tenantId={tenantId} />
        </Suspense>
      </PageContent>
    </>
  );
}
