import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { PayrollStatus, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  FileText,
  CreditCard,
  Calculator,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/core/currency';
import { getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/features/payroll/lib/utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ICON_SIZES } from '@/lib/constants';

export default async function PayrollDashboardPage() {
  const session = await getServerSession(authOptions);
  // Allow access for admins OR users with Finance access
  const hasAccess = session?.user?.isAdmin || session?.user?.hasFinanceAccess;
  if (!session || !hasAccess) {
    redirect('/');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  // Get statistics
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [
    employeesWithSalary,
    totalSalaryStructures,
    pendingPayrolls,
    currentMonthPayroll,
    activeLoans,
    recentPayrollRuns,
  ] = await Promise.all([
    prisma.salaryStructure.count({ where: { tenantId, isActive: true } }),
    prisma.salaryStructure.aggregate({
      where: { tenantId, isActive: true },
      _sum: { grossSalary: true },
    }),
    prisma.payrollRun.count({
      where: { tenantId, status: { in: [PayrollStatus.DRAFT, PayrollStatus.PENDING_APPROVAL] } },
    }),
    prisma.payrollRun.findFirst({
      where: { tenantId, year: currentYear, month: currentMonth },
    }),
    prisma.employeeLoan.findMany({
      where: { tenantId, status: LoanStatus.ACTIVE },
      select: { remainingAmount: true },
    }),
    prisma.payrollRun.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 5,
      include: {
        _count: { select: { payslips: true } },
      },
    }),
  ]);

  const totalMonthlyPayroll = Number(totalSalaryStructures._sum.grossSalary || 0);

  return (
    <>
      <PageHeader
        title="Payroll Management"
        subtitle="Manage employee salaries, payroll runs, and gratuity calculations"
        actions={
          <div className="flex gap-2">
            <PageHeaderButton href="/admin/payroll/gratuity" variant="secondary">
              <Calculator className={ICON_SIZES.sm} />
              Gratuity Report
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/runs/new" variant="primary">
              <Plus className={ICON_SIZES.sm} />
              New Payroll Run
            </PageHeaderButton>
          </div>
        }
      >
        <StatChipGroup>
          <StatChip value={employeesWithSalary} label="with salary" color="blue" href="/admin/payroll/salary-structures" />
          <StatChip value={formatCurrency(totalMonthlyPayroll)} label="monthly" color="emerald" />
          <StatChip
            value={pendingPayrolls}
            label="pending approval"
            color="amber"
            href="/admin/payroll/runs?status=PENDING_APPROVAL"
            hideWhenZero
          />
          <StatChip
            value={activeLoans.length}
            label="active loans"
            color="purple"
            href="/admin/payroll/loans"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent className="space-y-6">

      {/* Current Month Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month: {getMonthName(currentMonth)} {currentYear}</CardTitle>
          <CardDescription>
            {currentMonthPayroll
              ? `Payroll run ${currentMonthPayroll.referenceNumber} is ${getPayrollStatusText(currentMonthPayroll.status)}`
              : 'No payroll run created for this month yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentMonthPayroll ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge
                  style={{ backgroundColor: getPayrollStatusColor(currentMonthPayroll.status) }}
                  className="text-white"
                >
                  {getPayrollStatusText(currentMonthPayroll.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {currentMonthPayroll.employeeCount} employees
                </span>
                <span className="font-medium">
                  {formatCurrency(Number(currentMonthPayroll.totalNet))} net
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/payroll/runs/${currentMonthPayroll.id}`}>
                  View Details
                  <ArrowRight className={`ml-2 ${ICON_SIZES.sm}`} />
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/admin/payroll/runs/new">
                <Plus className={`mr-2 ${ICON_SIZES.sm}`} />
                Create Payroll Run for {getMonthName(currentMonth)}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Links and Recent Payrolls */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/salary-structures">
                <Users className={`mr-2 ${ICON_SIZES.sm}`} />
                Manage Salary Structures
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/runs">
                <FileText className={`mr-2 ${ICON_SIZES.sm}`} />
                View All Payroll Runs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/payslips">
                <DollarSign className={`mr-2 ${ICON_SIZES.sm}`} />
                Search Payslips
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/loans">
                <CreditCard className={`mr-2 ${ICON_SIZES.sm}`} />
                Manage Loans & Advances
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Payroll Runs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayrollRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payroll runs yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayrollRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/admin/payroll/runs/${run.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">
                        {getMonthName(run.month)} {run.year}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {run._count.payslips} payslips
                      </div>
                    </div>
                    <Badge
                      style={{ backgroundColor: getPayrollStatusColor(run.status) }}
                      className="text-white"
                    >
                      {getPayrollStatusText(run.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </PageContent>
    </>
  );
}
