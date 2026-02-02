/**
 * @module LoansPage
 * @description Employee loans management page. Lists all employee loans with
 * filtering by status, pagination, and statistics on active/paused/completed loans.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { LoanStatus } from '@prisma/client';
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
import { Plus, Eye, FileText, Users, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/core/currency';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ICON_SIZES } from '@/lib/constants';

/** Props for the loans page including search params */
interface PageProps {
  searchParams: Promise<{
    status?: string;
    p?: string;
  }>;
}

/**
 * Maps loan status to badge variant for consistent UI styling
 * @param status - The loan status from the database
 * @returns Badge variant string
 */
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

/**
 * Loans List Page Component
 *
 * Server component that displays paginated list of employee loans
 * with status filtering and aggregate statistics.
 *
 * @param searchParams - URL search parameters for filtering and pagination
 * @returns The rendered loans list page
 */
export default async function LoansPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  // Authorization check: require admin role OR finance access
  const hasAccess = session?.user?.isAdmin || session?.user?.hasFinanceAccess;
  if (!session || !hasAccess) {
    redirect('/');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  // Parse and validate search parameters
  const params = await searchParams;
  const statusFilter = params.status as LoanStatus | undefined;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;

  // Build tenant-scoped query with optional status filter
  const where: Record<string, unknown> = { tenantId };
  if (statusFilter && Object.values(LoanStatus).includes(statusFilter)) {
    where.status = statusFilter;
  }

  // Fetch loans, total count, and statistics in parallel
  const [loans, total, stats] = await Promise.all([
    prisma.employeeLoan.findMany({
      where,
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
          select: { name: true },
        },
        repayments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employeeLoan.count({ where }),
    prisma.employeeLoan.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      _sum: {
        remainingAmount: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Transform grouped stats into a lookup map for easier access
  const statsMap = stats.reduce((acc, stat) => {
    acc[stat.status] = {
      count: stat._count,
      remaining: Number(stat._sum.remainingAmount || 0),
    };
    return acc;
  }, {} as Record<string, { count: number; remaining: number }>);

  // Extract individual statistics for display
  const activeLoansValue = statsMap['ACTIVE']?.remaining || 0;
  const activeLoansCount = statsMap['ACTIVE']?.count || 0;
  const pausedCount = statsMap['PAUSED']?.count || 0;
  const completedCount = statsMap['COMPLETED']?.count || 0;

  return (
    <>
      <PageHeader
        title="Employee Loans"
        subtitle="Manage employee loans and advances"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Loans' },
        ]}
        actions={
          <>
            <PageHeaderButton href="/admin/payroll/loans/new" variant="primary">
              <Plus className={ICON_SIZES.sm} />
              New Loan
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/runs" variant="secondary">
              <FileText className={ICON_SIZES.sm} />
              Payroll Runs
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/salary-structures" variant="secondary">
              <Users className={ICON_SIZES.sm} />
              Salary Structures
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/payslips" variant="secondary">
              <DollarSign className={ICON_SIZES.sm} />
              Payslips
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={`${activeLoansCount} (${formatCurrency(activeLoansValue)})`} label="active" color="blue" />
          <StatChip value={pausedCount} label="paused" color="amber" hideWhenZero />
          <StatChip value={completedCount} label="completed" color="emerald" />
          <StatChip value={total} label="total" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
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
                        <div className="font-medium">{loan.member?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {loan.member?.employeeCode || loan.member?.email}
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
                          <Eye className={ICON_SIZES.sm} />
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
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top of file
 *   - Added JSDoc documentation for PageProps interface
 *   - Added JSDoc documentation for getLoanStatusVariant helper function
 *   - Added JSDoc function documentation with return type
 *   - Added inline comments for query building and statistics
 *   - Verified tenant isolation (tenantId used in all queries)
 *   - Verified Promise.all pattern for parallel queries (no N+1 issues)
 * Issues: None
 */
