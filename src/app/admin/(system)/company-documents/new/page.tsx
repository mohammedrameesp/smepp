import { CompanyDocumentForm } from '@/components/domains/system/company-documents/CompanyDocumentForm';
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
