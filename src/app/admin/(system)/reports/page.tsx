/**
 * @module app/admin/(system)/reports/page
 * @description Server component page for comprehensive organization reports.
 * Aggregates statistics from all modules (Assets, Subscriptions, Suppliers,
 * Spend Requests, Employees, Users) with activity log tracking.
 *
 * @dependencies
 * - prisma: Extensive parallel database queries for statistics
 * - formatBillingCycle: Subscription billing cycle formatter
 * - date-fns: Date calculations for expiry windows
 *
 * @routes
 * - GET /admin/reports - Displays organization-wide analytics
 *
 * @access
 * - Admins: Full access
 * - Department access users (Finance/HR/Operations): Read access
 * - Approvers: Read access
 * - Development mode: Open access
 *
 * @features
 * - Assets: Status distribution, top types
 * - Subscriptions: Status, billing cycle, upcoming renewals (30 days)
 * - Suppliers: Status, top categories
 * - Spend Requests: Status, priority, cost type breakdown
 * - Employees: Total, HR profiles, expiring documents, incomplete onboarding
 * - Users: Admin vs member role distribution
 * - Activity Logs: By action type, entity type, recent 20 events
 *
 * @performance
 * - Uses Promise.all for parallel database queries
 * - 30+ concurrent queries optimized for single page load
 *
 * @data-scope All queries are tenant-scoped via tenantId
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

import { formatBillingCycle } from '@/features/subscriptions';
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
import { ICON_SIZES } from '@/lib/constants';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with any department access
  const hasAccess = session.user.isAdmin ||
                    session.user.hasFinanceAccess ||
                    session.user.hasHRAccess ||
                    session.user.hasOperationsAccess ||
                    session.user.canApprove;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
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
    ,
    totalSubscriptions,
    subscriptionsByStatus,
    subscriptionsByBilling,
    ,
    upcomingRenewals,
    totalSuppliers,
    suppliersByStatus,
    suppliersByCategory,
    ,
    ,
    usersByAdmin,
    ,
    ,
    spendRequestsByStatus,
    spendRequestsByPriority,
    spendRequestsByCostType,
    ,
    ,
    totalEmployees,
    employeesWithHRProfile,
    ,
    expiringDocuments,
    incompleteOnboarding,
    recentActivity,
    activityByAction,
    activityByEntity,
  ] = await Promise.all([
    prisma.asset.count({ where: { tenantId, deletedAt: null } }),
    prisma.asset.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ['type'],
      where: { tenantId, deletedAt: null },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 10,
    }),
    prisma.asset.aggregate({
      where: { tenantId, deletedAt: null },
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
      by: ['isAdmin'],
      where: { tenantId, isDeleted: false },
      _count: { isAdmin: true },
    }),
    prisma.teamMember.count({
      where: { tenantId, isDeleted: false },
    }),
    prisma.spendRequest.count({ where: { tenantId } }),
    prisma.spendRequest.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    }),
    prisma.spendRequest.groupBy({
      by: ['priority'],
      where: { tenantId },
      _count: { priority: true },
    }),
    prisma.spendRequest.groupBy({
      by: ['costType'],
      where: { tenantId },
      _count: { costType: true },
    }),
    prisma.spendRequest.aggregate({
      where: { tenantId },
      _sum: { totalAmount: true },
    }),
    prisma.spendRequest.count({
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
        <StatChipGroup>
          <StatChip value={totalAssets} label="assets" color="blue" />
          <StatChip value={totalSubscriptions} label="subscriptions" color="emerald" />
          <StatChip value={totalSuppliers} label="suppliers" color="purple" />
          <StatChip value={totalEmployees} label="employees" color="amber" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Assets Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className={`${ICON_SIZES.md} text-blue-500`} />
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
            <CreditCard className={`${ICON_SIZES.md} text-green-500`} />
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
            <Building2 className={`${ICON_SIZES.md} text-purple-500`} />
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

        {/* Spend Requests Reports */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className={`${ICON_SIZES.md} text-pink-500`} />
            Spend Requests Reports
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
                <CardDescription>Request status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spendRequestsByStatus.map((item) => (
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
                  {spendRequestsByPriority.map((item) => (
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
                  {spendRequestsByCostType.map((item) => (
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
            <UserCheck className={`${ICON_SIZES.md} text-emerald-500`} />
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
            <Users className={`${ICON_SIZES.md} text-orange-500`} />
            Users Reports
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
              <CardDescription>System role distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {usersByAdmin.map((item) => (
                  <div key={String(item.isAdmin)} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{item._count.isAdmin}</div>
                    <div className="text-sm text-gray-600 capitalize">{item.isAdmin ? 'admin' : 'member'}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Logs */}
        <div id="activity-logs" className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className={`${ICON_SIZES.md} text-blue-500`} />
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
                      <Activity className={`${ICON_SIZES.sm} text-gray-400`} />
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

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Date: 2026-02-01
 * Reviewer: Claude (AI Code Review)
 *
 * Overall Assessment: PASS with performance observations
 * Comprehensive reports page with extensive data aggregation.
 *
 * Strengths:
 * 1. Excellent use of Promise.all for parallel query execution
 * 2. Comprehensive coverage of all business modules
 * 3. Proper tenant scoping on all queries
 * 4. Good access control (admin + department users + approvers)
 * 5. Clear visual hierarchy with section headers and icons
 * 6. Actionable insights with "View details" links
 * 7. Useful activity log with actor attribution
 *
 * Potential Improvements:
 * 1. 30+ parallel queries may strain database connections
 *    - Consider grouping related queries or using database views
 *    - Could implement caching for less volatile stats
 * 2. Lines 50, 54, 59, 62-63, 66, 72: Several query results unused
 *    - Variables like assetTotalValue, subscriptionTotalCost are fetched but not displayed
 *    - Consider removing unused queries to reduce load
 * 3. Hard-coded 30-day window for "upcoming" - could be configurable
 * 4. Large component (~600 lines) - consider extracting section components
 * 5. No caching - every page load runs all queries
 *
 * Security: Good - tenant-scoped, proper access control
 * Performance: MODERATE CONCERN - many parallel queries on each load
 *   Recommendation: Add caching layer or database views for aggregates
 * Maintainability: Moderate - long file, could benefit from extraction
 */
