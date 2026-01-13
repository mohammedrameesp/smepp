import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calculator, CreditCard, ArrowRight, DollarSign, Wallet } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/features/payroll/lib/utils';
import { calculateGratuity, getServiceDurationText } from '@/features/payroll/lib/gratuity';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField } from '@/components/ui/info-field';

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
        <StatChipGroup>
          <StatChip
            value={formatCurrency(grossSalary)}
            label="monthly"
            color="emerald"
            icon={<DollarSign className="h-4 w-4" />}
            hideWhenZero
          />
          {gratuityCalculation && (
            <StatChip
              value={formatCurrency(gratuityCalculation.gratuityAmount)}
              label="gratuity"
              color="blue"
              icon={<Calculator className="h-4 w-4" />}
            />
          )}
          <StatChip
            value={formatCurrency(totalLoanRemaining)}
            label="loan balance"
            color="amber"
            icon={<Wallet className="h-4 w-4" />}
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>

      {/* Salary Overview */}
      {salaryStructure ? (
        <div className="mb-6">
          <DetailCard icon={DollarSign} iconColor="emerald" title="Salary Overview" subtitle="Your current monthly salary breakdown">
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
                <InfoField label="Housing" value={formatCurrency(Number(salaryStructure.housingAllowance))} size="sm" />
                <InfoField label="Transport" value={formatCurrency(Number(salaryStructure.transportAllowance))} size="sm" />
                <InfoField label="Food" value={formatCurrency(Number(salaryStructure.foodAllowance))} size="sm" />
                <InfoField label="Phone" value={formatCurrency(Number(salaryStructure.phoneAllowance))} size="sm" />
                <InfoField label="Other" value={formatCurrency(Number(salaryStructure.otherAllowances))} size="sm" />
              </div>
            </div>
          </DetailCard>
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
      <DetailCard
        icon={FileText}
        iconColor="blue"
        title="Recent Payslips"
        subtitle="Your payment history"
        actions={
          <Link href="/employee/payroll/payslips">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        }
      >
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
      </DetailCard>
      </PageContent>
    </>
  );
}
