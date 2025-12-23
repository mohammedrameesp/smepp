import { CompanyDocumentForm } from '@/components/domains/system/company-documents/CompanyDocumentForm';

export default function NewCompanyDocumentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Company Document</h1>
            <p className="text-gray-600">
              Add a new company or vehicle document for tracking
            </p>
          </div>

          <CompanyDocumentForm mode="create" />
        </div>
      </div>
    </div>
  );
}
