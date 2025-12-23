import { Suspense } from 'react';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Documents</p>
          </CardContent>
        </Card>
        <Card className={stats.expired > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.expired > 0 ? 'text-red-600' : ''}`}>
              {stats.expired}
            </div>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        <Card className={stats.expiring > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.expiring > 0 ? 'text-yellow-600' : ''}`}>
              {stats.expiring}
            </div>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <p className="text-sm text-muted-foreground">Valid</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            Company and vehicle documents with expiry tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm mt-1">Add your first company document to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Document Type</th>
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Expiry Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="font-medium">{doc.documentType.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.documentType.category}
                          {doc.asset && ` • ${doc.asset.assetTag || doc.asset.brand}`}
                        </div>
                      </td>
                      <td className="py-3 text-sm">
                        {doc.referenceNumber || '-'}
                      </td>
                      <td className="py-3 text-sm">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function CompanyDocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Documents</h1>
                <p className="text-gray-600">
                  Track company licenses, registrations, and vehicle documents
                </p>
              </div>
              <Link href="/admin/company-documents/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </Button>
              </Link>
            </div>
          </div>

          <Suspense fallback={<div>Loading documents...</div>}>
            <DocumentList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
