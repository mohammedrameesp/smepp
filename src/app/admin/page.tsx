import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/core/auth";
import { prisma } from '@/lib/core/prisma';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // Middleware handles authentication - this is a fallback
  if (!session) {
    redirect('/login');
  }

  // Redirect employees to their dedicated dashboard
  if (session.user.role === 'EMPLOYEE') {
    redirect('/employee');
  }

  const isAdmin = session.user.role === 'ADMIN';

  // Admin dashboard data
  let adminData = null;
  let statsData = null;

  if (isAdmin && session.user.organizationId) {
    const tenantId = session.user.organizationId;

    // Calculate date thresholds for expiry checks
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Batch 1: Main data queries (tenant-scoped)
    const [
      allSubscriptions,
      recentActivity,
      totalAssets,
      activeUsers,
      totalSubscriptions,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          renewalDate: { not: null },
        },
        include: {
          assignedUser: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.activityLog.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { at: 'desc' },
        include: {
          actorUser: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.asset.count({ where: { tenantId } }),
      prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'EMPLOYEE'] },
          organizationMemberships: { some: { organizationId: tenantId } },
        },
      }),
      prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    // Batch 2: Counts and pending items (tenant-scoped)
    const [
      totalSuppliers,
      pendingSuppliers,
      pendingPurchaseRequests,
      pendingChangeRequests,
    ] = await Promise.all([
      prisma.supplier.count({ where: { tenantId } }),
      prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
    ]);

    // Batch 3: HR, projects, company documents (tenant-scoped)
    const [
      pendingLeaveRequests,
      expiringDocuments,
      incompleteOnboarding,
      totalProjects,
      expiringCompanyDocs,
      expiredCompanyDocs,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.hRProfile.count({
        where: {
          tenantId,
          OR: [
            { qidExpiry: { lte: thirtyDaysFromNow, gte: today } },
            { passportExpiry: { lte: thirtyDaysFromNow, gte: today } },
            { healthCardExpiry: { lte: thirtyDaysFromNow, gte: today } },
          ],
        },
      }),
      prisma.hRProfile.count({
        where: { tenantId, onboardingComplete: false },
      }),
      prisma.project.count({ where: { tenantId } }),
      prisma.companyDocument.count({
        where: { tenantId, expiryDate: { gte: today, lte: thirtyDaysFromNow } },
      }),
      prisma.companyDocument.count({
        where: { tenantId, expiryDate: { lt: today } },
      }),
    ]);

    // Batch 4: Monthly spend data (has internal queries)
    const monthlySpendData = await getMonthlySpendData();

    statsData = {
      totalAssets,
      activeUsers,
      totalSubscriptions,
      totalSuppliers,
      totalProjects,
    };

    const subscriptionsWithNextRenewal = allSubscriptions.map(sub => {
      const nextRenewal = sub.renewalDate ? getNextRenewalDate(sub.renewalDate, sub.billingCycle) : null;
      const daysUntil = getDaysUntilRenewal(nextRenewal);
      return {
        id: sub.id,
        serviceName: sub.serviceName,
        costPerCycle: sub.costPerCycle ? Number(sub.costPerCycle) : null,
        costCurrency: sub.costCurrency,
        paymentMethod: sub.paymentMethod,
        status: sub.status,
        assignedUser: sub.assignedUser,
        nextRenewalDate: nextRenewal,
        daysUntilRenewal: daysUntil,
      };
    });

    adminData = {
      subscriptionsWithNextRenewal,
      recentActivity,
      monthlySpendData,
      pendingSuppliers,
      pendingPurchaseRequests,
      pendingChangeRequests,
      pendingLeaveRequests,
      expiringDocuments,
      incompleteOnboarding,
      expiringCompanyDocs,
      expiredCompanyDocs,
    };
  }

  async function getMonthlySpendData() {
    const months = [];
    const currentDate = new Date();
    const tenantId = session!.user.organizationId;

    const allSubscriptions = await prisma.subscription.findMany({
      where: {
        tenantId,
        costPerCycle: { not: null },
        purchaseDate: { not: null },
      },
      select: {
        costPerCycle: true,
        costCurrency: true,
        costQAR: true,
        billingCycle: true,
        purchaseDate: true,
        renewalDate: true,
        status: true,
      },
    });

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      const assetSpend = await prisma.asset.aggregate({
        where: {
          tenantId,
          purchaseDate: {
            gte: monthStart,
            lt: monthEnd,
          },
          priceQAR: { not: null },
        },
        _sum: { priceQAR: true },
      });

      let recurringSubscriptionSpend = 0;
      let newSubscriptionSpend = 0;

      allSubscriptions.forEach(sub => {
        if (!sub.costPerCycle || !sub.purchaseDate) return;

        const purchaseDate = new Date(sub.purchaseDate);
        const renewalDate = sub.renewalDate ? new Date(sub.renewalDate) : null;

        const costInQAR = sub.costQAR ? Number(sub.costQAR) :
                         (sub.costCurrency === 'QAR' ? Number(sub.costPerCycle) / 3.64 : Number(sub.costPerCycle));

        const isPurchasedThisMonth = purchaseDate >= monthStart && purchaseDate < monthEnd;
        const isActiveThisMonth = purchaseDate < monthEnd && sub.status === 'ACTIVE';

        if (isPurchasedThisMonth && sub.billingCycle === 'ONE_TIME') {
          newSubscriptionSpend += costInQAR;
        } else if (isActiveThisMonth && purchaseDate < monthStart) {
          if (sub.billingCycle === 'MONTHLY') {
            if (renewalDate) {
              const nextRenewal = getNextRenewalDate(renewalDate, sub.billingCycle);
              if (nextRenewal && new Date(nextRenewal) >= monthStart && new Date(nextRenewal) < monthEnd) {
                recurringSubscriptionSpend += costInQAR;
              }
            } else {
              recurringSubscriptionSpend += costInQAR;
            }
          } else if (sub.billingCycle === 'YEARLY') {
            if (renewalDate) {
              const nextRenewal = getNextRenewalDate(renewalDate, sub.billingCycle);
              if (nextRenewal && new Date(nextRenewal) >= monthStart && new Date(nextRenewal) < monthEnd) {
                recurringSubscriptionSpend += costInQAR;
              }
            }
          }
        } else if (isPurchasedThisMonth && sub.billingCycle !== 'ONE_TIME') {
          newSubscriptionSpend += costInQAR;
        }
      });

      const totalSubscriptionSpend = recurringSubscriptionSpend + newSubscriptionSpend;

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        assets: Number(assetSpend._sum.priceQAR || 0),
        subscriptions: totalSubscriptionSpend,
        recurringSubscriptions: recurringSubscriptionSpend,
        newSubscriptions: newSubscriptionSpend,
        total: Number(assetSpend._sum.priceQAR || 0) + totalSubscriptionSpend,
      });
    }

    return months;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        <div className="container mx-auto py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">
              Welcome{session.user.organizationName ? ` to ${session.user.organizationName}` : ''}
            </h1>
            <p className="text-xl text-slate-200 mb-8">
              Your central hub for managing assets, subscriptions, and employees
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Modules Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Access Modules</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {isAdmin ? (
              <>
                {/* Assets */}
                <Link href="/admin/assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">📦</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalAssets}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage physical and digital assets</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Subscriptions */}
                <Link href="/admin/subscriptions">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">💳</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalSubscriptions}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Track software licenses and renewals</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Suppliers */}
                <Link href="/admin/suppliers">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full relative">
                    {adminData && adminData.pendingSuppliers > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5">
                        {adminData.pendingSuppliers} pending
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">🤝</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalSuppliers}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Suppliers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage vendors and suppliers</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Projects */}
                <Link href="/admin/projects">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">📁</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalProjects}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Projects
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Project budgets and profitability tracking</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Employees */}
                <Link href="/admin/employees">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full relative">
                    {adminData && adminData.pendingChangeRequests > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-0.5">
                        {adminData.pendingChangeRequests} change req
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">👥</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.activeUsers}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Employees
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Team members, HR profiles & document tracking</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Reports */}
                <Link href="/admin/reports">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">📊</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Reports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">View analytics and generate reports</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Purchase Requests */}
                <Link href="/admin/purchase-requests">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full relative">
                    {adminData && adminData.pendingPurchaseRequests > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5">
                        {adminData.pendingPurchaseRequests} pending
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="text-4xl mb-2">🛒</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Purchase Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Review and manage employee purchase requests</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Leave Management */}
                <Link href="/admin/leave">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full relative">
                    {adminData && adminData.pendingLeaveRequests > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5">
                        {adminData.pendingLeaveRequests} pending
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="text-4xl mb-2">🏖️</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Leave Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage employee leave requests and balances</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Payroll */}
                <Link href="/admin/payroll">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">💰</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Payroll
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Salary structures, payroll runs, loans & gratuity</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Company Documents */}
                <Link href="/admin/company-documents">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full relative">
                    {adminData && (adminData.expiredCompanyDocs + adminData.expiringCompanyDocs) > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5">
                        {adminData.expiredCompanyDocs + adminData.expiringCompanyDocs} alerts
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="text-4xl mb-2">📄</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Company Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Track licenses, registrations & vehicle documents</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Settings */}
                <Link href="/admin/settings">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">⚙️</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">System configuration and data export/import</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </>
            ) : (
              <>
                <Link href="/employee/my-assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">👤💼</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        My Holdings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">View assets and subscriptions assigned to you</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">📦</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        All Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Browse all company assets</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/subscriptions">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">💳</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        All Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Browse all company subscriptions</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/purchase-requests">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">🛒</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Purchase Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Submit and track your purchase requests</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/leave">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">🏖️</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Leave
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Request leave and view your balances</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/payroll">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">💰</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Payroll
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">View payslips and gratuity estimate</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </>
            )}
          </div>

          {/* ATTENTION ITEMS SECTION - Admin Only */}
          {isAdmin && adminData && (
            <div className="mb-8 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Needs Your Attention
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

                {/* Upcoming Renewals */}
                <Card className="bg-white border-l-4 border-l-orange-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Upcoming Renewals</CardTitle>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {adminData.subscriptionsWithNextRenewal.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30).length} Soon
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.subscriptionsWithNextRenewal
                        .filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30)
                        .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0))
                        .slice(0, 3)
                        .map(sub => (
                          <div key={sub.id} className="flex justify-between">
                            <span className="text-gray-600">{sub.serviceName}</span>
                            <span className="text-orange-600 font-medium">{sub.daysUntilRenewal} days</span>
                          </div>
                        ))}
                      {adminData.subscriptionsWithNextRenewal.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30).length === 0 && (
                        <p className="text-gray-500 text-sm">No upcoming renewals</p>
                      )}
                    </div>
                    <Link href="/admin/subscriptions">
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                        View All Renewals →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Pending Approvals */}
                <Card className="bg-white border-l-4 border-l-red-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Pending Approvals</CardTitle>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {adminData.pendingSuppliers + adminData.pendingPurchaseRequests + adminData.pendingChangeRequests + adminData.pendingLeaveRequests} Waiting
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.pendingLeaveRequests > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Leave Requests</span>
                          <span className="text-red-600 font-medium">{adminData.pendingLeaveRequests}</span>
                        </div>
                      )}
                      {adminData.pendingPurchaseRequests > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Purchase Requests</span>
                          <span className="text-red-600 font-medium">{adminData.pendingPurchaseRequests}</span>
                        </div>
                      )}
                      {adminData.pendingChangeRequests > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Profile Changes</span>
                          <span className="text-orange-600 font-medium">{adminData.pendingChangeRequests}</span>
                        </div>
                      )}
                      {adminData.pendingSuppliers > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Suppliers</span>
                          <span className="text-red-600 font-medium">{adminData.pendingSuppliers}</span>
                        </div>
                      )}
                      {adminData.pendingSuppliers === 0 && adminData.pendingPurchaseRequests === 0 && adminData.pendingChangeRequests === 0 && adminData.pendingLeaveRequests === 0 && (
                        <p className="text-gray-500 text-sm">No pending approvals</p>
                      )}
                    </div>
                    {adminData.pendingLeaveRequests > 0 ? (
                      <Link href="/admin/leave/requests">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Leave Requests →
                        </Button>
                      </Link>
                    ) : adminData.pendingPurchaseRequests > 0 ? (
                      <Link href="/admin/purchase-requests">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Purchase Requests →
                        </Button>
                      </Link>
                    ) : adminData.pendingChangeRequests > 0 ? (
                      <Link href="/admin/employees/change-requests">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Change Requests →
                        </Button>
                      </Link>
                    ) : adminData.pendingSuppliers > 0 ? (
                      <Link href="/admin/suppliers">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Suppliers →
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/admin/leave">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          View Approvals →
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                {/* HR Alerts */}
                <Card className="bg-white border-l-4 border-l-purple-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">HR Alerts</CardTitle>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {adminData.expiringDocuments + adminData.incompleteOnboarding} Items
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.expiringDocuments > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Expiring Documents</span>
                          <span className="text-red-600 font-medium">{adminData.expiringDocuments}</span>
                        </div>
                      )}
                      {adminData.incompleteOnboarding > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Incomplete Onboarding</span>
                          <span className="text-orange-600 font-medium">{adminData.incompleteOnboarding}</span>
                        </div>
                      )}
                      {adminData.expiringDocuments === 0 && adminData.incompleteOnboarding === 0 && (
                        <p className="text-gray-500 text-sm">All clear!</p>
                      )}
                    </div>
                    {adminData.expiringDocuments > 0 ? (
                      <Link href="/admin/employees/document-expiry">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          View Expiring Documents →
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/admin/employees">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          View Employees →
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                {/* Company Documents */}
                <Card className="bg-white border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Company Documents</CardTitle>
                      <Badge variant="outline" className={`${(adminData.expiredCompanyDocs + adminData.expiringCompanyDocs) > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {adminData.expiredCompanyDocs + adminData.expiringCompanyDocs > 0 ? `${adminData.expiredCompanyDocs + adminData.expiringCompanyDocs} Alerts` : 'OK'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.expiredCompanyDocs > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Expired</span>
                          <span className="text-red-600 font-medium">{adminData.expiredCompanyDocs}</span>
                        </div>
                      )}
                      {adminData.expiringCompanyDocs > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Expiring Soon</span>
                          <span className="text-orange-600 font-medium">{adminData.expiringCompanyDocs}</span>
                        </div>
                      )}
                      {adminData.expiredCompanyDocs === 0 && adminData.expiringCompanyDocs === 0 && (
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" /> All documents valid
                        </p>
                      )}
                    </div>
                    <Link href="/admin/company-documents">
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                        View Company Documents →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.recentActivity.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex justify-between items-center hover:bg-gray-50 rounded p-1 -mx-1">
                          <span className="text-gray-600 truncate max-w-[120px]">{activity.action.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400 text-xs">{new Date(activity.at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {adminData.recentActivity.length === 0 && (
                        <p className="text-gray-500 text-sm">No recent activity</p>
                      )}
                    </div>
                    <Link href="/admin/activity">
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                        View All Activity →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

          {/* QUICK ACTIONS - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/assets/new">
                  <Button variant="outline" className="bg-white hover:bg-slate-50">
                    + Add Asset
                  </Button>
                </Link>
                <Link href="/admin/subscriptions/new">
                  <Button variant="outline" className="bg-white hover:bg-slate-50">
                    + Add Subscription
                  </Button>
                </Link>
                <Link href="/admin/employees/new">
                  <Button variant="outline" className="bg-white hover:bg-slate-50">
                    + Add Employee
                  </Button>
                </Link>
                <Link href="/admin/projects/new">
                  <Button variant="outline" className="bg-white hover:bg-slate-50">
                    + Add Project
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
