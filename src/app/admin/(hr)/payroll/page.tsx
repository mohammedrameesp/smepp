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
  Clock,
  CreditCard,
  Calculator,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/lib/payroll/utils';

export default async function PayrollDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

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
    prisma.salaryStructure.count({ where: { isActive: true } }),
    prisma.salaryStructure.aggregate({
      where: { isActive: true },
      _sum: { grossSalary: true },
    }),
    prisma.payrollRun.count({
      where: { status: { in: [PayrollStatus.DRAFT, PayrollStatus.PENDING_APPROVAL] } },
    }),
    prisma.payrollRun.findUnique({
      where: { year_month: { year: currentYear, month: currentMonth } },
    }),
    prisma.employeeLoan.findMany({
      where: { status: LoanStatus.ACTIVE },
      select: { remainingAmount: true },
    }),
    prisma.payrollRun.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 5,
      include: {
        _count: { select: { payslips: true } },
      },
    }),
  ]);

  const totalMonthlyPayroll = Number(totalSalaryStructures._sum.grossSalary || 0);
  const totalLoanOutstanding = activeLoans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0);

  const stats = [
    {
      title: 'Employees with Salary',
      value: employeesWithSalary,
      icon: Users,
      href: '/admin/payroll/salary-structures',
      color: 'text-blue-600',
    },
    {
      title: 'Monthly Payroll',
      value: formatCurrency(totalMonthlyPayroll),
      icon: DollarSign,
      href: '/admin/payroll/runs',
      color: 'text-green-600',
    },
    {
      title: 'Pending Payrolls',
      value: pendingPayrolls,
      icon: Clock,
      href: '/admin/payroll/runs?status=PENDING_APPROVAL',
      color: 'text-amber-600',
    },
    {
      title: 'Active Loans',
      value: `${activeLoans.length} (${formatCurrency(totalLoanOutstanding)})`,
      icon: CreditCard,
      href: '/admin/payroll/loans',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">
            Manage employee salaries, payroll runs, and gratuity calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/payroll/gratuity">
              <Calculator className="mr-2 h-4 w-4" />
              Gratuity Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/payroll/runs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Payroll Run
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
      </div>
    </div>
  );
}
