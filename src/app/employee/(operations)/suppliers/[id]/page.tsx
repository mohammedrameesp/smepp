// Employee supplier detail page - read-only view without admin actions

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Globe,
  Mail,
  Phone,
  User,
  Star,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeSupplierDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      engagements: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      },
    },
  });

  if (!supplier) {
    notFound();
  }

  const getStatusBadge = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
    };

    return (
      <Badge className={styles[status]} variant="outline">
        {status}
      </Badge>
    );
  };

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.category} - ${supplier.suppCode || 'No code assigned'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Suppliers', href: '/employee/suppliers' },
          { label: supplier.name }
        ]}
        actions={
          <PageHeaderButton href="/employee/suppliers" variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to Suppliers
          </PageHeaderButton>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {getStatusBadge(supplier.status)}
          {supplier.engagements.length > 0 && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              {supplier.engagements.length} engagement{supplier.engagements.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </PageHeader>

      <PageContent>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <DetailCard icon={Building2} iconColor="purple" title="Company Information" subtitle="Supplier details and location">
            <InfoFieldGrid columns={2}>
              <InfoField label="Category" value={supplier.category} />
              <InfoField label="Establishment Year" value={supplier.establishmentYear || 'N/A'} />
              <div className="col-span-2">
                <InfoField label="Address" value={supplier.address || 'N/A'} />
              </div>
              <InfoField label="City" value={supplier.city || 'N/A'} />
              <InfoField label="Country" value={supplier.country || 'N/A'} />
              {supplier.website && (
                <div className="col-span-2 p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </p>
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              )}
            </InfoFieldGrid>
          </DetailCard>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Contact Information</h2>
                <p className="text-sm text-slate-500">Primary and secondary contacts</p>
              </div>
            </div>
            <div className="p-5 space-y-6">
              {/* Primary Contact */}
              {supplier.primaryContactName && (
                <div className="pb-6 border-b border-slate-200">
                  <p className="text-sm font-semibold text-rose-700 mb-3">Primary Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Name</p>
                      <p className="font-semibold text-slate-900">{supplier.primaryContactName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Title</p>
                      <p className="font-semibold text-slate-900">{supplier.primaryContactTitle || 'N/A'}</p>
                    </div>
                    {supplier.primaryContactEmail && (
                      <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </p>
                        <a
                          href={`mailto:${supplier.primaryContactEmail}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {supplier.primaryContactEmail}
                        </a>
                      </div>
                    )}
                    {supplier.primaryContactMobile && (
                      <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Mobile
                        </p>
                        <p className="font-semibold text-slate-900">{supplier.primaryContactMobile}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secondary Contact */}
              {supplier.secondaryContactName && (
                <div>
                  <p className="text-sm font-semibold text-rose-700 mb-3">Secondary Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Name</p>
                      <p className="font-semibold text-slate-900">{supplier.secondaryContactName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Title</p>
                      <p className="font-semibold text-slate-900">{supplier.secondaryContactTitle || 'N/A'}</p>
                    </div>
                    {supplier.secondaryContactEmail && (
                      <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </p>
                        <a
                          href={`mailto:${supplier.secondaryContactEmail}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {supplier.secondaryContactEmail}
                        </a>
                      </div>
                    )}
                    {supplier.secondaryContactMobile && (
                      <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Mobile
                        </p>
                        <p className="font-semibold text-slate-900">{supplier.secondaryContactMobile}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!supplier.primaryContactName && !supplier.secondaryContactName && (
                <p className="text-sm text-slate-500 text-center py-4">No contact information provided</p>
              )}
            </div>
          </div>

          {/* Payment Terms */}
          {supplier.paymentTerms && (
            <DetailCard icon={FileText} iconColor="emerald" title="Payment Terms" subtitle="Contract and payment details">
              <p className="text-sm text-slate-700 leading-relaxed">{supplier.paymentTerms}</p>
            </DetailCard>
          )}

          {/* Additional Information */}
          {supplier.additionalInfo && (
            <DetailCard icon={FileText} iconColor="blue" title="Additional Information" subtitle="Notes and remarks">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{supplier.additionalInfo}</p>
            </DetailCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Information */}
          {supplier.status === 'APPROVED' && supplier.approvedAt && (
            <DetailCard icon={CheckCircle} iconColor="emerald" title="Approval Information" subtitle="Supplier approval details">
              <InfoFieldGrid columns={1}>
                <InfoField
                  label="Approved On"
                  value={new Date(supplier.approvedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  size="sm"
                />
                {supplier.approvedBy && (
                  <InfoField label="Approved By" value={supplier.approvedBy.name || supplier.approvedBy.email} size="sm" />
                )}
              </InfoFieldGrid>
            </DetailCard>
          )}

          {/* Engagement History */}
          <DetailCard icon={Calendar} iconColor="slate" title="Engagement History" subtitle={`${supplier.engagements.length} engagement${supplier.engagements.length !== 1 ? 's' : ''}`}>
            {supplier.engagements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No engagements recorded</p>
            ) : (
              <div className="space-y-4">
                {supplier.engagements.map((engagement) => (
                  <div key={engagement.id} className="border-l-2 border-indigo-500 pl-4 py-2">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(engagement.date).toLocaleDateString()}
                      </p>
                      {engagement.rating && (
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, index) => (
                            <Star
                              key={index}
                              className={`h-3.5 w-3.5 ${
                                index < engagement.rating!
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mb-2 leading-relaxed">{engagement.notes}</p>
                    <p className="text-xs text-slate-500">
                      By {engagement.createdBy?.name || engagement.createdBy?.email || 'Unknown'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
      </PageContent>
    </>
  );
}
