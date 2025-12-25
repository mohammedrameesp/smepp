import { Suspense } from 'react';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCheck, AlertTriangle, Clock, CheckCircle, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/lib/domains/system/company-documents/document-utils';

async function getCompanyDocuments() {
  const documents = await prisma.companyDocument.findMany({
    orderBy: { expiryDate: 'asc' },
    include: {
      documentType: true,
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

async function getDocumentStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  const [total, expired, expiring] = await Promise.all([
    prisma.companyDocument.count(),
    prisma.companyDocument.count({ where: { expiryDate: { lt: today } } }),
    prisma.companyDocument.count({
      where: { expiryDate: { gte: today, lte: warningDate } },
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

async function DocumentList() {
  const documents = await getCompanyDocuments();
  const stats = await getDocumentStats();

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm font-medium">Total Documents</p>
            <p className="text-xs text-white/70">All registered</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-rose-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{stats.expired}</span>
            </div>
            <p className="text-sm font-medium">Expired</p>
            <p className="text-xs text-white/70">Need renewal</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{stats.expiring}</span>
            </div>
            <p className="text-sm font-medium">Expiring Soon</p>
            <p className="text-xs text-white/70">Next {DOCUMENT_EXPIRY_WARNING_DAYS} days</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{stats.valid}</span>
            </div>
            <p className="text-sm font-medium">Valid</p>
            <p className="text-xs text-white/70">Up to date</p>
          </div>
        </div>
      </div>

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
                        <div className="font-medium text-slate-900">{doc.documentType.name}</div>
                        <div className="text-xs text-slate-500">
                          {doc.documentType.category}
                          {doc.asset && ` • ${doc.asset.assetTag || doc.asset.brand}`}
                        </div>
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

export default function CompanyDocumentsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Documents</h1>
          <p className="text-slate-500 text-sm">Track licenses, registrations, and vehicle documents</p>
        </div>
        <Link
          href="/admin/company-documents/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </Link>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }>
        <DocumentList />
      </Suspense>
    </div>
  );
}
