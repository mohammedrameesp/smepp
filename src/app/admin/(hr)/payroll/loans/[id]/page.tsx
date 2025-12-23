import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, User, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/payroll/utils';
import { LoanActions } from '@/components/payroll/loan-actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

function getLoanStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '#22c55e';
    case 'PAUSED':
      return '#eab308';
    case 'COMPLETED':
      return '#3b82f6';
    case 'WRITTEN_OFF':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export default async function LoanDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const { id } = await params;

  const loan = await prisma.employeeLoan.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          hrProfile: {
            select: {
              employeeId: true,
              designation: true,
            },
          },
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/admin/payroll/loans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Loan Details</h1>
              <Badge style={{ backgroundColor: getLoanStatusColor(loan.status) }} className="text-white">
                {loan.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {loan.loanNumber}
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href={`/admin/employees/${loan.userId}`}>
            <User className="mr-2 h-4 w-4" />
            View Employee
          </Link>
        </Button>
      </div>

      {/* Loan Actions */}
      <LoanActions
        loanId={loan.id}
        currentStatus={loan.status}
        remainingAmount={remainingAmount}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Loan Info */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Employee</div>
                <div className="font-medium">{loan.user.name}</div>
                <div className="text-sm text-muted-foreground">
                  {loan.user.hrProfile?.employeeId || loan.user.email}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Loan Type</div>
                <div className="font-medium">{loan.type.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">
                  {new Date(loan.startDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              {loan.endDate && (
                <div>
                  <div className="text-sm text-muted-foreground">Expected End Date</div>
                  <div className="font-medium">
                    {new Date(loan.endDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
              {loan.approvedBy && (
                <div>
                  <div className="text-sm text-muted-foreground">Approved By</div>
                  <div className="font-medium">{loan.approvedBy.name}</div>
                  {loan.approvedAt && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(loan.approvedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
              {loan.description && (
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium">{loan.description}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Amount Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Amount Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Repayment Progress</span>
                <span className="font-medium">{progressPercent.toFixed(1)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(paidAmount)} paid</span>
                <span>{formatCurrency(remainingAmount)} remaining</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Loan</div>
                <div className="text-xl font-bold">{formatCurrency(totalAmount)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Monthly Deduction</div>
                <div className="text-xl font-bold">{formatCurrency(monthlyDeduction)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Installments</div>
                <div className="text-xl font-bold">{loan.installmentsPaid} / {loan.installments}</div>
              </div>
              {loan.status === 'ACTIVE' && estimatedRemainingMonths > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600">Est. Remaining</div>
                  <div className="font-medium text-blue-800">
                    {estimatedRemainingMonths} month{estimatedRemainingMonths !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>

            {loan.status === 'COMPLETED' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600">Status</div>
                <div className="font-medium text-green-800">Fully Repaid</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repayment History */}
      <Card>
        <CardHeader>
          <CardTitle>Repayment History</CardTitle>
          <CardDescription>
            Record of all repayments for this loan
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {loan.repayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No repayments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                loan.repayments.map((repayment) => (
                  <TableRow key={repayment.id}>
                    <TableCell>
                      {new Date(repayment.paymentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(repayment.amount))}
                    </TableCell>
                    <TableCell>
                      {repayment.paymentMethod.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {repayment.reference || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repayment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {loan.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{loan.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Created on {new Date(loan.createdAt).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
