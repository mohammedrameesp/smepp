// Employee supplier detail page - read-only view without admin actions

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/employee/suppliers">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
                {getStatusBadge(supplier.status)}
              </div>
              <p className="text-gray-600">
                Supplier Code: <span className="font-semibold">{supplier.suppCode || <span className="italic text-gray-400">Not assigned</span>}</span>
              </p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium">{supplier.category}</p>
              </div>
              <div>
                <p className="text-gray-500">Establishment Year</p>
                <p className="font-medium">{supplier.establishmentYear || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium">{supplier.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">City</p>
                <p className="font-medium">{supplier.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Country</p>
                <p className="font-medium">{supplier.country || 'N/A'}</p>
              </div>
              {supplier.website && (
                <div className="col-span-2">
                  <p className="text-gray-500 flex items-center gap-1">
                    <Globe className="h-4 w-4" /> Website
                  </p>
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Contact */}
              {supplier.primaryContactName && (
                <div className="pb-4 border-b">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Primary Contact</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="font-medium">{supplier.primaryContactName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Title</p>
                      <p className="font-medium">{supplier.primaryContactTitle || 'N/A'}</p>
                    </div>
                    {supplier.primaryContactEmail && (
                      <div className="col-span-2">
                        <p className="text-gray-500 flex items-center gap-1">
                          <Mail className="h-4 w-4" /> Email
                        </p>
                        <a
                          href={`mailto:${supplier.primaryContactEmail}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {supplier.primaryContactEmail}
                        </a>
                      </div>
                    )}
                    {supplier.primaryContactMobile && (
                      <div className="col-span-2">
                        <p className="text-gray-500 flex items-center gap-1">
                          <Phone className="h-4 w-4" /> Mobile
                        </p>
                        <p className="font-medium">{supplier.primaryContactMobile}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secondary Contact */}
              {supplier.secondaryContactName && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Secondary Contact</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="font-medium">{supplier.secondaryContactName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Title</p>
                      <p className="font-medium">{supplier.secondaryContactTitle || 'N/A'}</p>
                    </div>
                    {supplier.secondaryContactEmail && (
                      <div className="col-span-2">
                        <p className="text-gray-500 flex items-center gap-1">
                          <Mail className="h-4 w-4" /> Email
                        </p>
                        <a
                          href={`mailto:${supplier.secondaryContactEmail}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {supplier.secondaryContactEmail}
                        </a>
                      </div>
                    )}
                    {supplier.secondaryContactMobile && (
                      <div className="col-span-2">
                        <p className="text-gray-500 flex items-center gap-1">
                          <Phone className="h-4 w-4" /> Mobile
                        </p>
                        <p className="font-medium">{supplier.secondaryContactMobile}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!supplier.primaryContactName && !supplier.secondaryContactName && (
                <p className="text-sm text-gray-500">No contact information provided</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Terms */}
          {supplier.paymentTerms && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{supplier.paymentTerms}</p>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {supplier.additionalInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{supplier.additionalInfo}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approval Information */}
          {supplier.status === 'APPROVED' && supplier.approvedAt && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Approved On</p>
                  <p className="font-medium">
                    {new Date(supplier.approvedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {supplier.approvedBy && (
                  <div>
                    <p className="text-gray-500">Approved By</p>
                    <p className="font-medium">
                      {supplier.approvedBy.name || supplier.approvedBy.email}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Engagement History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Engagement History
              </CardTitle>
              <CardDescription>
                {supplier.engagements.length} engagement{supplier.engagements.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplier.engagements.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No engagements recorded</p>
              ) : (
                <div className="space-y-4">
                  {supplier.engagements.map((engagement) => (
                    <div key={engagement.id} className="border-l-2 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium">
                          {new Date(engagement.date).toLocaleDateString()}
                        </p>
                        {engagement.rating && (
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, index) => (
                              <Star
                                key={index}
                                className={`h-3.5 w-3.5 ${
                                  index < engagement.rating!
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{engagement.notes}</p>
                      <p className="text-xs text-gray-500">
                        By {engagement.createdBy.name || engagement.createdBy.email}
                      </p>
                    </div>
                  ))}
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
