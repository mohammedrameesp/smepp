import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/core/auth";
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { SetupChecklist } from '@/components/dashboard/SetupChecklist';

// Avatar color palette - consistent colors based on name
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-cyan-100 text-cyan-600',
  'bg-violet-100 text-violet-600',
  'bg-lime-100 text-lime-600',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role === 'EMPLOYEE') {
    redirect('/employee');
  }

  const isAdmin = session.user.role === 'ADMIN';

  // Get enabled modules and org details from database
  let enabledModules: string[] = ['assets', 'subscriptions', 'suppliers'];

  if (session.user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { enabledModules: true, name: true, subscriptionTier: true },
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
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Batch queries for dashboard data
    const [
      totalEmployees,
      totalAssets,
      totalSubscriptions,
      totalSuppliers,
      pendingPurchaseRequests,
      totalCompanyDocuments,
      pendingLeaveCount,
      onLeaveTodayCount,
      pendingSuppliers,
      pendingChangeRequests,
      expiringCompanyDocs,
      expiringSubscriptions,
      pendingApprovals,
      recentActivity,
      upcomingBirthdays,
      upcomingAnniversaries,
      onLeaveToday,
      expiringEmployeeDocs,
    ] = await Promise.all([
      // Stats counts
      prisma.teamMember.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.asset.count({ where: { tenantId } }),
      prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { tenantId, status: 'APPROVED' } }),
      prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.companyDocument.count({ where: { tenantId } }),
      prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.leaveRequest.count({
        where: {
          tenantId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today },
        },
      }),
      prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
      // Expiring company documents (next 30 days)
      prisma.companyDocument.findMany({
        where: {
          tenantId,
          expiryDate: { gte: today, lte: thirtyDaysFromNow },
        },
        select: { id: true, documentType: { select: { name: true } }, expiryDate: true },
        take: 5,
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
      // Pending approvals (distinct entities)
      prisma.approvalStep.groupBy({
        by: ['entityType', 'entityId'],
        where: { tenantId, status: 'PENDING' },
      }).then(groups => groups.length),
      // Recent activity
      prisma.activityLog.findMany({
        where: { tenantId },
        take: 4,
        orderBy: { at: 'desc' },
        include: {
          actorMember: { select: { name: true } },
        },
      }),
      // Upcoming birthdays (next 7 days)
      prisma.teamMember.findMany({
        where: {
          tenantId,
          dateOfBirth: { not: null },
        },
        select: {
          name: true,
          dateOfBirth: true,
        },
      }).then(members => {
        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        return members.filter(m => {
          if (!m.dateOfBirth) return false;
          const dob = new Date(m.dateOfBirth);
          const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          if (thisYearBday < now) {
            thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
          }
          return thisYearBday >= now && thisYearBday <= sevenDaysLater;
        }).slice(0, 3).map(m => ({
          name: m.name,
          date: m.dateOfBirth!,
        }));
      }),
      // Upcoming work anniversaries (next 7 days)
      prisma.teamMember.findMany({
        where: {
          tenantId,
          dateOfJoining: { not: null },
        },
        select: {
          name: true,
          dateOfJoining: true,
        },
      }).then(members => {
        const now = new Date();
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        return members.filter(m => {
          if (!m.dateOfJoining) return false;
          const joinDate = new Date(m.dateOfJoining);
          const yearsWorked = now.getFullYear() - joinDate.getFullYear();
          if (yearsWorked < 1) return false;

          const thisYearAnniv = new Date(now.getFullYear(), joinDate.getMonth(), joinDate.getDate());
          if (thisYearAnniv < now) {
            thisYearAnniv.setFullYear(thisYearAnniv.getFullYear() + 1);
          }
          return thisYearAnniv >= now && thisYearAnniv <= sevenDaysLater;
        }).slice(0, 3).map(m => {
          const joinDate = new Date(m.dateOfJoining!);
          const yearsWorked = new Date().getFullYear() - joinDate.getFullYear();
          return {
            name: m.name,
            date: m.dateOfJoining!,
            years: yearsWorked,
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
          member: { select: { name: true } },
          leaveType: { select: { name: true } },
        },
      }),
      // Expiring employee documents (next 30 days)
      prisma.teamMember.findMany({
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
        select: { id: true, name: true, qidExpiry: true, passportExpiry: true, healthCardExpiry: true, contractExpiry: true, licenseExpiry: true },
        take: 10,
      }),
    ]);

    // Calculate total pending approvals
    const totalPendingApprovals = pendingApprovals + pendingLeaveCount + pendingPurchaseRequests + pendingSuppliers + pendingChangeRequests;

    // Calculate expiring documents count
    const expiringDocsCount = expiringCompanyDocs.length + expiringSubscriptions.length + expiringEmployeeDocs.length;

    dashboardData = {
      stats: {
        employees: totalEmployees,
        assets: totalAssets,
        subscriptions: totalSubscriptions,
        suppliers: totalSuppliers,
        pendingPurchaseRequests,
        companyDocuments: totalCompanyDocuments,
        pendingLeave: pendingLeaveCount,
        onLeaveToday: onLeaveTodayCount,
        pendingSuppliers,
        pendingChangeRequests,
      },
      totalPendingApprovals,
      expiringDocsCount,
      expiringCompanyDocs,
      expiringSubscriptions,
      recentActivity,
      upcomingBirthdays,
      upcomingAnniversaries,
      onLeaveToday,
    };
  }

  // Get user's first name for greeting
  const firstName = session.user.name?.split(' ')[0] || 'there';

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' :
                   hour >= 12 && hour < 17 ? 'Good afternoon' :
                   hour >= 17 && hour < 21 ? 'Good evening' : 'Good night';

  // Calculate total attention items
  const attentionItems = (dashboardData?.totalPendingApprovals || 0) + (dashboardData?.expiringDocsCount || 0);

  // Module cards configuration
  const moduleCards = [
    {
      id: 'assets',
      href: '/admin/assets',
      icon: '📦',
      title: 'Assets',
      description: 'Physical and digital assets',
      count: dashboardData?.stats.assets,
      enabled: isModuleEnabled('assets'),
    },
    {
      id: 'subscriptions',
      href: '/admin/subscriptions',
      icon: '💳',
      title: 'Subscriptions',
      description: 'Software licenses and renewals',
      count: dashboardData?.stats.subscriptions,
      enabled: isModuleEnabled('subscriptions'),
    },
    {
      id: 'suppliers',
      href: '/admin/suppliers',
      icon: '🤝',
      title: 'Suppliers',
      description: 'Vendors and partners',
      count: dashboardData?.stats.suppliers,
      badge: dashboardData?.stats.pendingSuppliers ? `${dashboardData.stats.pendingSuppliers} pending` : null,
      badgeColor: 'bg-red-500',
      enabled: isModuleEnabled('suppliers'),
    },
    {
      id: 'employees',
      href: '/admin/employees',
      icon: '👥',
      title: 'Employees',
      description: 'Team members and HR profiles',
      count: dashboardData?.stats.employees,
      badge: dashboardData?.stats.pendingChangeRequests ? `${dashboardData.stats.pendingChangeRequests} change req` : null,
      badgeColor: 'bg-orange-500',
      enabled: isModuleEnabled('employees'),
    },
    {
      id: 'leave',
      href: '/admin/leave/requests',
      icon: '🏖️',
      title: 'Leave',
      description: 'Requests and balances',
      status: dashboardData?.stats.pendingLeave ? { text: `${dashboardData.stats.pendingLeave} pending`, color: 'text-red-600 bg-red-50' } : { text: 'Up to date', color: 'text-emerald-600 bg-emerald-50' },
      enabled: isModuleEnabled('leave'),
    },
    {
      id: 'payroll',
      href: '/admin/payroll',
      icon: '💰',
      title: 'Payroll',
      description: 'Salaries, runs, and loans',
      status: { text: 'Up to date', color: 'text-emerald-600 bg-emerald-50' },
      enabled: isModuleEnabled('payroll'),
    },
    {
      id: 'purchase-requests',
      href: '/admin/purchase-requests',
      icon: '🛒',
      title: 'Purchases',
      description: 'Requests and approvals',
      count: dashboardData?.stats.pendingPurchaseRequests || 0,
      badge: dashboardData?.stats.pendingPurchaseRequests ? `${dashboardData.stats.pendingPurchaseRequests} pending` : null,
      badgeColor: 'bg-red-500',
      enabled: isModuleEnabled('purchase-requests'),
    },
    {
      id: 'company-documents',
      href: '/admin/company-documents',
      icon: '📄',
      title: 'Documents',
      description: 'Licenses and registrations',
      count: dashboardData?.stats.companyDocuments,
      badge: (dashboardData?.expiringCompanyDocs?.length || 0) > 0 ? `${dashboardData?.expiringCompanyDocs?.length} expiring` : null,
      badgeColor: 'bg-red-500',
      enabled: true, // Always enabled
    },
    {
      id: 'reports',
      href: '/admin/reports',
      icon: '📊',
      title: 'Reports',
      description: 'Analytics and exports',
      enabled: true, // Always enabled
    },
  ].filter(card => card.enabled);

  return (
    <>
      {/* Extended Header with Greeting */}
      <div className="bg-slate-800 pb-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 pt-10">
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {firstName}
          </h1>
          <p className="text-slate-400 mt-1">
            {attentionItems > 0
              ? `You have ${attentionItems} items needing your attention`
              : "You're all caught up!"}
          </p>

          {/* Summary Chips */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {(dashboardData?.totalPendingApprovals || 0) > 0 && (
              <Link
                href="/admin/my-approvals"
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                <span className="text-red-400 text-sm font-medium">
                  {dashboardData?.totalPendingApprovals} pending approvals
                </span>
              </Link>
            )}
            {(dashboardData?.expiringDocsCount || 0) > 0 && (
              <Link
                href="/admin/employees/document-expiry"
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                <span className="text-amber-400 text-sm font-medium">
                  {dashboardData?.expiringDocsCount} documents expiring
                </span>
              </Link>
            )}
            {(dashboardData?.stats.onLeaveToday || 0) > 0 && (
              <Link
                href="/admin/leave/requests"
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                <span className="text-blue-400 text-sm font-medium">
                  {dashboardData?.stats.onLeaveToday} out of office
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        {/* Setup Checklist - shown until all items complete */}
        <SetupChecklist />

        {/* Modules Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Modules</h2>
        </div>

        {/* Module Cards Grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {moduleCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group relative bg-white border border-gray-300 rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-400 transition-all duration-200"
              style={{
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
              }}
            >
              {card.badge && (
                <span className={`absolute -top-2 -right-2 ${card.badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}>
                  {card.badge}
                </span>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">{card.icon}</div>
                  {card.count !== undefined ? (
                    <div className="text-2xl font-bold text-slate-700">{card.count}</div>
                  ) : card.status ? (
                    <div className={`text-sm font-semibold ${card.status.color} px-2 py-1 rounded`}>
                      {card.status.text}
                    </div>
                  ) : null}
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-slate-700">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom Section: Out of Office + Upcoming + Recent Activity */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Out of Office Today */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Out of Office Today</h3>
              <span className="text-xs text-gray-500">
                {dashboardData?.onLeaveToday?.length || 0} people
              </span>
            </div>
            <div className="space-y-3">
              {dashboardData?.onLeaveToday && dashboardData.onLeaveToday.length > 0 ? (
                dashboardData.onLeaveToday.map((leave) => (
                  <div key={leave.id} className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-medium ${getAvatarColor(leave.member.name || '')}`}>
                      {getInitials(leave.member.name || '??')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{leave.member.name}</p>
                      <p className="text-xs text-gray-500">{leave.leaveType.name}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {leave.endDate && format(new Date(leave.endDate), 'MMM d') !== format(new Date(), 'MMM d')
                        ? `Until ${format(new Date(leave.endDate), 'MMM d')}`
                        : 'Today only'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Everyone is in today</p>
              )}
            </div>
          </div>

          {/* Upcoming This Week */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upcoming This Week</h3>
              <Link href="/admin/employees" className="text-sm text-slate-600 hover:text-slate-800 font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {/* Birthdays */}
              {dashboardData?.upcomingBirthdays?.map((bday, idx) => (
                <Link
                  key={`bday-${idx}`}
                  href="/admin/employees"
                  className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎂</span>
                    <span className="text-sm font-medium text-gray-900">{bday.name}&apos;s Birthday</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    {format(new Date(new Date().getFullYear(), new Date(bday.date).getMonth(), new Date(bday.date).getDate()), 'MMM d')}
                  </span>
                </Link>
              ))}

              {/* Expiring Documents */}
              {dashboardData?.expiringCompanyDocs?.slice(0, 2).map((doc) => (
                <Link
                  key={doc.id}
                  href={`/admin/company-documents/${doc.id}`}
                  className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📄</span>
                    <span className="text-sm font-medium text-gray-900">{doc.documentType?.name || 'Document'} Expires</span>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">
                    {doc.expiryDate && format(new Date(doc.expiryDate), 'MMM d')}
                  </span>
                </Link>
              ))}

              {/* Subscription Renewals */}
              {dashboardData?.expiringSubscriptions?.slice(0, 2).map((sub) => (
                <Link
                  key={sub.id}
                  href={`/admin/subscriptions/${sub.id}`}
                  className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔄</span>
                    <span className="text-sm font-medium text-gray-900">{sub.serviceName} Renewal</span>
                  </div>
                  <span className="text-xs text-purple-600 font-medium">
                    {sub.renewalDate && format(new Date(sub.renewalDate), 'MMM d')}
                  </span>
                </Link>
              ))}

              {/* Anniversaries */}
              {dashboardData?.upcomingAnniversaries?.map((anniv, idx) => (
                <Link
                  key={`anniv-${idx}`}
                  href="/admin/employees"
                  className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎉</span>
                    <span className="text-sm font-medium text-gray-900">{anniv.name}&apos;s {anniv.years}yr Anniversary</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">
                    {format(new Date(new Date().getFullYear(), new Date(anniv.date).getMonth(), new Date(anniv.date).getDate()), 'MMM d')}
                  </span>
                </Link>
              ))}

              {/* Empty state */}
              {!dashboardData?.upcomingBirthdays?.length &&
               !dashboardData?.upcomingAnniversaries?.length &&
               !dashboardData?.expiringCompanyDocs?.length &&
               !dashboardData?.expiringSubscriptions?.length && (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming events this week</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
              <Link href="/admin/activity" className="text-sm text-slate-600 hover:text-slate-800 font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity) => {
                  const actionText = activity.action.replace(/_/g, ' ').toLowerCase();
                  return (
                    <div key={activity.id} className="flex items-center gap-3 text-sm">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${getAvatarColor(activity.actorMember?.name || 'System')}`}>
                        {getInitials(activity.actorMember?.name || 'SY')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 truncate">
                          {activity.actorMember?.name || 'System'} {actionText}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatDistanceToNow(new Date(activity.at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
