import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role, LoanStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
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
import { Plus, Eye, CreditCard, PauseCircle, CheckCircle, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/payroll/utils';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    p?: string;
  }>;
}

function getLoanStatusVariant(status: LoanStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'PAUSED':
      return 'secondary';
    case 'COMPLETED':
      return 'outline';
    case 'WRITTEN_OFF':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default async function LoansPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const params = await searchParams;
  const statusFilter = params.status as LoanStatus | undefined;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (statusFilter && Object.values(LoanStatus).includes(statusFilter)) {
    where.status = statusFilter;
  }

  const [loans, total, stats] = await Promise.all([
    prisma.employeeLoan.findMany({
      where,
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
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employeeLoan.count({ where }),
    prisma.employeeLoan.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        remainingAmount: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const statsMap = stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: stat._count,
      remaining: Number(stat._sum.remainingAmount || 0),
    };
    return acc;
  }, {} as Record<string, { count: number; remaining: number }>);

  const activeLoansValue = statsMap['ACTIVE']?.remaining || 0;
  const activeLoansCount = statsMap['ACTIVE']?.count || 0;
  const pausedCount = statsMap['PAUSED']?.count || 0;
  const completedCount = statsMap['COMPLETED']?.count || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Loans</h1>
          <p className="text-slate-500 text-sm">Manage employee loans and advances</p>
        </div>
        <Link
          href="/admin/payroll/loans/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Loan
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Active Loans"
          subtitle={`${formatCurrency(activeLoansValue)} outstanding`}
          value={activeLoansCount}
          icon={CreditCard}
          color="blue"
        />
        <StatsCard
          title="Paused"
          subtitle="Temporarily stopped"
          value={pausedCount}
          icon={PauseCircle}
          color="amber"
        />
        <StatsCard
          title="Completed"
          subtitle="Fully repaid"
          value={completedCount}
          icon={CheckCircle}
          color="emerald"
        />
        <StatsCard
          title="Total Loans"
          subtitle="All records"
          value={total}
          icon={Wallet}
          color="purple"
        />
      </StatsCardGrid>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Button
          asChild
          variant={!statusFilter ? 'default' : 'outline'}
          size="sm"
        >
          <Link href="/admin/payroll/loans">All</Link>
        </Button>
        {Object.values(LoanStatus).map((status) => (
          <Button
            key={status}
            asChild
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
          >
            <Link href={`/admin/payroll/loans?status=${status}`}>
              {status.replace(/_/g, ' ')}
            </Link>
          </Button>
        ))}
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Loans ({total})</h2>
          <p className="text-sm text-slate-500">All employee loan records</p>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan No.</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No loans found
                  </TableCell>
                </TableRow>
              ) : (
                loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono text-sm">
                      {loan.loanNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{loan.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {loan.user.hrProfile?.employeeId || loan.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {loan.type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(loan.totalAmount))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(loan.remainingAmount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(loan.monthlyDeduction))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLoanStatusVariant(loan.status)}>
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/payroll/loans/${loan.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/payroll/loans?p=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              <span className="py-2 px-3 text-sm">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/payroll/loans?p=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
