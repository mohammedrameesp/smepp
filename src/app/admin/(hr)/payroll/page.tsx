import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role, PayrollStatus, LoanStatus } from '@prisma/client';
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
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/lib/payroll/utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

export default async function PayrollDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.teamMemberRole !== 'ADMIN') {
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
  const totalLoanOutstanding = activeLoans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0);

  return (
    <>
      <PageHeader
        title="Payroll Management"
        subtitle="Manage employee salaries, payroll runs, and gratuity calculations"
        actions={
          <div className="flex gap-2">
            <PageHeaderButton href="/admin/payroll/gratuity" variant="secondary">
              <Calculator className="h-4 w-4" />
              Gratuity Report
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/runs/new" variant="primary">
              <Plus className="h-4 w-4" />
              New Payroll Run
            </PageHeaderButton>
          </div>
        }
      >
        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            href="/admin/payroll/salary-structures"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
          >
            <span className="text-blue-400 text-sm font-medium">{employeesWithSalary} with salary</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{formatCurrency(totalMonthlyPayroll)} monthly</span>
          </div>
          {pendingPayrolls > 0 && (
            <Link
              href="/admin/payroll/runs?status=PENDING_APPROVAL"
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
            >
              <span className="text-amber-400 text-sm font-medium">{pendingPayrolls} pending approval</span>
            </Link>
          )}
          {activeLoans.length > 0 && (
            <Link
              href="/admin/payroll/loans"
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              <span className="text-purple-400 text-sm font-medium">{activeLoans.length} active loans</span>
            </Link>
          )}
        </div>
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
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/admin/payroll/runs/new">
                <Plus className="mr-2 h-4 w-4" />
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
                <Users className="mr-2 h-4 w-4" />
                Manage Salary Structures
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/runs">
                <FileText className="mr-2 h-4 w-4" />
                View All Payroll Runs
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/payslips">
                <DollarSign className="mr-2 h-4 w-4" />
                Search Payslips
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/admin/payroll/loans">
                <CreditCard className="mr-2 h-4 w-4" />
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
