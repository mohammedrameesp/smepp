import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import {
  Briefcase,
  Calendar,
  User,
  Building2,
  FileText,
  Clock,
  ShoppingCart,
  CheckCircle,
  PauseCircle,
  XCircle,
  PlayCircle,
  Target,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';

interface Props {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  PLANNING: {
    label: 'Planning',
    icon: Target,
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    iconColor: 'text-slate-500',
  },
  ACTIVE: {
    label: 'Active',
    icon: PlayCircle,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  ON_HOLD: {
    label: 'On Hold',
    icon: PauseCircle,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    iconColor: 'text-rose-500',
  },
};

const clientTypeLabels = {
  INTERNAL: 'Internal Project',
  EXTERNAL: 'External Client',
  SUPPLIER: 'Supplier Project',
};

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true } },
      _count: {
        select: {
          purchaseRequests: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.PLANNING;
  const StatusIcon = status.icon;
  const statusBadgeVariant = project.status === 'ACTIVE' ? 'success' :
    project.status === 'ON_HOLD' ? 'warning' :
    project.status === 'COMPLETED' ? 'info' :
    project.status === 'CANCELLED' ? 'error' : 'default';

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`${project.code} • ${clientTypeLabels[project.clientType as keyof typeof clientTypeLabels] || project.clientType}`}
        breadcrumbs={[
          { label: 'Projects', href: '/admin/projects' },
          { label: project.name },
        ]}
        badge={{ text: status.label, variant: statusBadgeVariant }}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/projects/${project.id}/edit`}>
                Edit Project
              </Link>
            </Button>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Project Details</h2>
                <p className="text-sm text-slate-500">Core project information</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Project Code</p>
                  <p className="text-lg font-bold text-slate-900 font-mono">{project.code}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Status</p>
                  <Badge
                    className={`${status.bgColor} ${status.textColor} ${status.borderColor} border gap-1.5 mt-1`}
                  >
                    <StatusIcon className={`h-3.5 w-3.5 ${status.iconColor}`} />
                    {status.label}
                  </Badge>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Manager</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {project.manager?.name || project.manager?.email || 'Not assigned'}
                  </p>
                </div>
                {project.documentHandler && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Document Handler</p>
                    <p className="text-sm font-semibold text-slate-900">{project.documentHandler}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Client Type</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {clientTypeLabels[project.clientType as keyof typeof clientTypeLabels] || project.clientType}
                  </p>
                </div>
                {project.clientType === 'SUPPLIER' && project.supplier && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Supplier</p>
                    <p className="text-sm font-semibold text-slate-900">{project.supplier.name}</p>
                  </div>
                )}
                {project.clientType === 'EXTERNAL' && (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Client Name</p>
                      <p className="text-sm font-semibold text-slate-900">{project.clientName || 'Not specified'}</p>
                    </div>
                    {project.clientContact && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Client Contact</p>
                        <p className="text-sm font-semibold text-slate-900">{project.clientContact}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {project.description && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Description</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Timeline</h2>
                <p className="text-sm text-slate-500">Project schedule</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Start Date</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(project.startDate, 'Not set')}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">End Date</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(project.endDate, 'Not set')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Related Items */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Related Items</h2>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                <p className="text-4xl font-bold text-purple-600">{project._count.purchaseRequests}</p>
                <p className="text-purple-600 text-sm mt-1">Purchase Requests</p>
              </div>
              {project._count.purchaseRequests > 0 && (
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href={`/admin/purchase-requests?projectId=${project.id}`}>
                    View Purchase Requests
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">System Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created By</p>
                <p className="text-sm font-semibold text-slate-900">
                  {project.createdBy?.name || project.createdBy?.email || 'Unknown'}
                </p>
                <p className="text-xs text-slate-500 mt-1">{formatDateTime(project.createdAt)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-slate-900">{formatDateTime(project.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/admin/projects/${project.id}/edit`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Edit Project
                </Link>
              </Button>
              {project.manager && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/admin/employees/${project.manager.id}`}>
                    <User className="mr-2 h-4 w-4" />
                    View Project Manager
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
