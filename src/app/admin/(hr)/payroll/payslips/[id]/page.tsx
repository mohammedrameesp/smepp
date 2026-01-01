import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Wallet,
  Calendar,
  Building2,
  CreditCard,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Banknote,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { formatCurrency, getMonthName } from '@/lib/payroll/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPayslipDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
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
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/team/${payslip.memberId}`}>
              <User className="mr-2 h-4 w-4" />
              View Employee
            </Link>
          </Button>
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
                <Banknote className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Earnings</h2>
                <p className="text-sm text-slate-500">Salary and allowances</p>
              </div>
            </div>
            <div className="p-6">
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
                <div className="flex justify-between items-center pt-3 bg-emerald-50 -mx-6 px-6 py-4 -mb-6 rounded-b-xl">
                  <span className="font-semibold text-slate-900">Total Earnings</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(grossSalary)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Deductions</h2>
                <p className="text-sm text-slate-500">{payslip.deductions.length} deduction{payslip.deductions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="p-6">
              {payslip.deductions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                  <div className="flex justify-between items-center pt-3 bg-rose-50 -mx-6 px-6 py-4 -mb-6 rounded-b-xl">
                    <span className="font-semibold text-slate-900">Total Deductions</span>
                    <span className="text-xl font-bold text-rose-600">-{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Confirmation */}
          {payslip.isPaid && payslip.paidAt && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Payment Confirmation</h2>
              </div>
              <div className="p-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Payment Date</p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {new Date(payslip.paidAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Employee Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Employee Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-semibold text-slate-900">{payslip.member?.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Employee ID</p>
                <p className="text-sm font-semibold text-slate-900 font-mono">
                  {payslip.member?.employeeCode || 'N/A'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Designation</p>
                <p className="text-sm font-semibold text-slate-900">
                  {payslip.member?.designation || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Payment Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pay Period</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Payroll Reference</p>
                <p className="text-sm font-semibold text-slate-900 font-mono">
                  {payslip.payrollRun.referenceNumber}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bank</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{payslip.bankName || 'Not specified'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">IBAN</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 font-mono">{payslip.iban || 'N/A'}</p>
              </div>
              {payslip.qidNumber && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">QID</p>
                  <p className="text-sm font-semibold text-slate-900 font-mono">{payslip.qidNumber}</p>
                </div>
              )}
            </div>
          </div>

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
