import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import Link from 'next/link';
import {
  Activity,
  Users,
  Package,
  CreditCard,
  Building2,
  ShoppingCart,
  UserCheck,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/forbidden');
  }

  const tenantId = session.user.organizationId;

  // Get comprehensive stats from ALL modules (tenant-scoped)
  const [
    totalAssets,
    assetsByStatus,
    assetsByType,
    assetsValue,
    totalSubscriptions,
    subscriptionsByStatus,
    subscriptionsByBilling,
    subscriptionsCost,
    upcomingRenewals,
    totalSuppliers,
    suppliersByStatus,
    suppliersByCategory,
    totalEngagements,
    totalUsers,
    usersByRole,
    activeUsers,
    totalPurchaseRequests,
    purchaseRequestsByStatus,
    purchaseRequestsByPriority,
    purchaseRequestsByCostType,
    purchaseRequestsValue,
    pendingPurchaseRequests,
    totalEmployees,
    employeesWithHRProfile,
    pendingChangeRequests,
    expiringDocuments,
    incompleteOnboarding,
    recentActivity,
    activityByAction,
    activityByEntity,
  ] = await Promise.all([
    prisma.asset.count({ where: { tenantId } }),
    prisma.asset.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ['type'],
      where: { tenantId },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 10,
    }),
    prisma.asset.aggregate({
      where: { tenantId },
      _sum: { priceQAR: true },
    }),
    prisma.subscription.count({ where: { tenantId } }),
    prisma.subscription.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.subscription.groupBy({
      by: ['billingCycle'],
      where: { tenantId },
      _count: { billingCycle: true },
    }),
    prisma.subscription.aggregate({
      where: { tenantId },
      _sum: { costQAR: true },
    }),
    prisma.subscription.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        renewalDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.supplier.count({ where: { tenantId } }),
    prisma.supplier.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.supplier.groupBy({
      by: ['category'],
      where: { tenantId },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 10,
    }),
    prisma.supplierEngagement.count({ where: { tenantId } }),
    prisma.teamMember.count({
      where: { tenantId, isDeleted: false },
    }),
    prisma.teamMember.groupBy({
      by: ['role'],
      where: { tenantId, isDeleted: false },
      _count: { role: true },
    }),
    prisma.teamMember.count({
      where: { tenantId, isDeleted: false },
    }),
    prisma.purchaseRequest.count({ where: { tenantId } }),
    prisma.purchaseRequest.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.purchaseRequest.groupBy({
      by: ['priority'],
      where: { tenantId },
      _count: { priority: true },
    }),
    prisma.purchaseRequest.groupBy({
      by: ['costType'],
      where: { tenantId },
      _count: { costType: true },
    }),
    prisma.purchaseRequest.aggregate({
      where: { tenantId },
      _sum: { totalAmount: true },
    }),
    prisma.purchaseRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    prisma.teamMember.count({
      where: { tenantId, isDeleted: false },
    }),
    prisma.teamMember.count({ where: { tenantId, isEmployee: true, isDeleted: false } }),
    prisma.profileChangeRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        isDeleted: false,
        OR: [
          { qidExpiry: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() } },
          { passportExpiry: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() } },
          { healthCardExpiry: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() } },
        ],
      },
    }),
    prisma.teamMember.count({
      where: { tenantId, isEmployee: true, isDeleted: false, onboardingComplete: false },
    }),
    prisma.activityLog.findMany({
      where: { tenantId },
      take: 20,
      orderBy: { at: 'desc' },
      include: {
        actorMember: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.activityLog.groupBy({
      by: ['action'],
      where: { tenantId },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['entityType'],
      where: { tenantId },
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive system reports across all modules with activity logs"
      >
        {/* Quick Stats */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">{totalAssets} assets</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{totalSubscriptions} subscriptions</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
            <span className="text-purple-400 text-sm font-medium">{totalSuppliers} suppliers</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-sm font-medium">{totalEmployees} employees</span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Assets Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Assets Reports
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Assets by Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assetsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.replace('_', ' ').toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Asset Types</CardTitle>
                <CardDescription>Most common asset categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assetsByType.map((item) => (
                    <div key={item.type} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.type}</span>
                      <span className="font-semibold">{item._count.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscriptions Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-500" />
            Subscriptions Reports
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
                <CardDescription>Subscription status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Billing Cycle</CardTitle>
                <CardDescription>Payment frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionsByBilling.map((item) => (
                    <div key={item.billingCycle} className="flex justify-between items-center">
                      <span className="text-gray-700">{formatBillingCycle(item.billingCycle)}</span>
                      <span className="font-semibold">{item._count.billingCycle}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Renewals</CardTitle>
                <CardDescription>Next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-600">{upcomingRenewals}</div>
                <p className="text-sm text-gray-600 mt-2">Subscriptions due for renewal</p>
                <Link href="/admin/subscriptions" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View details →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Suppliers Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Suppliers Reports
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Suppliers by Status</CardTitle>
                <CardDescription>Approval status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliersByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Supplier Categories</CardTitle>
                <CardDescription>Most common categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliersByCategory.map((item) => (
                    <div key={item.category} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold">{item._count.category}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Purchase Requests Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-pink-500" />
            Purchase Requests Reports
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
                <CardDescription>Request status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseRequestsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.replace('_', ' ').toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Priority</CardTitle>
                <CardDescription>Priority distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseRequestsByPriority.map((item) => (
                    <div key={item.priority} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.priority.toLowerCase()}</span>
                      <span className="font-semibold">{item._count.priority}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Cost Type</CardTitle>
                <CardDescription>Operating vs Project costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseRequestsByCostType.map((item) => (
                    <div key={item.costType} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.costType === 'OPERATING_COST' ? 'Operating Cost' : 'Project Cost'}</span>
                      <span className="font-semibold">{item._count.costType}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Employees/HR Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Employees & HR Reports
          </h2>

          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{totalEmployees}</div>
                <p className="text-sm text-gray-600 mt-1">Admin + Employee roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">HR Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{employeesWithHRProfile}</div>
                <p className="text-sm text-gray-600 mt-1">Profiles created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Expiring Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{expiringDocuments}</div>
                <p className="text-sm text-gray-600 mt-1">Next 30 days</p>
                <Link href="/admin/employees/document-expiry" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View details →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Incomplete Onboarding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{incompleteOnboarding}</div>
                <p className="text-sm text-gray-600 mt-1">Not fully onboarded</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Users Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Users Reports
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
              <CardDescription>System role distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {usersByRole.map((item) => (
                  <div key={item.role} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{item._count.role}</div>
                    <div className="text-sm text-gray-600 capitalize">{item.role.toLowerCase()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Logs */}
        <div id="activity-logs" className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Activity Logs
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>By Action Type</CardTitle>
                <CardDescription>Most common actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityByAction.slice(0, 5).map((item) => (
                    <div key={item.action} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.action}</span>
                      <span className="font-semibold text-gray-900">{item._count.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Entity Type</CardTitle>
                <CardDescription>Activity distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityByEntity.map((item) => (
                    <div key={item.entityType} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.entityType}</span>
                      <span className="font-semibold text-gray-900">{item._count.entityType}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Activities</CardTitle>
                <CardDescription>System-wide events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600">{activityByAction.reduce((sum, item) => sum + item._count.action, 0)}</div>
                <p className="text-sm text-gray-600 mt-2">All tracked actions</p>
                <Link href="/admin/activity" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View full log →
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 20 system events across all modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.entityType} • {activity.actorMember ? (activity.actorMember.name || activity.actorMember.email) : 'System'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link href="/admin/activity" className="text-sm text-blue-600 hover:underline font-medium">
                  View complete activity log →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
