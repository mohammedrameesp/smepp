import { notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { PageHeader, PageContent } from '@/components/ui/page-header';
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
    <>
      <PageHeader
        title="Edit Document"
        subtitle={document.documentType.name}
        breadcrumbs={[
          { label: 'Company Documents', href: '/admin/company-documents' },
          { label: document.documentType.name, href: `/admin/company-documents/${document.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-3xl">
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
      </PageContent>
    </>
  );
}
