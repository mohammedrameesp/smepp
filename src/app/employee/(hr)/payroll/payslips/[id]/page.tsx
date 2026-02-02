/**
 * @module app/employee/(hr)/payroll/payslips/[id]/page
 * @description Employee payslip detail page. Displays comprehensive breakdown of a
 * specific payslip including earnings, deductions, and net pay. Verifies ownership
 * to prevent unauthorized access to other employees' payslips.
 *
 * @route /employee/payroll/payslips/[id]
 * @access Authenticated employees (own payslips only)
 *
 * @dependencies
 * - prisma: Payslip with member and deductions data
 * - currency utilities: Formatting functions
 * - datetime utilities: Date formatting
 * - payroll utilities: Month names
 *
 * @features
 * - Employee information card
 * - Earnings breakdown (basic + all allowances)
 * - Itemized deductions list
 * - Net pay summary with prominent display
 * - Payment confirmation with date (if paid)
 * - Bank account masking for security
 * - Ownership verification before display
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { formatCurrency } from '@/lib/core/currency';
import { formatDate } from '@/lib/core/datetime';
import { getMonthName } from '@/features/payroll/lib/utils';
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
            <ArrowLeft className={ICON_SIZES.sm} />
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
                  <DollarSign className={`${ICON_SIZES.lg} text-emerald-700`} />
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
              value={formatDate(payslip.paidAt)}
            />
          </DetailCard>
        )}
        </div>
      </PageContent>
    </>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Detailed payslip view with earnings, deductions, and net pay breakdown
 *
 * Key Logic:
 * - Ownership verification: Redirects if payslip.memberId !== session.user.id
 * - Uses notFound() for non-existent payslip IDs
 * - Earnings breakdown: basic + all allowances = gross
 * - Deductions itemized from related PayslipDeduction records
 *
 * Data Flow:
 * - Server component with async params (Next.js 15 pattern)
 * - Single Prisma query with includes: member, payrollRun, deductions
 * - All Decimal fields converted to Number for display
 *
 * Security:
 * - Session check with redirect to root
 * - Ownership verification prevents IDOR access to other employees' payslips
 * - Bank IBAN masked to show only last 4 characters
 *
 * Display:
 * - Two-column layout for Earnings vs Deductions
 * - Net pay prominently displayed in green banner
 * - Payment date shown only if isPaid=true and paidAt exists
 * - Other allowances row hidden if amount is 0
 *
 * Edge Cases:
 * - Payslip not found: Returns Next.js notFound() response
 * - Not owner: Redirects to payroll dashboard
 * - No deductions: Shows "No deductions this month" message
 * - No bank info: Shows "Not specified" placeholder
 *
 * Dependencies:
 * - formatCurrency from currency lib
 * - formatDate from datetime lib
 * - getMonthName from payroll utils
 *
 * Future Considerations:
 * - PDF download/print functionality
 * - Year-to-date totals
 * - Comparison with previous months
 * - Digital signature verification
 */
