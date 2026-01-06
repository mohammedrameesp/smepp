import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calculator, CreditCard, ArrowRight, DollarSign, Wallet } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/lib/payroll/utils';
import { calculateGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function EmployeePayrollPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const userId = session.user.id;

  // Get employee's salary structure, member profile, and recent payslips
  const [salaryStructure, member, recentPayslips, loans] = await Promise.all([
    prisma.salaryStructure.findUnique({
      where: { memberId: userId },
    }),
    prisma.teamMember.findUnique({
      where: { id: userId },
      select: {
        dateOfJoining: true,
        designation: true,
        employeeCode: true,
        bankName: true,
      },
    }),
    prisma.payslip.findMany({
      where: { memberId: userId },
      include: {
        payrollRun: {
          select: {
            year: true,
            month: true,
            status: true,
          },
        },
      },
      orderBy: [
        { payrollRun: { year: 'desc' } },
        { payrollRun: { month: 'desc' } },
      ],
      take: 6,
    }),
    prisma.employeeLoan.findMany({
      where: { memberId: userId, status: 'ACTIVE' },
      select: {
        id: true,
        loanNumber: true,
        type: true,
        remainingAmount: true,
        monthlyDeduction: true,
      },
    }),
  ]);

  // Calculate gratuity if data is available
  let gratuityCalculation = null;
  if (salaryStructure && member?.dateOfJoining) {
    const basicSalary = Number(salaryStructure.basicSalary);
    const dateOfJoining = new Date(member.dateOfJoining);
    gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);
  }

  const totalLoanRemaining = loans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0);
  const grossSalary = salaryStructure ? Number(salaryStructure.grossSalary) : 0;

  return (
    <>
      <PageHeader
        title="My Payroll"
        subtitle="View your salary details, payslips, and gratuity projection"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll' }
        ]}
        actions={
          <Link href="/employee/payroll/payslips">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              All Payslips
            </Button>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {grossSalary > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                {formatCurrency(grossSalary)} monthly
              </span>
            </div>
          )}
          {gratuityCalculation && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <Calculator className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">
                {formatCurrency(gratuityCalculation.gratuityAmount)} gratuity
              </span>
            </div>
          )}
          {totalLoanRemaining > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <Wallet className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {formatCurrency(totalLoanRemaining)} loan balance
              </span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>

      {/* Salary Overview */}
      {salaryStructure ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Salary Overview</h2>
              <p className="text-sm text-slate-500">Your current monthly salary breakdown</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Basic Salary</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(Number(salaryStructure.basicSalary))}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Allowances</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(
                    Number(salaryStructure.housingAllowance) +
                    Number(salaryStructure.transportAllowance) +
                    Number(salaryStructure.foodAllowance) +
                    Number(salaryStructure.phoneAllowance) +
                    Number(salaryStructure.otherAllowances)
                  )}
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Gross Salary</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(Number(salaryStructure.grossSalary))}
                </p>
              </div>
            </div>

            {/* Allowance Breakdown */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-900 mb-3">Allowance Breakdown</p>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Housing</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(Number(salaryStructure.housingAllowance))}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Transport</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(Number(salaryStructure.transportAllowance))}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Food</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(Number(salaryStructure.foodAllowance))}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(Number(salaryStructure.phoneAllowance))}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Other</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(Number(salaryStructure.otherAllowances))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center mb-6">
          <p className="text-slate-500">No salary structure set up yet. Please contact HR.</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Gratuity Projection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Gratuity Projection</p>
            <Calculator className="h-4 w-4 text-slate-400" />
          </div>
          {gratuityCalculation ? (
            <>
              <p className="text-2xl font-bold text-emerald-600 mb-1">
                {formatCurrency(gratuityCalculation.gratuityAmount)}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {getServiceDurationText(gratuityCalculation.monthsOfService)} of service
              </p>
              <Link href="/employee/payroll/gratuity" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center">
                View Details <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Not available - missing salary or joining date
            </p>
          )}
        </div>

        {/* Active Loans */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Active Loans</p>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </div>
          {loans.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(totalLoanRemaining)}
              </p>
              <p className="text-xs text-slate-500">
                {loans.length} active loan{loans.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No active loans</p>
          )}
        </div>

        {/* Recent Payslip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Latest Payslip</p>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          {recentPayslips.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(Number(recentPayslips[0].netSalary))}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {getMonthName(recentPayslips[0].payrollRun.month)} {recentPayslips[0].payrollRun.year}
              </p>
              <Link href={`/employee/payroll/payslips/${recentPayslips[0].id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center">
                View Payslip <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">No payslips yet</p>
          )}
        </div>
      </div>

      {/* Recent Payslips */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Recent Payslips</h2>
              <p className="text-sm text-slate-500">Your payment history</p>
            </div>
          </div>
          <Link href="/employee/payroll/payslips">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        <div className="p-5">
          {recentPayslips.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No payslips available yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentPayslips.map((payslip) => (
                <Link
                  key={payslip.id}
                  href={`/employee/payroll/payslips/${payslip.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                    </p>
                    <p className="text-sm text-slate-500 font-mono">
                      {payslip.payslipNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(Number(payslip.netSalary))}
                    </p>
                    <Badge
                      style={{ backgroundColor: getPayrollStatusColor(payslip.payrollRun.status) }}
                      className="text-white text-xs"
                    >
                      {payslip.isPaid ? 'Paid' : getPayrollStatusText(payslip.payrollRun.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      </PageContent>
    </>
  );
}
