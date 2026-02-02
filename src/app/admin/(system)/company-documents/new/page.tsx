/**
 * @module app/admin/(system)/company-documents/new/page
 * @description Server component page for creating new company documents.
 * Provides a form interface for adding company-wide documents such as licenses,
 * registrations, and vehicle-related documentation with expiry tracking.
 *
 * @dependencies
 * - CompanyDocumentForm: Handles the actual form submission and validation
 * - PageHeader/PageContent: Standard layout components for consistent UI
 *
 * @routes
 * - GET /admin/company-documents/new - Renders the new document form
 *
 * @access Requires authentication (inherited from parent layout)
 */

import { CompanyDocumentForm } from '@/features/company-documents';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default function NewCompanyDocumentPage() {
  return (
    <>
      <PageHeader
        title="Add Company Document"
        subtitle="Add a new company or vehicle document for tracking"
        breadcrumbs={[
          { label: 'Company Documents', href: '/admin/company-documents' },
          { label: 'New Document' },
        ]}
      />

      <PageContent className="max-w-3xl">
        <CompanyDocumentForm mode="create" />
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
 * Overall Assessment: PASS
 * The component follows established patterns and is well-structured.
 *
 * Strengths:
 * 1. Clean separation of concerns - delegates form logic to CompanyDocumentForm
 * 2. Consistent use of PageHeader/PageContent layout pattern
 * 3. Proper breadcrumb navigation for user orientation
 * 4. Appropriate max-width constraint for form readability
 *
 * Potential Improvements:
 * 1. Consider adding metadata export for page title/description (Next.js SEO)
 * 2. No explicit auth check in this component (relies on parent layout)
 *
 * Security: No concerns - authentication handled by parent route layout
 * Performance: Minimal - simple render with no data fetching
 * Maintainability: Good - follows DRY principles via shared form component
 */
