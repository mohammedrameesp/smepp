import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewPurchaseRequestLoading() {
  return (
    <>
      <PageHeader
        title="New Spend Request"
        subtitle="Fill in the details below to submit a new spend request"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests', href: '/employee/purchase-requests' },
          { label: 'New Request' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      />

      <PageContent className="max-w-4xl">
        <div className="space-y-6">
          {/* Form Sections */}
          {[1, 2, 3, 4, 5].map((section) => (
            <div key={section} className="bg-white rounded-2xl border border-slate-200 p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />

              <div className="space-y-4">
                {[1, 2, 3].map((field) => (
                  <div key={field} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </PageContent>
    </>
  );
}
