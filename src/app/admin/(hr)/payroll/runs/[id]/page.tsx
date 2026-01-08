import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect, notFound } from 'next/navigation';
import { Role, PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Download, Eye, Clock, AlertCircle, CreditCard, CalendarOff } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusColor, getPayrollStatusText } from '@/lib/payroll/utils';
import { PayrollWorkflowActions } from '@/features/payroll/components';
import { calculatePayrollPreview } from '@/lib/payroll/preview';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayrollRunDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.teamMemberRole !== 'ADMIN') {
    redirect('/');
  }

  const { id } = await params;

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      processedBy: { select: { id: true, name: true } },
      paidBy: { select: { id: true, name: true } },
      payslips: {
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
          deductions: true,
        },
        orderBy: {
          member: { name: 'asc' },
        },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!payrollRun) {
    notFound();
  }

  // Calculate preview for DRAFT status
  const isDraft = payrollRun.status === PayrollStatus.DRAFT;
  const preview = isDraft
    ? await calculatePayrollPreview(payrollRun.year, payrollRun.month, payrollRun.periodEnd, session.user.organizationId!)
    : null;

  const totalGross = isDraft && preview ? preview.totalGross : Number(payrollRun.totalGross);
  const totalDeductions = isDraft && preview ? preview.totalDeductions : Number(payrollRun.totalDeductions);
  const totalNet = isDraft && preview ? preview.totalNet : Number(payrollRun.totalNet);
  const employeeCount = isDraft && preview ? preview.totalEmployees : payrollRun.employeeCount;

  return (
    <>
      <PageHeader
        title={`${getMonthName(payrollRun.month)} ${payrollRun.year} Payroll`}
        subtitle={`Reference: ${payrollRun.referenceNumber}`}
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Runs', href: '/admin/payroll/runs' },
          { label: `${getMonthName(payrollRun.month)} ${payrollRun.year}` },
        ]}
        badge={{
          text: getPayrollStatusText(payrollRun.status),
          variant: payrollRun.status === 'PAID' ? 'success' : payrollRun.status === 'DRAFT' ? 'warning' : 'default',
        }}
        actions={
          payrollRun.wpsFileGenerated && payrollRun.wpsFileUrl ? (
            <a href={payrollRun.wpsFileUrl} download>
              <PageHeaderButton variant="secondary">
                <Download className="h-4 w-4" />
                Download WPS
              </PageHeaderButton>
            </a>
          ) : undefined
        }
      />
      <PageContent className="space-y-6">

      {/* Workflow Actions */}
      <PayrollWorkflowActions
        payrollRunId={payrollRun.id}
        currentStatus={payrollRun.status}
        hasPayslips={payrollRun.payslips.length > 0}
        wpsGenerated={payrollRun.wpsFileGenerated}
      />

      {/* Summary Stats */}
      <StatsCardGrid columns={4}>
        <StatsCard
          title="Employees"
          subtitle="In this run"
          value={employeeCount}
          icon="users"
          color="blue"
        />
        <StatsCard
          title="Total Gross"
          subtitle=""
          value={formatCurrency(totalGross)}
          icon="wallet"
          color="amber"
        />
        <StatsCard
          title="Deductions"
          subtitle=""
          value={`-${formatCurrency(totalDeductions)}`}
          icon="file-text"
          color="rose"
        />
        <StatsCard
          title="Net Pay"
          subtitle=""
          value={formatCurrency(totalNet)}
          icon="wallet"
          color="emerald"
        />
      </StatsCardGrid>

      {/* Preview for DRAFT status */}
      {isDraft && preview && (
        <>
          {/* Deductions Summary */}
          {(preview.totalLoanDeductions > 0 || preview.totalLeaveDeductions > 0) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  Expected Deductions Summary
                </CardTitle>
                <CardDescription className="text-amber-700">
                  These deductions will be applied when you process the payroll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {preview.totalLoanDeductions > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <CreditCard className="h-8 w-8 text-blue-500" />
                      <div>
                        <div className="text-sm text-muted-foreground">Loan Deductions</div>
                        <div className="text-xl font-bold text-red-600">
                          -{formatCurrency(preview.totalLoanDeductions)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {preview.employees.filter(e => e.loanDeductions.length > 0).length} employee(s)
                        </div>
                      </div>
                    </div>
                  )}
                  {preview.totalLeaveDeductions > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <CalendarOff className="h-8 w-8 text-orange-500" />
                      <div>
                        <div className="text-sm text-muted-foreground">Unpaid Leave Deductions</div>
                        <div className="text-xl font-bold text-red-600">
                          -{formatCurrency(preview.totalLeaveDeductions)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {preview.employees.filter(e => e.leaveDeductions.length > 0).length} employee(s)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Payroll Preview ({preview.totalEmployees} employees)
              </CardTitle>
              <CardDescription>
                Preview of expected salaries and deductions. Process the payroll to generate actual payslips.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Deduction Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.employees.map((emp) => (
                    <TableRow key={emp.memberId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{emp.memberName}</div>
                          <div className="text-sm text-muted-foreground">
                            {emp.employeeCode || emp.designation || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(emp.grossSalary)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {emp.totalDeductions > 0 ? `-${formatCurrency(emp.totalDeductions)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(emp.netSalary)}
                      </TableCell>
                      <TableCell>
                        {emp.loanDeductions.length === 0 && emp.leaveDeductions.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No deductions</span>
                        ) : (
                          <div className="space-y-1">
                            {emp.loanDeductions.map((loan) => (
                              <div key={loan.loanId} className="text-xs">
                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  {loan.type}: {formatCurrency(loan.deductionAmount)}
                                </Badge>
                              </div>
                            ))}
                            {emp.leaveDeductions.map((leave) => (
                              <div key={leave.leaveRequestId} className="text-xs">
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  <CalendarOff className="h-3 w-3 mr-1" />
                                  {leave.leaveTypeName} ({leave.totalDays}d): {formatCurrency(leave.deductionAmount)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payslips Table (for processed payrolls) */}
      {!isDraft && (
        <Card>
          <CardHeader>
            <CardTitle>Payslips ({payrollRun.payslips.length})</CardTitle>
            <CardDescription>
              Individual employee payslips for this payroll run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payslip No.</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRun.payslips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No payslips found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollRun.payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payslip.member?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payslip.member?.employeeCode || payslip.member?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payslip.payslipNumber}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(payslip.grossSalary))}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(Number(payslip.totalDeductions))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(payslip.netSalary))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payslip.isPaid ? 'default' : 'secondary'}>
                          {payslip.isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/payroll/payslips/${payslip.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Workflow and change history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollRun.history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <div className="p-2 bg-muted rounded-full">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{entry.action.replace(/_/g, ' ')}</div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.performedBy?.name || 'System'} •{' '}
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-full">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Created</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {payrollRun.createdBy?.name || 'System'} •{' '}
                  {new Date(payrollRun.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </PageContent>
    </>
  );
}
