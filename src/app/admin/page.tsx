import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/core/auth";
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import {
  Users,
  Box,
  CreditCard,
  Truck,
  Calendar,
  UserPlus,
  Plus,
  DollarSign,
  Inbox,
  Check,
  AlertTriangle,
  RotateCcw,
  Laptop,
  Gift,
  Award,
  CalendarCheck,
  Briefcase,
  ShoppingCart,
  CalendarOff,
  FileText,
} from 'lucide-react';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role === 'EMPLOYEE') {
    redirect('/employee');
  }

  const isAdmin = session.user.role === 'ADMIN';

  // Get enabled modules from database
  let enabledModules: string[] = ['assets', 'subscriptions', 'suppliers'];

  if (session.user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { enabledModules: true },
    });
    if (org?.enabledModules?.length) {
      enabledModules = org.enabledModules;
    }
  }

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  // Dashboard data
  let dashboardData = null;

  if (isAdmin && session.user.organizationId) {
    const tenantId = session.user.organizationId;
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Batch queries for dashboard data
    const [
      totalEmployees,
      totalAssets,
      totalSubscriptions,
      totalSuppliers,
      totalProjects,
      pendingPurchaseRequests,
      totalCompanyDocuments,
      pendingLeaveCount,
      onLeaveTodayCount,
      expiringEmployeeDocs,
      expiringSubscriptions,
      expiringCompanyDocs,
      pendingApprovals,
      pendingLeaveRequests,
      pendingAssetRequests,
      recentActivity,
      upcomingBirthdays,
      upcomingAnniversaries,
      onLeaveToday,
      monthlySubscriptionCost,
    ] = await Promise.all([
      // Stats counts
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'EMPLOYEE'] },
          organizationMemberships: { some: { organizationId: tenantId } },
        },
      }),
      prisma.asset.count({ where: { tenantId } }),
      prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { tenantId, status: 'APPROVED' } }),
      // Projects count
      prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
      // Pending purchase requests count
      prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
      // Company documents count
      prisma.companyDocument.count({ where: { tenantId } }),
      // Pending leave requests count
      prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      // On leave today count
      prisma.leaveRequest.count({
        where: {
          tenantId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      // Expiring employee documents (next 30 days)
      prisma.hRProfile.findMany({
        where: {
          tenantId,
          OR: [
            { qidExpiry: { gte: today, lte: thirtyDaysFromNow } },
            { passportExpiry: { gte: today, lte: thirtyDaysFromNow } },
            { healthCardExpiry: { gte: today, lte: thirtyDaysFromNow } },
            { contractExpiry: { gte: today, lte: thirtyDaysFromNow } },
            { licenseExpiry: { gte: today, lte: thirtyDaysFromNow } },
          ],
        },
        include: { user: { select: { name: true } } },
        take: 10,
      }),
      // Expiring subscriptions (next 30 days)
      prisma.subscription.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          renewalDate: { gte: today, lte: thirtyDaysFromNow },
        },
        select: { id: true, serviceName: true, renewalDate: true },
        take: 5,
      }),
      // Expiring company documents (next 30 days)
      prisma.companyDocument.findMany({
        where: {
          tenantId,
          expiryDate: { gte: today, lte: thirtyDaysFromNow },
        },
        select: { id: true, documentType: { select: { name: true } }, expiryDate: true },
        take: 5,
      }),

      // Pending approvals (distinct entities)
      prisma.approvalStep.groupBy({
        by: ['entityType', 'entityId'],
        where: { tenantId, status: 'PENDING' },
      }).then(groups => groups.length),

      // Pending leave requests
      prisma.leaveRequest.findMany({
        where: { tenantId, status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
      }),

      // Pending asset requests
      prisma.assetRequest.findMany({
        where: {
          tenantId,
          status: { in: ['PENDING_ADMIN_APPROVAL', 'PENDING_RETURN_APPROVAL'] },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          asset: true,
        },
      }),

      // Recent activity
      prisma.activityLog.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { at: 'desc' },
        include: {
          actorUser: { select: { name: true } },
        },
      }),

      // Upcoming birthdays (next 7 days)
      prisma.hRProfile.findMany({
        where: {
          tenantId,
          dateOfBirth: { not: null },
        },
        include: {
          user: { select: { name: true } },
        },
      }).then(profiles => {
        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        return profiles.filter(p => {
          if (!p.dateOfBirth) return false;
          const dob = new Date(p.dateOfBirth);
          const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          if (thisYearBday < now) {
            thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
          }
          return thisYearBday >= now && thisYearBday <= sevenDaysLater;
        }).slice(0, 3).map(p => ({
          name: p.user.name,
          date: p.dateOfBirth!,
          designation: p.designation,
        }));
      }),

      // Upcoming work anniversaries (next 7 days)
      prisma.hRProfile.findMany({
        where: {
          tenantId,
          dateOfJoining: { not: null },
        },
        include: {
          user: { select: { name: true } },
        },
      }).then(profiles => {
        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        return profiles.filter(p => {
          if (!p.dateOfJoining) return false;
          const joinDate = new Date(p.dateOfJoining);
          const yearsWorked = now.getFullYear() - joinDate.getFullYear();
          if (yearsWorked < 1) return false; // No anniversary in first year

          const thisYearAnniv = new Date(now.getFullYear(), joinDate.getMonth(), joinDate.getDate());
          if (thisYearAnniv < now) {
            thisYearAnniv.setFullYear(thisYearAnniv.getFullYear() + 1);
          }
          return thisYearAnniv >= now && thisYearAnniv <= sevenDaysLater;
        }).slice(0, 3).map(p => {
          const joinDate = new Date(p.dateOfJoining!);
          const yearsWorked = now.getFullYear() - joinDate.getFullYear();
          return {
            name: p.user.name,
            date: p.dateOfJoining!,
            years: yearsWorked,
            designation: p.designation,
          };
        });
      }),

      // On leave today
      prisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
        take: 5,
        include: {
          user: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
      }),

      // Monthly subscription cost
      prisma.subscription.aggregate({
        where: {
          tenantId,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          costPerCycle: { not: null },
        },
        _sum: { costPerCycle: true },
      }),
    ]);

    // Count total expiring items
    const expiringItemsCount =
      expiringEmployeeDocs.length +
      expiringSubscriptions.length +
      expiringCompanyDocs.length;

    dashboardData = {
      stats: {
        employees: totalEmployees,
        assets: totalAssets,
        subscriptions: totalSubscriptions,
        suppliers: totalSuppliers,
        projects: totalProjects,
        pendingPurchaseRequests,
        companyDocuments: totalCompanyDocuments,
        pendingLeave: pendingLeaveCount,
        onLeaveToday: onLeaveTodayCount,
        monthlySpend: monthlySubscriptionCost._sum.costPerCycle || 0,
      },
      pendingApprovals,
      pendingLeaveRequests,
      pendingAssetRequests,
      recentActivity,
      upcomingBirthdays,
      upcomingAnniversaries,
      onLeaveToday,
      needsAttention: {
        count: expiringItemsCount,
        expiringEmployeeDocs,
        expiringSubscriptions,
        expiringCompanyDocs,
      },
    };
  }

  // Get user's first name for greeting
  const firstName = session.user.name?.split(' ')[0] || 'there';

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Get today's date formatted
  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Combine approvals for display
  const allApprovals = [
    ...(dashboardData?.pendingLeaveRequests || []).map(req => ({
      id: req.id,
      type: 'leave' as const,
      icon: Calendar,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'Leave Request',
      description: `${req.user.name} - ${req.leaveType.name}`,
      time: req.createdAt,
    })),
    ...(dashboardData?.pendingAssetRequests || []).map(req => ({
      id: req.id,
      type: 'asset' as const,
      icon: Laptop,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: req.status === 'PENDING_RETURN_APPROVAL' ? 'Asset Return' : 'Asset Request',
      description: `${req.user.name} - ${req.asset?.model || req.asset?.type || 'Asset'}`,
      time: req.createdAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {firstName}
        </h1>
        <p className="text-slate-500 text-sm">{todayFormatted}</p>
      </div>

      {/* Action Cards Row */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Pending Approvals Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50 flex flex-col">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
              <span className="text-4xl font-bold">{dashboardData?.pendingApprovals || 0}</span>
            </div>
            <h3 className="text-lg font-semibold mb-0.5">Pending Approvals</h3>
            <p className="text-white/80 text-sm flex-1">
              {allApprovals.length > 0 ? `${allApprovals.length} items need review` : 'All caught up!'}
            </p>
            <Link
              href="/admin/my-approvals"
              className="block w-full py-2.5 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors text-center mt-4"
            >
              Review Now
            </Link>
          </div>
        </div>

        {/* Needs Your Attention Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-rose-200/50 flex flex-col">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-4xl font-bold">{dashboardData?.needsAttention?.count || 0}</span>
            </div>
            <h3 className="text-lg font-semibold mb-0.5">Needs Attention</h3>
            <p className="text-white/80 text-sm flex-1">
              {(dashboardData?.needsAttention?.count || 0) > 0
                ? 'Expiring documents & renewals'
                : 'Nothing expiring soon'}
            </p>
            <Link
              href="/admin/employees/document-expiry"
              className="block w-full py-2.5 bg-white text-rose-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors text-center mt-4"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Quick Add Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center">
              <Plus className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Quick Add</h3>
          <div className="flex-1"></div>
          <div className="grid grid-cols-2 gap-2">
            {isModuleEnabled('employees') && (
              <Link
                href="/admin/employees/new"
                className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors text-center"
              >
                <UserPlus className="h-3.5 w-3.5 inline mr-1" />
                Employee
              </Link>
            )}
            {isModuleEnabled('assets') && (
              <Link
                href="/admin/assets/new"
                className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors text-center"
              >
                <Box className="h-3.5 w-3.5 inline mr-1" />
                Asset
              </Link>
            )}
            {isModuleEnabled('subscriptions') && (
              <Link
                href="/admin/subscriptions/new"
                className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors text-center"
              >
                <CreditCard className="h-3.5 w-3.5 inline mr-1" />
                SaaS
              </Link>
            )}
            {isModuleEnabled('suppliers') && (
              <Link
                href="/admin/suppliers/new"
                className="py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors text-center"
              >
                <Truck className="h-3.5 w-3.5 inline mr-1" />
                Supplier
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row - Flexible grid based on enabled modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        {isModuleEnabled('employees') && (
          <Link
            href="/admin/employees"
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 hover:shadow-lg hover:shadow-blue-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.employees || 0}</p>
            <p className="text-slate-500 text-xs">Employees</p>
          </Link>
        )}

        {isModuleEnabled('assets') && (
          <Link
            href="/admin/assets"
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 hover:shadow-lg hover:shadow-purple-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <Box className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.assets || 0}</p>
            <p className="text-slate-500 text-xs">Assets</p>
          </Link>
        )}

        {isModuleEnabled('subscriptions') && (
          <Link
            href="/admin/subscriptions"
            className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-4 border border-rose-100 hover:shadow-lg hover:shadow-rose-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.subscriptions || 0}</p>
            <p className="text-slate-500 text-xs">Subscriptions</p>
          </Link>
        )}

        {isModuleEnabled('suppliers') && (
          <Link
            href="/admin/suppliers"
            className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100 hover:shadow-lg hover:shadow-amber-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                <Truck className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.suppliers || 0}</p>
            <p className="text-slate-500 text-xs">Suppliers</p>
          </Link>
        )}

        {isModuleEnabled('leave') && (
          <Link
            href="/admin/leave/requests"
            className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-4 border border-cyan-100 hover:shadow-lg hover:shadow-cyan-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200 group-hover:scale-110 transition-transform">
                <Calendar className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.pendingLeave || 0}</p>
            <p className="text-slate-500 text-xs">Leave Requests</p>
          </Link>
        )}

        {isModuleEnabled('projects') && (
          <Link
            href="/admin/projects"
            className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100 hover:shadow-lg hover:shadow-emerald-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.projects || 0}</p>
            <p className="text-slate-500 text-xs">Active Projects</p>
          </Link>
        )}

        {isModuleEnabled('purchase-requests') && (
          <Link
            href="/admin/purchase-requests"
            className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100 hover:shadow-lg hover:shadow-violet-100/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{dashboardData?.stats.pendingPurchaseRequests || 0}</p>
            <p className="text-slate-500 text-xs">Pending PRs</p>
          </Link>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Column - Approvals (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Pending Approvals</h2>
              <Link href="/admin/my-approvals" className="text-xs text-slate-500 hover:text-slate-700">
                View all
              </Link>
            </div>

            {allApprovals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {allApprovals.map((approval) => (
                  <div key={approval.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${approval.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <approval.icon className={`h-4 w-4 ${approval.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-900 text-sm">{approval.title}</p>
                          <span className="text-xs text-slate-400">
                            {format(new Date(approval.time), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{approval.description}</p>
                        <div className="flex gap-2">
                          <Link
                            href={approval.type === 'leave' ? '/admin/leave/requests' : '/admin/asset-requests'}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">All caught up!</h3>
                <p className="text-sm text-slate-500 mb-4">No pending approvals at the moment.</p>
                <Link href="/admin/my-approvals" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View approval history
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Widgets (1/3 width) */}
        <div className="space-y-4">
          {/* Activity */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Recent Activity</h2>
              <Link href="/admin/activity" className="text-xs text-slate-500 hover:text-slate-700">
                View all
              </Link>
            </div>
            <div className="p-3 space-y-3">
              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.actorUser?.name || 'System'}</span>
                        {' '}{activity.action.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(activity.at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          {isModuleEnabled('employees') && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">Upcoming This Week</h2>
              </div>
              <div className="p-3 space-y-2">
                {dashboardData?.upcomingBirthdays && dashboardData.upcomingBirthdays.length > 0 ? (
                  dashboardData.upcomingBirthdays.map((bday, idx) => (
                    <div key={`bday-${idx}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className="w-10 h-10 bg-pink-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[10px] text-pink-600 font-medium">
                          {format(new Date(bday.date), 'MMM').toUpperCase()}
                        </span>
                        <span className="text-sm text-pink-700 font-bold leading-none">
                          {format(new Date(bday.date), 'd')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{bday.name}'s Birthday</p>
                        <p className="text-xs text-slate-500">{bday.designation || 'Team Member'}</p>
                      </div>
                      <Gift className="h-4 w-4 text-pink-400 ml-auto" />
                    </div>
                  ))
                ) : null}

                {dashboardData?.upcomingAnniversaries && dashboardData.upcomingAnniversaries.length > 0 ? (
                  dashboardData.upcomingAnniversaries.map((anniv, idx) => (
                    <div key={`anniv-${idx}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-[10px] text-blue-600 font-medium">
                          {format(new Date(anniv.date), 'MMM').toUpperCase()}
                        </span>
                        <span className="text-sm text-blue-700 font-bold leading-none">
                          {format(new Date(anniv.date), 'd')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {anniv.name} - {anniv.years} Year Anniversary
                        </p>
                        <p className="text-xs text-slate-500">{anniv.designation || 'Team Member'}</p>
                      </div>
                      <Award className="h-4 w-4 text-blue-400 ml-auto" />
                    </div>
                  ))
                ) : null}

                {(!dashboardData?.upcomingBirthdays?.length && !dashboardData?.upcomingAnniversaries?.length) && (
                  <p className="text-sm text-slate-500 text-center py-4">No upcoming events this week</p>
                )}
              </div>
            </div>
          )}

          {/* Leave Requests */}
          {isModuleEnabled('leave') && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 text-sm">Leave Requests</h2>
                <Link href="/admin/leave/requests" className="text-xs text-slate-500 hover:text-slate-700">
                  View all
                </Link>
              </div>
              <div className="p-3">
                {dashboardData?.pendingLeaveRequests && dashboardData.pendingLeaveRequests.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {dashboardData.pendingLeaveRequests.slice(0, 4).map((leave) => (
                      <Link
                        key={leave.id}
                        href="/admin/leave/requests"
                        className="flex flex-col items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-cyan-200">
                          <span className="text-white text-sm font-bold">
                            {leave.user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate w-full">{leave.user.name?.split(' ')[0]}</p>
                        <p className="text-xs text-slate-500 truncate w-full">{leave.leaveType.name}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No pending requests</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
