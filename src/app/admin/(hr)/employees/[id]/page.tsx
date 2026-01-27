import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/core/datetime';
import { Edit, AlertTriangle, Package, CreditCard, FileText, Calendar, Clock, Trash2 } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';
import { EmployeeHRViewSection } from '@/features/employees/components';
import { getMemberSubscriptionHistory } from '@/features/subscriptions';
import { getMemberAssetHistory } from '@/features/assets';
import {
  UserSubscriptionHistory,
  UserAssetHistory,
  ExportUserPDFButton,
  RestoreUserButton,
} from '@/features/users/components';
import {
  EmployeeActionsDropdown,
  OffboardingStatusBanner,
} from '@/features/employees/components';
import type { UserAssetHistoryItem, UserSubscriptionHistoryItem } from '@/features/users/components';
import { EmployeeLeaveSection } from '@/features/employees/components';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  // Allow access for admins OR users with HR access
  const hasAccess = session.user.isAdmin || session.user.hasHRAccess;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
    redirect('/forbidden');
  }

  const tenantId = session.user.organizationId;

  const { id } = await params;

  const employee = await prisma.teamMember.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          assets: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  // Check soft-delete and offboarding status
  const isDeleted = employee.isDeleted || false;
  const isOffboarded = employee.status === 'OFFBOARDED';
  const scheduledDeletionAt = employee.scheduledDeletionAt;
  const daysUntilDeletion = scheduledDeletionAt
    ? Math.ceil((new Date(scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get asset and subscription history
  const subscriptionHistory = await getMemberSubscriptionHistory(id);
  const assetHistory = await getMemberAssetHistory(id, tenantId);

  // Calculate profile completion
  const requiredFields = [
    'dateOfBirth', 'gender', 'nationality', 'qatarMobile',
    'localEmergencyName', 'localEmergencyPhone',
    'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry',
    'designation',
  ];

  let filledFields = 0;
  requiredFields.forEach((field) => {
    if (employee[field as keyof typeof employee]) filledFields++;
  });
  const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

  const isSelf = session.user.id === employee.id;
  const employeeRole = employee.isAdmin ? 'ADMIN' : 'MEMBER';
  const roleBadgeVariant = employeeRole === 'ADMIN' ? 'error' : 'info';

  // Hide auto-generated internal emails from UI display
  const displayEmail = employee.email.endsWith('.internal') ? undefined : employee.email;

  return (
    <>
      <PageHeader
        title={employee.name || 'Unnamed'}
        subtitle={displayEmail}
        breadcrumbs={[
          { label: 'Team', href: '/admin/employees' },
          { label: employee.name || 'Unnamed' },
        ]}
        badge={{ text: employeeRole, variant: roleBadgeVariant }}
        actions={
          <div className="flex gap-2 flex-wrap">
            <ExportUserPDFButton
              userId={employee.id}
              userName={employee.name || 'Unnamed'}
              userEmail={displayEmail || ''}
            />
            <PageHeaderButton href={`/admin/employees/${id}/edit`} variant="primary">
              <Edit className={ICON_SIZES.sm} />
              Edit
            </PageHeaderButton>
            <EmployeeActionsDropdown
              employeeId={employee.id}
              employeeName={employee.name || 'Unnamed'}
              isSelf={isSelf}
              isDeleted={isDeleted}
              isOffboarded={isOffboarded}
              dateOfJoining={employee.dateOfJoining}
            />
          </div>
        }
      >
        {employee.employeeCode && (
          <div className="mt-4">
            <span className="text-sm text-slate-400 font-mono">ID: {employee.employeeCode}</span>
          </div>
        )}
      </PageHeader>

      <PageContent>
        {/* Deletion Status Banner */}
        {isDeleted && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className={cn(ICON_SIZES.md, "text-red-600")} />
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
              userName={employee.name || 'Unnamed'}
            />
          </div>
        )}

        {/* Offboarding Status Banner */}
        {isOffboarded && !isDeleted && (
          <OffboardingStatusBanner
            employeeId={employee.id}
            employeeName={employee.name || 'Unnamed'}
            dateOfLeaving={employee.dateOfLeaving}
            offboardingReason={employee.offboardingReason}
            offboardingNotes={employee.offboardingNotes}
          />
        )}

        {/* Profile Completion Alert */}
        {completionPercentage < 80 && !isDeleted && !isOffboarded && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className={cn(ICON_SIZES.md, "text-amber-600")} />
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
              <Package className={cn(ICON_SIZES.md, "text-blue-600")} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{employee._count.assets}</span>
          </div>
          <p className="text-sm font-medium text-slate-900">Assets</p>
          <p className="text-xs text-slate-500">Assigned items</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className={cn(ICON_SIZES.md, "text-emerald-600")} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{employee._count.subscriptions}</span>
          </div>
          <p className="text-sm font-medium text-slate-900">Subscriptions</p>
          <p className="text-xs text-slate-500">Active services</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${completionPercentage >= 80 ? 'bg-green-100' : 'bg-amber-100'}`}>
              <FileText className={cn(ICON_SIZES.md, completionPercentage >= 80 ? 'text-green-600' : 'text-amber-600')} />
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
              <Calendar className={cn(ICON_SIZES.md, "text-purple-600")} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-900">Joined</p>
          <p className="text-xs text-slate-500">
            {employee.dateOfJoining ? formatDate(employee.dateOfJoining) : 'Not set'}
          </p>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <Tabs defaultValue="hr" className="w-full">
          <div className="border-b border-slate-200 px-5">
            <nav className="flex gap-6" aria-label="Tabs">
              <TabsList className="bg-transparent h-auto p-0 gap-6 border-none shadow-none">
                <TabsTrigger
                  value="hr"
                  className="relative bg-transparent px-0 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-none border-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600"
                >
                  <FileText className={`${ICON_SIZES.sm} mr-2`} />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="assets"
                  className="relative bg-transparent px-0 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-none border-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600"
                >
                  <Package className={`${ICON_SIZES.sm} mr-2`} />
                  Assets ({employee._count.assets})
                </TabsTrigger>
                <TabsTrigger
                  value="subscriptions"
                  className="relative bg-transparent px-0 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-none border-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600"
                >
                  <CreditCard className={`${ICON_SIZES.sm} mr-2`} />
                  Subscriptions ({employee._count.subscriptions})
                </TabsTrigger>
                <TabsTrigger
                  value="leave"
                  className="relative bg-transparent px-0 py-4 text-sm font-medium text-slate-500 hover:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-none border-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-blue-600"
                >
                  <Calendar className={`${ICON_SIZES.sm} mr-2`} />
                  Leave
                </TabsTrigger>
              </TabsList>
            </nav>
          </div>

          <TabsContent value="hr" className="m-0 p-5">
            <EmployeeHRViewSection employee={employee} />
          </TabsContent>

          <TabsContent value="assets" className="m-0 p-5">
            <UserAssetHistory assets={assetHistory as UserAssetHistoryItem[]} />
          </TabsContent>

          <TabsContent value="subscriptions" className="m-0 p-5">
            <UserSubscriptionHistory subscriptions={subscriptionHistory as UserSubscriptionHistoryItem[]} />
          </TabsContent>

          <TabsContent value="leave" className="m-0 p-5">
            <EmployeeLeaveSection userId={id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* System Information */}
      <div className="mt-6">
        <DetailCard icon={Clock} iconColor="slate" title="System Information">
          <InfoFieldGrid columns={2}>
            <InfoField label="Account Created" value={formatDateTime(employee.createdAt)} />
            <InfoField label="Last Updated" value={formatDateTime(employee.updatedAt)} />
          </InfoFieldGrid>
        </DetailCard>
      </div>
      </PageContent>
    </>
  );
}
