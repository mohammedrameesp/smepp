import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { Edit, User, AlertTriangle, Package, CreditCard, FileText, Calendar, Clock, Mail, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { EmployeeHRViewSection } from '@/components/domains/hr/employees';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import {
  UserSubscriptionHistory,
  UserAssetHistory,
  DeleteUserButton,
  ExportUserPDFButton,
  RestoreUserButton
} from '@/components/domains/system/users';
import { EmployeeLeaveSection } from '@/components/domains/hr/employees';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    include: {
      hrProfile: true,
      _count: {
        select: {
          assets: true,
          subscriptions: true,
        },
      },
    },
  });

  // Check soft-delete status
  const isDeleted = employee?.isDeleted || false;
  const scheduledDeletionAt = employee?.scheduledDeletionAt;
  const daysUntilDeletion = scheduledDeletionAt
    ? Math.ceil((new Date(scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!employee) {
    notFound();
  }

  const hr = employee.hrProfile;

  // Get asset and subscription history
  const subscriptionHistory = await getUserSubscriptionHistory(id);
  const assetHistory = await getUserAssetHistory(id);

  // Calculate profile completion
  const requiredFields = [
    'dateOfBirth', 'gender', 'nationality', 'qatarMobile',
    'localEmergencyName', 'localEmergencyPhone',
    'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry',
    'designation',
  ];

  let filledFields = 0;
  if (hr) {
    requiredFields.forEach((field) => {
      if (hr[field as keyof typeof hr]) filledFields++;
    });
  }
  const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-100 text-rose-700';
      case 'EMPLOYEE':
      case 'TEMP_STAFF':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const isSelf = session.user.id === employee.id;
  const roleBadgeVariant = employee.role === 'ADMIN' ? 'error' :
    ['EMPLOYEE', 'TEMP_STAFF'].includes(employee.role) ? 'info' : 'default';

  return (
    <>
      <PageHeader
        title={employee.name || 'No name'}
        subtitle={employee.email}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: employee.name || employee.email },
        ]}
        badge={{ text: employee.role, variant: roleBadgeVariant }}
        actions={
          <div className="flex gap-2 flex-wrap">
            <ExportUserPDFButton
              userId={employee.id}
              userName={employee.name || ''}
              userEmail={employee.email}
            />
            <PageHeaderButton href={`/admin/employees/${id}/edit`} variant="primary">
              <Edit className="h-4 w-4" />
              Edit
            </PageHeaderButton>
            {!isSelf && !employee.isSystemAccount && !isDeleted && (
              <DeleteUserButton
                userId={employee.id}
                userName={employee.name || employee.email}
              />
            )}
          </div>
        }
      >
        {hr?.employeeId && (
          <div className="mt-4">
            <span className="text-sm text-slate-400 font-mono">ID: {hr.employeeId}</span>
          </div>
        )}
      </PageHeader>

      <PageContent>
        {/* Deletion Status Banner */}
        {isDeleted && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Scheduled for Deletion</h3>
              <p className="text-sm text-red-600">
                This employee has been deactivated and will be permanently deleted in{' '}
                <strong>{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</strong>.
                Gratuity and service calculations are frozen at the termination date.
              </p>
            </div>
            <RestoreUserButton
              userId={employee.id}
              userName={employee.name || employee.email}
            />
          </div>
        )}

        {/* Profile Completion Alert */}
        {completionPercentage < 80 && !employee.isSystemAccount && !isDeleted && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">Profile Incomplete ({completionPercentage}%)</h3>
            <p className="text-sm text-amber-600">
              This employee&apos;s profile is missing some required information.
            </p>
          </div>
          <Link href={`/admin/employees/${id}/edit`}>
            <Button size="sm" variant="outline">Complete Profile</Button>
          </Link>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{employee._count.assets}</span>
          </div>
          <p className="text-sm font-medium text-slate-900">Assets</p>
          <p className="text-xs text-slate-500">Assigned items</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{employee._count.subscriptions}</span>
          </div>
          <p className="text-sm font-medium text-slate-900">Subscriptions</p>
          <p className="text-xs text-slate-500">Active services</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${completionPercentage >= 80 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <FileText className={`h-5 w-5 ${completionPercentage >= 80 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{completionPercentage}%</span>
          </div>
          <p className="text-sm font-medium text-slate-900">Profile</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full ${completionPercentage >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-900">Joined</p>
          <p className="text-xs text-slate-500">
            {hr?.dateOfJoining ? formatDate(hr.dateOfJoining) : 'Not set'}
          </p>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <Tabs defaultValue="hr" className="w-full">
          <div className="border-b border-slate-100 px-5">
            <TabsList className="bg-transparent h-14 p-0 gap-4">
              <TabsTrigger value="hr" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-14 px-0">
                <FileText className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-14 px-0">
                <Package className="h-4 w-4 mr-2" />
                Assets ({employee._count.assets})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-14 px-0">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscriptions ({employee._count.subscriptions})
              </TabsTrigger>
              <TabsTrigger value="leave" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-14 px-0">
                <Calendar className="h-4 w-4 mr-2" />
                Leave
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hr" className="m-0 p-5">
            <EmployeeHRViewSection hrProfile={hr} employee={employee} />
          </TabsContent>

          <TabsContent value="assets" className="m-0 p-5">
            <UserAssetHistory assets={assetHistory as any} />
          </TabsContent>

          <TabsContent value="subscriptions" className="m-0 p-5">
            <UserSubscriptionHistory subscriptions={subscriptionHistory as any} />
          </TabsContent>

          <TabsContent value="leave" className="m-0 p-5">
            <EmployeeLeaveSection userId={id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* System Information */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <h2 className="font-semibold text-slate-900">System Information</h2>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Account Created</p>
            <p className="font-semibold text-slate-900">{formatDateTime(employee.createdAt)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
            <p className="font-semibold text-slate-900">{formatDateTime(employee.updatedAt)}</p>
          </div>
        </div>
      </div>
      </PageContent>
    </>
  );
}
