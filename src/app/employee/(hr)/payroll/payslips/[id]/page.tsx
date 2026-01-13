import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/features/payroll/lib/utils';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField } from '@/components/ui/info-field';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeePayslipDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const { id } = await params;

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
        },
      },
      payrollRun: {
        select: {
          year: true,
          month: true,
          status: true,
        },
      },
      deductions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!payslip) {
    notFound();
  }

  // Verify the user owns this payslip
  if (payslip.memberId !== session.user.id) {
    redirect('/employee/payroll');
  }

  const basicSalary = Number(payslip.basicSalary);
  const housingAllowance = Number(payslip.housingAllowance);
  const transportAllowance = Number(payslip.transportAllowance);
  const foodAllowance = Number(payslip.foodAllowance);
  const phoneAllowance = Number(payslip.phoneAllowance);
  const otherAllowances = Number(payslip.otherAllowances);
  const grossSalary = Number(payslip.grossSalary);
  const totalDeductions = Number(payslip.totalDeductions);
  const netSalary = Number(payslip.netSalary);

  return (
    <>
      <PageHeader
        title={`${getMonthName(payslip.payrollRun.month)} ${payslip.payrollRun.year} Payslip`}
        subtitle={`Payslip No: ${payslip.payslipNumber}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll', href: '/employee/payroll' },
          { label: 'Payslips', href: '/employee/payroll/payslips' },
          { label: 'Details' }
        ]}
        badge={{
          text: payslip.isPaid ? 'Paid' : 'Processing',
          variant: payslip.isPaid ? 'success' : 'default'
        }}
        actions={
          <PageHeaderButton href="/employee/payroll/payslips" variant="outline">
            <ArrowLeft className="h-4 w-4" />
            Back to Payslips
          </PageHeaderButton>
        }
      />

      <PageContent>
        <div className="space-y-6 max-w-4xl mx-auto">

        {/* Employee Details */}
        <DetailCard icon={Building} iconColor="indigo" title="Employee Information" subtitle="Your employment and payment details">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Employee</p>
              <p className="font-semibold text-slate-900">{payslip.member.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                {payslip.member.employeeCode}
              </p>
            </div>
            <InfoField label="Pay Period" value={`${getMonthName(payslip.payrollRun.month)} ${payslip.payrollRun.year}`} />
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Bank Account</p>
              <p className="font-semibold text-slate-900">{payslip.bankName || 'Not specified'}</p>
              {payslip.iban && (
                <p className="text-sm text-slate-500 font-mono mt-1">
                  ****{payslip.iban.slice(-4)}
                </p>
              )}
            </div>
          </div>
        </DetailCard>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Earnings */}
          <DetailCard icon={TrendingUp} iconColor="emerald" title="Earnings" subtitle="Your salary components">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Basic Salary</span>
                <span className="font-semibold text-slate-900">{formatCurrency(basicSalary)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Housing Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(housingAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Transport Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(transportAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Food Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(foodAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Phone Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(phoneAllowance)}</span>
              </div>
              {otherAllowances > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Other Allowances</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(otherAllowances)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 pt-4 font-semibold">
                <span className="text-slate-900">Total Earnings</span>
                <span className="text-emerald-600 text-lg">{formatCurrency(grossSalary)}</span>
              </div>
            </div>
          </DetailCard>

          {/* Deductions */}
          <DetailCard icon={TrendingDown} iconColor="rose" title="Deductions" subtitle="Amounts deducted from salary">
            <div className="space-y-3">
              {payslip.deductions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No deductions this month
                </p>
              ) : (
                payslip.deductions.map((deduction) => (
                  <div key={deduction.id} className="flex justify-between py-2 border-b border-slate-200">
                    <div>
                      <span className="text-slate-600">
                        {deduction.type.replace(/_/g, ' ')}
                      </span>
                      {deduction.description && (
                        <div className="text-xs text-slate-500 mt-1">
                          {deduction.description}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-rose-600">
                      -{formatCurrency(Number(deduction.amount))}
                    </span>
                  </div>
                ))
              )}
              <div className="flex justify-between py-3 pt-4 font-semibold">
                <span className="text-slate-900">Total Deductions</span>
                <span className="text-rose-600 text-lg">-{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </DetailCard>
        </div>

        {/* Net Pay Summary */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-6 w-6 text-emerald-700" />
                  <h3 className="text-xl font-semibold text-emerald-900">Net Pay</h3>
                </div>
                <p className="text-sm text-emerald-700">
                  Your take-home salary for {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                </p>
              </div>
              <div className="text-4xl font-bold text-emerald-700">
                {formatCurrency(netSalary)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {payslip.isPaid && payslip.paidAt && (
          <DetailCard icon={CreditCard} iconColor="blue" title="Payment Information" subtitle="Salary payment confirmation">
            <InfoField
              label="Payment Date"
              value={new Date(payslip.paidAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          </DetailCard>
        )}
        </div>
      </PageContent>
    </>
  );
}
