import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, ExternalLink, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getDocumentExpiryInfo } from '@/lib/domains/system/company-documents/document-utils';

interface Props {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
  const document = await prisma.companyDocument.findUnique({
    where: { id },
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

  if (!document) return null;

  return {
    ...document,
    expiryInfo: getDocumentExpiryInfo(document.expiryDate),
  };
}

function ExpiryBadge({ status, daysRemaining }: { status: string; daysRemaining: number }) {
  if (status === 'expired') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired {Math.abs(daysRemaining)} days ago
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
        <Clock className="h-3 w-3" />
        {daysRemaining} days remaining
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
      <CheckCircle className="h-3 w-3" />
      Valid ({daysRemaining} days remaining)
    </Badge>
  );
}

export default async function CompanyDocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/company-documents">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{document.documentType.name}</h1>
                  <p className="text-gray-600">
                    {document.documentType.category} Document
                  </p>
                </div>
              </div>
              <Link href={`/admin/company-documents/${document.id}/edit`}>
                <Button>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
        {/* Document Details */}
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Document Type</p>
              <p className="text-lg">{document.documentType.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <Badge variant="outline">{document.documentType.category}</Badge>
            </div>

            {document.referenceNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                <p className="text-lg font-mono">{document.referenceNumber}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
              <p className="text-lg">{format(new Date(document.expiryDate), 'dd MMMM yyyy')}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <ExpiryBadge
                  status={document.expiryInfo.status}
                  daysRemaining={document.expiryInfo.daysRemaining}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.asset && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Linked Vehicle</p>
                <Link href={`/admin/assets/${document.asset.id}`} className="text-blue-600 hover:underline flex items-center gap-1">
                  {document.asset.assetTag || `${document.asset.brand} ${document.asset.model}`}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {document.renewalCost && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Renewal Cost</p>
                <p className="text-lg font-medium">
                  {Number(document.renewalCost).toLocaleString()} QAR
                </p>
              </div>
            )}

            {document.documentUrl && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Document File</p>
                <a
                  href={document.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  View Document
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {document.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{document.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Created By</p>
              <p>{document.createdBy.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(document.createdAt), 'dd MMM yyyy HH:mm')}
              </p>
            </div>

            {document.updatedAt > document.createdAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(document.updatedAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
