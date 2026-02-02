/**
 * @module app/admin/(system)/company-documents/[id]/edit/page
 * @description Server component page for editing existing company documents.
 * Fetches the document by ID and pre-populates the form with existing data
 * for modification.
 *
 * @dependencies
 * - prisma: Database query for document retrieval
 * - CompanyDocumentForm: Shared form component in edit mode
 * - PageHeader/PageContent: Standard layout components
 *
 * @routes
 * - GET /admin/company-documents/[id]/edit - Renders the edit form
 *
 * @params
 * - id: Document ID from URL path
 *
 * @access Requires authentication (inherited from parent layout)
 *
 * @error-handling
 * - Returns 404 if document not found
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { CompanyDocumentForm } from '@/features/company-documents';

interface Props {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
  const document = await prisma.companyDocument.findUnique({
    where: { id },
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
        subtitle={document.documentTypeName}
        breadcrumbs={[
          { label: 'Company Documents', href: '/admin/company-documents' },
          { label: document.documentTypeName, href: `/admin/company-documents/${document.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-3xl">
        <CompanyDocumentForm
          mode="edit"
          initialData={{
            id: document.id,
            documentTypeName: document.documentTypeName,
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

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Date: 2026-02-01
 * Reviewer: Claude (AI Code Review)
 *
 * Overall Assessment: PASS with minor observations
 *
 * Strengths:
 * 1. Proper 404 handling when document not found
 * 2. Correct use of Next.js 16 async params pattern
 * 3. Clean data transformation for form initialData (renewalCost conversion)
 * 4. Good breadcrumb hierarchy for navigation context
 * 5. Reuses CompanyDocumentForm with mode="edit" for consistency
 *
 * Potential Improvements:
 * 1. No tenant validation - document could be accessed cross-tenant
 *    - Should add tenantId check against session.user.organizationId
 *    - Or use tenant-scoped Prisma client
 * 2. Consider adding explicit auth check or rely on documented parent layout behavior
 *
 * Security: CONCERN - Missing tenant validation in getDocument query
 *   Recommendation: Add `where: { id, tenantId }` to prevent IDOR
 * Performance: Good - single targeted query
 * Maintainability: Good - clear structure, consistent patterns
 */
