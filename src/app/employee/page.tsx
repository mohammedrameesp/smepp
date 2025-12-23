import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  CreditCard,
  Calendar,
  ShoppingCart,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  UserCircle,
  Building2,
  Search,
  CalendarDays,
  PalmtreeIcon,
} from 'lucide-react';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { formatDate } from '@/lib/date-format';
import { getAnnualLeaveDetails } from '@/lib/leave-utils';

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirect if not an employee
  if (session.user.role !== 'EMPLOYEE') {
    redirect('/');
  }

  try {
    // Get all data in parallel
    const [
      subscriptionHistory,
      assetHistory,
      purchaseRequests,
      hrProfile,
      leaveRequests,
      leaveBalances,
    ] = await Promise.all([
      getUserSubscriptionHistory(session.user.id),
      getUserAssetHistory(session.user.id),
      // Get user's purchase requests
      prisma.purchaseRequest.findMany({
        where: { requesterId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { items: true } },
        },
      }),
      // Get HR profile for document expiry alerts
      prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          qidNumber: true,
          qidExpiry: true,
          passportNumber: true,
          passportExpiry: true,
          healthCardExpiry: true,
          dateOfJoining: true,
        },
      }),
      // Get user's leave requests
      prisma.leaveRequest.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          leaveType: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      // Get user's leave balances for current year
      prisma.leaveBalance.findMany({
        where: {
          userId: session.user.id,
          year: new Date().getFullYear(),
        },
        include: {
          leaveType: {
            select: { id: true, name: true, color: true, category: true },
          },
        },
      }),
    ]);

    // Calculate stats
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');
    const pendingPurchaseRequests = purchaseRequests.filter((pr: any) => pr.status === 'PENDING');
    const pendingLeaveRequests = leaveRequests.filter((lr: any) => lr.status === 'PENDING');
    const approvedLeaveRequests = leaveRequests.filter((lr) => lr.status === 'APPROVED');

    // Get date of joining for accrual calculation
    const dateOfJoining = hrProfile?.dateOfJoining;
    const currentYear = new Date().getFullYear();
    const now = new Date();

    // Calculate total available leave days (only STANDARD and MEDICAL categories)
    // For accrual-based leave (Annual), use accrued amount instead of full entitlement
    const totalAvailableLeaveDays = leaveBalances
      .filter((b) => b.leaveType.category === 'STANDARD' || b.leaveType.category === 'MEDICAL')
      .reduce((sum, b) => {
        const leaveTypeName = b.leaveType.name;
        let effectiveEntitlement = Number(b.entitlement);

        // For Annual Leave, use accrued amount
        if (leaveTypeName === 'Annual Leave' && dateOfJoining) {
          const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
          effectiveEntitlement = annualDetails.accrued;
        }

        return sum + (effectiveEntitlement - Number(b.used) + Number(b.carriedForward) + Number(b.adjustment) - Number(b.pending));
      }, 0);

    // Get upcoming renewals for user's subscriptions
    const upcomingRenewals = activeSubscriptions
      .map((sub: any) => {
        if (!sub.currentPeriod?.renewalDate) return null;
        const nextRenewal = getNextRenewalDate(sub.currentPeriod.renewalDate, sub.billingCycle);
        const daysUntil = getDaysUntilRenewal(nextRenewal);
        if (daysUntil === null || daysUntil > 30) return null;
        return {
          ...sub,
          nextRenewalDate: nextRenewal,
          daysUntilRenewal: daysUntil,
        };
      })
      .filter(Boolean);

    // Calculate document expiry alerts
    const today = new Date();
    const documentAlerts: { type: string; expiry: Date; daysLeft: number }[] = [];

    if (hrProfile) {
      const checkExpiry = (date: Date | null, type: string) => {
        if (date) {
          const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 90) {
            documentAlerts.push({ type, expiry: date, daysLeft });
          }
        }
      };

      checkExpiry(hrProfile.qidExpiry, 'QID');
      checkExpiry(hrProfile.passportExpiry, 'Passport');
      checkExpiry(hrProfile.healthCardExpiry, 'Health Card');
    }

    documentAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {session.user.name}!
            </h1>
            <p className="text-gray-600 text-sm">
              Here&apos;s your workspace overview
            </p>
          </div>

          {/* Document Alert Banner */}
          {documentAlerts.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Document Expiry Alert</p>
                <p className="text-sm text-amber-700">
                  {documentAlerts.length === 1
                    ? `Your ${documentAlerts[0].type} ${documentAlerts[0].daysLeft <= 0 ? 'has expired' : `expires in ${documentAlerts[0].daysLeft} days`}`
                    : `You have ${documentAlerts.length} documents expiring soon`}
                </p>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  View Details →
                </Button>
              </Link>
            </div>
          )}

          {/* PRIMARY SECTION: Tasks + Purchase Requests */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Purchase Requests Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-0 border-b">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Purchase Requests</h2>
                      <p className="text-sm text-gray-500">Your submitted requests</p>
                    </div>
                  </div>
                  {pendingPurchaseRequests.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {pendingPurchaseRequests.length} pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {purchaseRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No purchase requests yet</p>
                    <p className="text-sm">Create your first request</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseRequests.slice(0, 4).map((pr) => (
                      <Link
                        key={pr.id}
                        href={`/employee/purchase-requests/${pr.id}`}
                        className="block"
                      >
                        <div className="flex items-start justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-gray-900 truncate">{pr.title}</p>
                              <Badge
                                variant={
                                  pr.status === 'APPROVED' ? 'default' :
                                  pr.status === 'REJECTED' ? 'destructive' :
                                  pr.status === 'PENDING' ? 'secondary' : 'outline'
                                }
                                className={`text-xs ${
                                  pr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  pr.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''
                                }`}
                              >
                                {pr.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {pr.referenceNumber} • {pr._count.items} item(s)
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(pr.createdAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-lg flex items-center justify-between">
                <Link href="/employee/purchase-requests" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/employee/purchase-requests/new">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                    + New Request
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* LEAVE MANAGEMENT SECTION */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Leave Requests Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-0 border-b">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <PalmtreeIcon className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Leave Requests</h2>
                      <p className="text-sm text-gray-500">Your submitted requests</p>
                    </div>
                  </div>
                  {pendingLeaveRequests.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {pendingLeaveRequests.length} pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <PalmtreeIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No leave requests yet</p>
                    <p className="text-sm">Submit your first leave request</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.slice(0, 4).map((lr) => (
                      <Link
                        key={lr.id}
                        href={`/employee/leave/requests/${lr.id}`}
                        className="block"
                      >
                        <div className="flex items-start justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: lr.leaveType.color }}
                              />
                              <p className="font-medium text-sm text-gray-900 truncate">{lr.leaveType.name}</p>
                              <Badge
                                variant={
                                  lr.status === 'APPROVED' ? 'default' :
                                  lr.status === 'REJECTED' ? 'destructive' :
                                  lr.status === 'PENDING' ? 'secondary' : 'outline'
                                }
                                className={`text-xs ${
                                  lr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  lr.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                  lr.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600' : ''
                                }`}
                              >
                                {lr.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {lr.requestNumber} • {Number(lr.totalDays)} day(s) • {formatDate(lr.startDate)} - {formatDate(lr.endDate)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-lg flex items-center justify-between">
                <Link href="/employee/leave" className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/employee/leave/new">
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                    + New Request
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Leave Balance Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-0 border-b">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <CalendarDays className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Leave Balance</h2>
                      <p className="text-sm text-gray-500">{new Date().getFullYear()} entitlement</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    {totalAvailableLeaveDays.toFixed(1)} days available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {leaveBalances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No leave balances set up</p>
                    <p className="text-sm">Contact HR to initialize your leave balance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveBalances
                      .filter((b) => b.leaveType.category === 'STANDARD' || b.leaveType.category === 'MEDICAL')
                      .slice(0, 4)
                      .map((balance) => {
                        const rawEntitlement = Number(balance.entitlement);
                        const used = Number(balance.used);
                        const carriedForward = Number(balance.carriedForward);
                        const adjustment = Number(balance.adjustment);
                        const pending = Number(balance.pending);

                        // For Annual Leave, calculate accrued amount
                        let effectiveEntitlement = rawEntitlement;
                        let isAccrualBased = false;
                        let annualEntitlement = 0;
                        let monthsWorked = 0;

                        if (balance.leaveType.name === 'Annual Leave' && dateOfJoining) {
                          const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
                          effectiveEntitlement = annualDetails.accrued;
                          isAccrualBased = true;
                          annualEntitlement = annualDetails.annualEntitlement;
                          monthsWorked = annualDetails.monthsWorked;
                        }

                        const available = effectiveEntitlement - used + carriedForward + adjustment - pending;
                        const usedPercentage = effectiveEntitlement > 0 ? (used / effectiveEntitlement) * 100 : 0;

                        return (
                          <div key={balance.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: balance.leaveType.color }}
                                />
                                <span className="font-medium text-sm text-gray-900">{balance.leaveType.name}</span>
                                {isAccrualBased && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                    Accrual
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-emerald-600">
                                {available.toFixed(1)} / {effectiveEntitlement.toFixed(1)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(usedPercentage, 100)}%`,
                                  backgroundColor: balance.leaveType.color,
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                              <span>Used: {used} days</span>
                              {isAccrualBased ? (
                                <span>{monthsWorked} mo of {annualEntitlement}/yr</span>
                              ) : (
                                pending > 0 && <span>Pending: {pending} days</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-lg">
                <Link href="/employee/leave" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  View Full Balance
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>

          {/* SECONDARY STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* My Holdings - Combined Assets & Subscriptions */}
            <Link href="/employee/my-assets">
              <Card className="p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">My Holdings</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">
                        <span className="font-bold text-blue-600">{activeAssets.length}</span> Assets
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs text-gray-600">
                        <span className="font-bold text-emerald-600">{activeSubscriptions.length}</span> Subscriptions
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>

            {/* Renewals - with names */}
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Renewals in 30 days</p>
                  {upcomingRenewals.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1">No upcoming renewals</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {upcomingRenewals.slice(0, 3).map((sub: any) => (
                        <p key={sub.id} className="text-xs text-amber-700 truncate">
                          • {sub.serviceName} ({sub.daysUntilRenewal}d)
                        </p>
                      ))}
                      {upcomingRenewals.length > 3 && (
                        <p className="text-xs text-amber-600 font-medium">
                          +{upcomingRenewals.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Suppliers */}
            <Link href="/employee/suppliers">
              <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-700">Suppliers</p>
                    <p className="text-xs text-indigo-600">Browse Directory</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-indigo-400" />
                </div>
              </Card>
            </Link>
          </div>

          {/* QUICK LINKS */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-500 font-medium">Quick Links:</span>
              <Link href="/employee/assets" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Browse Assets
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/employee/subscriptions" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Browse Subscriptions
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/employee/leave" className="text-gray-700 hover:text-teal-600 flex items-center gap-1">
                <PalmtreeIcon className="h-4 w-4" />
                Leave Management
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/profile" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <UserCircle className="h-4 w-4" />
                My Profile
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in EmployeeDashboard:', error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">An error occurred while loading your dashboard. Please try again later.</p>
              <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}
