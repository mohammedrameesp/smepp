import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Edit,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  DollarSign,
  Car,
  User,
  Link as LinkIcon,
} from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { format } from 'date-fns';
import { getDocumentExpiryInfo } from '@/lib/domains/system/company-documents/document-utils';

interface Props {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
  const document = await prisma.companyDocument.findUnique({
    where: { id },
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

  if (!document) return null;

  return {
    ...document,
    expiryInfo: getDocumentExpiryInfo(document.expiryDate),
  };
}

function ExpiryStatusBadge({ status, daysRemaining }: { status: string; daysRemaining: number }) {
  if (status === 'expired') {
    return (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200 border gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        Expired {Math.abs(daysRemaining)} days ago
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 border gap-1.5">
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        {daysRemaining} days remaining
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border gap-1.5">
      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
      Valid ({daysRemaining} days)
    </Badge>
  );
}

export default async function CompanyDocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  const statusBadgeVariant = document.expiryInfo.status === 'expired' ? 'error' :
    document.expiryInfo.status === 'expiring' ? 'warning' : 'success';

  return (
    <>
      <PageHeader
        title={document.documentTypeName}
        breadcrumbs={[
          { label: 'Company Documents', href: '/admin/company-documents' },
          { label: document.documentTypeName },
        ]}
        badge={{
          text: document.expiryInfo.status === 'expired'
            ? `Expired ${Math.abs(document.expiryInfo.daysRemaining)}d ago`
            : document.expiryInfo.status === 'expiring'
            ? `${document.expiryInfo.daysRemaining}d left`
            : 'Valid',
          variant: statusBadgeVariant
        }}
        actions={
          <PageHeaderButton href={`/admin/company-documents/${document.id}/edit`} variant="primary">
            <Edit className="h-4 w-4" />
            Edit Document
          </PageHeaderButton>
        }
      >
        {document.referenceNumber && (
          <div className="mt-4">
            <span className="text-sm text-slate-400 font-mono">{document.referenceNumber}</span>
          </div>
        )}
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Document Details</h2>
                <p className="text-sm text-slate-500">Core document information</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Document Type</p>
                  <p className="text-sm font-semibold text-slate-900">{document.documentTypeName}</p>
                </div>
                {document.referenceNumber && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reference Number</p>
                    <p className="text-lg font-bold text-slate-900 font-mono">{document.referenceNumber}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Expiry Date</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(new Date(document.expiryDate), 'dd MMMM yyyy')}
                  </p>
                </div>
                <div className="sm:col-span-2 bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status</p>
                  <ExpiryStatusBadge
                    status={document.expiryInfo.status}
                    daysRemaining={document.expiryInfo.daysRemaining}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Additional Information</h2>
                <p className="text-sm text-slate-500">Linked items and costs</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {document.asset && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Linked Vehicle</p>
                  </div>
                  <Link
                    href={`/admin/assets/${document.asset.id}`}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    {document.asset.assetTag || `${document.asset.brand} ${document.asset.model}`}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {document.renewalCost && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Renewal Cost</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {Number(document.renewalCost).toLocaleString()} QAR
                  </p>
                </div>
              )}

              {document.documentUrl && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Document File</p>
                  </div>
                  <a
                    href={document.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    View Document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {document.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{document.notes}</p>
                </div>
              )}

              {!document.asset && !document.renewalCost && !document.documentUrl && !document.notes && (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No additional information provided</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Expiry Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                document.expiryInfo.status === 'expired'
                  ? 'bg-rose-50'
                  : document.expiryInfo.status === 'expiring'
                  ? 'bg-amber-50'
                  : 'bg-emerald-50'
              }`}>
                {document.expiryInfo.status === 'expired' ? (
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                ) : document.expiryInfo.status === 'expiring' ? (
                  <Clock className="h-5 w-5 text-amber-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <h2 className="font-semibold text-slate-900">Expiry Status</h2>
            </div>
            <div className="p-6">
              <div className={`rounded-xl p-6 text-center border ${
                document.expiryInfo.status === 'expired'
                  ? 'bg-rose-50 border-rose-200'
                  : document.expiryInfo.status === 'expiring'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <p className={`text-4xl font-bold ${
                  document.expiryInfo.status === 'expired'
                    ? 'text-rose-600'
                    : document.expiryInfo.status === 'expiring'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}>
                  {Math.abs(document.expiryInfo.daysRemaining)}
                </p>
                <p className={`text-sm mt-1 ${
                  document.expiryInfo.status === 'expired'
                    ? 'text-rose-600'
                    : document.expiryInfo.status === 'expiring'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}>
                  {document.expiryInfo.status === 'expired' ? 'days overdue' : 'days remaining'}
                </p>
              </div>
              <p className="text-center text-sm text-slate-500 mt-4">
                Expires on {format(new Date(document.expiryDate), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>

          {/* Record Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Record Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created By</p>
                <p className="text-sm font-semibold text-slate-900">{document.createdBy.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(new Date(document.createdAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              {document.updatedAt > document.createdAt && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {format(new Date(document.updatedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/admin/company-documents/${document.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </Link>
              </Button>
              {document.asset && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/admin/assets/${document.asset.id}`}>
                    <Car className="mr-2 h-4 w-4" />
                    View Linked Vehicle
                  </Link>
                </Button>
              )}
              {document.documentUrl && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={document.documentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Document File
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
