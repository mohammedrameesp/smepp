import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect, notFound } from 'next/navigation';

import {
  Building2,
  Calendar,
  Globe,
  Mail,
  Phone,
  User,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  CreditCard,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { SupplierActions } from '@/features/suppliers';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && !session.user.isAdmin) {
    redirect('/forbidden');
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

  const statusConfig = {
    PENDING: {
      label: 'Pending Review',
      icon: Clock,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-500',
    },
    APPROVED: {
      label: 'Approved',
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-500',
    },
    REJECTED: {
      label: 'Rejected',
      icon: XCircle,
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-500',
    },
  };

  const status = statusConfig[supplier.status];

  const statusBadgeVariant = supplier.status === 'APPROVED' ? 'success' :
    supplier.status === 'REJECTED' ? 'error' :
    supplier.status === 'PENDING' ? 'warning' : 'default';

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={supplier.category}
        breadcrumbs={[
          { label: 'Suppliers', href: '/admin/suppliers' },
          { label: supplier.name },
        ]}
        badge={{ text: status.label, variant: statusBadgeVariant }}
        actions={
          <SupplierActions
            supplierId={supplier.id}
            supplierName={supplier.name}
            supplierCategory={supplier.category}
            supplierCode={supplier.suppCode}
            status={supplier.status}
          />
        }
      >
        {supplier.suppCode && (
          <div className="mt-4">
            <span className="text-sm text-slate-400 font-mono">{supplier.suppCode}</span>
          </div>
        )}
        {!supplier.suppCode && supplier.status === 'PENDING' && (
          <div className="mt-4">
            <span className="text-sm text-slate-400 italic">Code will be assigned on approval</span>
          </div>
        )}
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <DetailCard icon={Building2} iconColor="blue" title="Company Information" subtitle="Business details and location">
            <InfoFieldGrid columns={2}>
              <InfoField label="Category" value={supplier.category} />
              <InfoField label="Established" value={supplier.establishmentYear} />
            </InfoFieldGrid>
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {supplier.address || 'No address provided'}
                  </p>
                  {(supplier.city || supplier.country) && (
                    <p className="text-sm text-slate-600 mt-1">
                      {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {supplier.website && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Website</p>
                </div>
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline mt-1 block"
                >
                  {supplier.website}
                </a>
              </div>
            )}
          </DetailCard>

          {/* Contact Information */}
          <DetailCard icon={User} iconColor="purple" title="Contact Information" subtitle="Primary and secondary contacts">
            <div className="space-y-6">
              {/* Primary Contact */}
              {supplier.primaryContactName ? (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{supplier.primaryContactName}</p>
                      <p className="text-xs text-slate-500">{supplier.primaryContactTitle || 'Primary Contact'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {supplier.primaryContactEmail && (
                      <a
                        href={`mailto:${supplier.primaryContactEmail}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="h-4 w-4 text-slate-400" />
                        {supplier.primaryContactEmail}
                      </a>
                    )}
                    {supplier.primaryContactMobile && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {supplier.primaryContactMobile}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Secondary Contact */}
              {supplier.secondaryContactName && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{supplier.secondaryContactName}</p>
                      <p className="text-xs text-slate-500">{supplier.secondaryContactTitle || 'Secondary Contact'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {supplier.secondaryContactEmail && (
                      <a
                        href={`mailto:${supplier.secondaryContactEmail}`}
                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="h-4 w-4 text-slate-400" />
                        {supplier.secondaryContactEmail}
                      </a>
                    )}
                    {supplier.secondaryContactMobile && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {supplier.secondaryContactMobile}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!supplier.primaryContactName && !supplier.secondaryContactName && (
                <div className="text-center py-8 text-slate-400">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contact information provided</p>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Payment Terms */}
          {supplier.paymentTerms && (
            <DetailCard icon={CreditCard} iconColor="emerald" title="Payment Terms" subtitle="Agreed payment conditions">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">{supplier.paymentTerms}</p>
              </div>
            </DetailCard>
          )}

          {/* Additional Information */}
          {supplier.additionalInfo && (
            <DetailCard icon={FileText} iconColor="amber" title="Additional Information" subtitle="Notes and remarks">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {supplier.additionalInfo}
                </p>
              </div>
            </DetailCard>
          )}
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Approval Information */}
          {supplier.status === 'APPROVED' && supplier.approvedAt && (
            <DetailCard icon={CheckCircle} iconColor="emerald" title="Approval Details">
              <InfoFieldGrid columns={1}>
                <InfoField
                  label="Approved On"
                  value={new Date(supplier.approvedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
                {supplier.approvedBy && (
                  <InfoField label="Approved By" value={supplier.approvedBy.name || supplier.approvedBy.email} />
                )}
              </InfoFieldGrid>
            </DetailCard>
          )}

          {/* Rejection Information */}
          {supplier.status === 'REJECTED' && supplier.rejectionReason && (
            <DetailCard icon={XCircle} iconColor="rose" title="Rejection Details">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-2">Reason</p>
                <p className="text-sm text-rose-700">{supplier.rejectionReason}</p>
              </div>
            </DetailCard>
          )}

          {/* Engagement History */}
          <DetailCard
            icon={MessageSquare}
            iconColor="indigo"
            title="Engagements"
            subtitle={`${supplier.engagements.length} record${supplier.engagements.length !== 1 ? 's' : ''}`}
          >
            {supplier.engagements.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No engagements recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {supplier.engagements.map((engagement) => (
                  <div
                    key={engagement.id}
                    className="bg-slate-50 rounded-xl p-4 border-l-4 border-indigo-400"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(engagement.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
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
                    <p className="text-sm text-slate-700 mb-2">{engagement.notes}</p>
                    <p className="text-xs text-slate-500">
                      By {engagement.createdBy.name || engagement.createdBy.email}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Record Information */}
          <DetailCard icon={Clock} iconColor="slate" title="Record Information">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">
                  {new Date(supplier.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900">
                  {new Date(supplier.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">ID</span>
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                  {supplier.id.slice(-8)}
                </span>
              </div>
            </div>
          </DetailCard>
        </div>
        </div>
      </PageContent>
    </>
  );
}
