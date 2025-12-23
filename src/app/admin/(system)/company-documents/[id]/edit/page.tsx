import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CompanyDocumentForm } from '@/components/domains/system/company-documents/CompanyDocumentForm';

interface Props {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
  const document = await prisma.companyDocument.findUnique({
    where: { id },
    include: {
      documentType: true,
    },
  });

  return document;
}

export default async function EditCompanyDocumentPage({ params }: Props) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <Link href={`/admin/company-documents/${document.id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Document</h1>
                <p className="text-gray-600">
                  {document.documentType.name}
                </p>
              </div>
            </div>
          </div>

          <CompanyDocumentForm
            mode="edit"
            initialData={{
              id: document.id,
              documentTypeId: document.documentTypeId,
              referenceNumber: document.referenceNumber,
              expiryDate: document.expiryDate,
              documentUrl: document.documentUrl,
              assetId: document.assetId,
              renewalCost: document.renewalCost ? Number(document.renewalCost) : null,
              notes: document.notes,
            }}
          />
        </div>
      </div>
    </div>
  );
}
