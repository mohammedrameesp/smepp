import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { PayrollStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Eye, Users, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/features/payroll/lib/utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    year?: string;
    status?: string;
  }>;
}

export default async function PayrollRunsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  // Allow access for admins OR users with Finance access
  const hasAccess = session?.user?.isAdmin || session?.user?.hasFinanceAccess;
  if (!session || !hasAccess) {
    redirect('/');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;
  const yearFilter = params.year ? parseInt(params.year, 10) : undefined;
  const statusFilter = params.status as PayrollStatus | undefined;

  const where: Record<string, unknown> = { tenantId };
  if (yearFilter) where.year = yearFilter;
  if (statusFilter) where.status = statusFilter;

  const [runs, total] = await Promise.all([
    prisma.payrollRun.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { payslips: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payrollRun.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <PageHeader
        title="Payroll Runs"
        subtitle="Monthly payroll processing and management"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Runs' },
        ]}
        actions={
          <>
            <PageHeaderButton href="/admin/payroll/runs/new" variant="primary">
              <Plus className="h-4 w-4" />
              New Payroll Run
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/salary-structures" variant="secondary">
              <Users className="h-4 w-4" />
              Salary Structures
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/payslips" variant="secondary">
              <DollarSign className="h-4 w-4" />
              Payslips
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/loans" variant="secondary">
              <CreditCard className="h-4 w-4" />
              Loans
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={total} label="payroll runs" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent className="space-y-6">
        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
        <Button
          asChild
          variant={!statusFilter ? 'default' : 'outline'}
          size="sm"
        >
          <Link href="/admin/payroll/runs">All</Link>
        </Button>
        {Object.values(PayrollStatus).map((status) => (
          <Button
            key={status}
            asChild
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
          >
            <Link href={`/admin/payroll/runs?status=${status}`}>
              {getPayrollStatusText(status)}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No payroll runs found
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-sm">
                      {run.referenceNumber}
                    </TableCell>
                    <TableCell>
                      {getMonthName(run.month)} {run.year}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: getPayrollStatusColor(run.status) }}
                        className="text-white"
                      >
                        {getPayrollStatusText(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{run.employeeCount}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(run.totalGross))}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatCurrency(Number(run.totalDeductions))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(run.totalNet))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/payroll/runs/${run.id}`}>
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
                    href={`/admin/payroll/runs?p=${page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
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
                    href={`/admin/payroll/runs?p=${page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
