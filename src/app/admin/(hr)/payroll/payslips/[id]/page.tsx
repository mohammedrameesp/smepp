import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';

import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  User,
  Wallet,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
} from 'lucide-react';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/core/currency';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';
import { formatDate } from '@/lib/core/datetime';
import { getMonthName } from '@/features/payroll/lib/utils';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPayslipDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  // Allow access for admins OR users with Finance access
  const hasAccess = session?.user?.isAdmin || session?.user?.hasFinanceAccess;
  if (!session || !hasAccess) {
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
          email: true,
          employeeCode: true,
          designation: true,
        },
      },
      payrollRun: {
        select: {
          id: true,
          year: true,
          month: true,
          status: true,
          referenceNumber: true,
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

  const basicSalary = Number(payslip.basicSalary);
  const housingAllowance = Number(payslip.housingAllowance);
  const transportAllowance = Number(payslip.transportAllowance);
  const foodAllowance = Number(payslip.foodAllowance);
  const phoneAllowance = Number(payslip.phoneAllowance);
  const otherAllowances = Number(payslip.otherAllowances);
  const grossSalary = Number(payslip.grossSalary);
  const totalDeductions = Number(payslip.totalDeductions);
  const netSalary = Number(payslip.netSalary);

  const statusBadgeVariant = payslip.isPaid ? 'success' : 'warning';

  return (
    <>
      <PageHeader
        title={payslip.member?.name || 'Unknown'}
        subtitle={`${payslip.payslipNumber} • ${getMonthName(payslip.payrollRun.month)} ${payslip.payrollRun.year}`}
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Payroll Runs', href: '/admin/payroll/runs' },
          { label: `${getMonthName(payslip.payrollRun.month)} ${payslip.payrollRun.year}`, href: `/admin/payroll/runs/${payslip.payrollRun.id}` },
          { label: payslip.payslipNumber },
        ]}
        badge={{ text: payslip.isPaid ? 'Paid' : 'Pending', variant: statusBadgeVariant }}
        actions={
          <PageHeaderButton href={`/admin/employees/${payslip.memberId}`} variant="outline">
            <User className={ICON_SIZES.sm} />
            View Employee
          </PageHeaderButton>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Net Pay Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Net Pay</p>
                <p className="text-4xl font-bold mt-1 text-emerald-600">{formatCurrency(netSalary)}</p>
                <p className="text-slate-500 text-sm mt-2">
                  For {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                </p>
              </div>
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Banknote className={cn(ICON_SIZES.xl, "text-emerald-600")} />
              </div>
            </div>
          </div>

          {/* Earnings */}
          <DetailCard icon={TrendingUp} iconColor="emerald" title="Earnings" subtitle="Salary and allowances">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Basic Salary</span>
                <span className="font-semibold text-slate-900">{formatCurrency(basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Housing Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(housingAllowance)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Transport Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(transportAllowance)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Food Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(foodAllowance)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Phone Allowance</span>
                <span className="font-semibold text-slate-900">{formatCurrency(phoneAllowance)}</span>
              </div>
              {otherAllowances > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-600">Other Allowances</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(otherAllowances)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 bg-emerald-50 -mx-5 px-5 py-4 -mb-5 rounded-b-xl">
                <span className="font-semibold text-slate-900">Total Earnings</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(grossSalary)}</span>
              </div>
            </div>
          </DetailCard>

          {/* Deductions */}
          <DetailCard
            icon={TrendingDown}
            iconColor="rose"
            title="Deductions"
            subtitle={`${payslip.deductions.length} deduction${payslip.deductions.length !== 1 ? 's' : ''}`}
          >
            {payslip.deductions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <TrendingDown className={`${ICON_SIZES['3xl']} mx-auto mb-2 opacity-50`} />
                <p className="text-sm">No deductions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payslip.deductions.map((deduction) => (
                  <div key={deduction.id} className="flex justify-between items-center py-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-600">{deduction.type.replace(/_/g, ' ')}</span>
                      {deduction.description && (
                        <p className="text-xs text-slate-400">{deduction.description}</p>
                      )}
                    </div>
                    <span className="font-semibold text-rose-600">
                      -{formatCurrency(Number(deduction.amount))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 bg-rose-50 -mx-5 px-5 py-4 -mb-5 rounded-b-xl">
                  <span className="font-semibold text-slate-900">Total Deductions</span>
                  <span className="text-xl font-bold text-rose-600">-{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            )}
          </DetailCard>

          {/* Payment Confirmation */}
          {payslip.isPaid && payslip.paidAt && (
            <DetailCard icon={CheckCircle} iconColor="emerald" title="Payment Confirmation">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Payment Date</p>
                <p className="text-sm font-semibold text-emerald-700">
                  {formatDate(payslip.paidAt)}
                </p>
              </div>
            </DetailCard>
          )}
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Employee Details */}
          <DetailCard icon={User} iconColor="blue" title="Employee Details">
            <InfoFieldGrid columns={1}>
              <InfoField label="Name" value={payslip.member?.name} />
              <InfoField label="Employee ID" value={payslip.member?.employeeCode || 'N/A'} mono />
              <InfoField label="Designation" value={payslip.member?.designation || 'N/A'} />
            </InfoFieldGrid>
          </DetailCard>

          {/* Payment Details */}
          <DetailCard icon={Wallet} iconColor="purple" title="Payment Details">
            <InfoFieldGrid columns={1}>
              <InfoField
                label="Pay Period"
                value={`${getMonthName(payslip.payrollRun.month)} ${payslip.payrollRun.year}`}
              />
              <InfoField label="Payroll Reference" value={payslip.payrollRun.referenceNumber} mono />
              <InfoField label="Bank" value={payslip.bankName || 'Not specified'} />
              <InfoField label="IBAN" value={payslip.iban || 'N/A'} mono />
              {payslip.qidNumber && (
                <InfoField label="QID" value={payslip.qidNumber} mono />
              )}
            </InfoFieldGrid>
          </DetailCard>

          {/* View Payroll Run Link */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <Button asChild className="w-full">
              <Link href={`/admin/payroll/runs/${payslip.payrollRun.id}`}>
                View Full Payroll Run
              </Link>
            </Button>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
