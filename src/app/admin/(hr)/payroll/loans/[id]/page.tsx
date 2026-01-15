import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';

import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  User,
  CreditCard,
  CheckCircle,
  PauseCircle,
  XCircle,
  Banknote,
  Receipt,
  FileText,
  Clock,
} from 'lucide-react';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { formatCurrency } from '@/features/payroll/lib/utils';
import { LoanActions } from '@/features/payroll/components';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  PAUSED: {
    label: 'Paused',
    icon: PauseCircle,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  WRITTEN_OFF: {
    label: 'Written Off',
    icon: XCircle,
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    iconColor: 'text-rose-500',
  },
};

export default async function LoanDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  // Allow access for admins OR users with Finance access
  const hasAccess = session?.user?.isAdmin || session?.user?.hasFinanceAccess;
  if (!session || !hasAccess) {
    redirect('/');
  }

  const { id } = await params;

  const loan = await prisma.employeeLoan.findUnique({
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
      approvedBy: {
        select: { id: true, name: true },
      },
      repayments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!loan) {
    notFound();
  }

  const totalAmount = Number(loan.totalAmount);
  const remainingAmount = Number(loan.remainingAmount);
  const monthlyDeduction = Number(loan.monthlyDeduction);
  const paidAmount = Number(loan.totalPaid);
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const estimatedRemainingMonths = monthlyDeduction > 0 ? Math.ceil(remainingAmount / monthlyDeduction) : 0;

  const status = statusConfig[loan.status as keyof typeof statusConfig] || statusConfig.ACTIVE;

  const statusBadgeVariant = loan.status === 'ACTIVE' ? 'success' :
    loan.status === 'PAUSED' ? 'warning' :
    loan.status === 'COMPLETED' ? 'info' :
    loan.status === 'WRITTEN_OFF' ? 'error' : 'default';

  return (
    <>
      <PageHeader
        title={loan.member?.name || 'Unknown'}
        subtitle={`${loan.loanNumber} • ${loan.type.replace(/_/g, ' ')}`}
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Loans', href: '/admin/payroll/loans' },
          { label: loan.loanNumber },
        ]}
        badge={{ text: status.label, variant: statusBadgeVariant }}
        actions={
          <div className="flex gap-2">
            <PageHeaderButton href={`/admin/employees/${loan.memberId}`} variant="outline">
              <User className="h-4 w-4" />
              View Employee
            </PageHeaderButton>
            <LoanActions
              loanId={loan.id}
              currentStatus={loan.status}
              remainingAmount={remainingAmount}
            />
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Summary */}
          <DetailCard icon={Banknote} iconColor="emerald" title="Amount Summary" subtitle="Loan progress and balances">
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Repayment Progress</span>
                  <span className="font-semibold text-slate-900">{progressPercent.toFixed(1)}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">{formatCurrency(paidAmount)} paid</span>
                  <span className="text-slate-500">{formatCurrency(remainingAmount)} remaining</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Loan</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Monthly Deduction</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(monthlyDeduction)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Installments</p>
                  <p className="text-xl font-bold text-slate-900">{loan.installmentsPaid} / {loan.installments}</p>
                </div>
                {loan.status === 'ACTIVE' && estimatedRemainingMonths > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Est. Remaining</p>
                    <p className="text-xl font-bold text-blue-700">
                      {estimatedRemainingMonths} month{estimatedRemainingMonths !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {loan.status === 'COMPLETED' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-700">Loan Fully Repaid</p>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Repayment History */}
          <DetailCard
            icon={Receipt}
            iconColor="indigo"
            title="Repayment History"
            subtitle={`${loan.repayments.length} payment${loan.repayments.length !== 1 ? 's' : ''} recorded`}
          >
            {loan.repayments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No repayments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loan.repayments.map((repayment) => (
                      <TableRow key={repayment.id}>
                        <TableCell className="text-slate-600">
                          {new Date(repayment.paymentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                          {formatCurrency(Number(repayment.amount))}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {repayment.paymentMethod.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">
                          {repayment.reference || '-'}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {repayment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DetailCard>

          {/* Notes */}
          {loan.notes && (
            <DetailCard icon={FileText} iconColor="amber" title="Notes">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-700 leading-relaxed">{loan.notes}</p>
              </div>
            </DetailCard>
          )}
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Loan Information */}
          <DetailCard icon={CreditCard} iconColor="blue" title="Loan Details">
            <InfoFieldGrid columns={1}>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Employee</p>
                <p className="text-sm font-semibold text-slate-900">{loan.member?.name}</p>
                <p className="text-xs text-slate-500">{loan.member?.employeeCode || loan.member?.email}</p>
              </div>
              <InfoField label="Loan Type" value={loan.type.replace(/_/g, ' ')} />
              <InfoField
                label="Start Date"
                value={new Date(loan.startDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {loan.endDate && (
                <InfoField
                  label="Expected End"
                  value={new Date(loan.endDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              )}
            </InfoFieldGrid>
          </DetailCard>

          {/* Approval Information */}
          {loan.approvedBy && (
            <DetailCard icon={CheckCircle} iconColor="emerald" title="Approval">
              <InfoFieldGrid columns={1}>
                <InfoField label="Approved By" value={loan.approvedBy.name} />
                {loan.approvedAt && (
                  <InfoField
                    label="Approved On"
                    value={new Date(loan.approvedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  />
                )}
              </InfoFieldGrid>
            </DetailCard>
          )}

          {/* Record Information */}
          <DetailCard icon={Clock} iconColor="slate" title="Record Information">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">
                  {new Date(loan.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900">
                  {new Date(loan.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </DetailCard>
        </div>
        </div>
      </PageContent>
    </>
  );
}
