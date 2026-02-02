/**
 * @module app/admin/(hr)/payroll/payslips/page
 * @description Admin payslips search page - provides a searchable and filterable list
 * of all employee payslips across payroll runs. Supports filtering by year, month,
 * and employee name/email search. Displays payslip details including gross salary,
 * deductions, net pay, and payment status with pagination for large datasets.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';

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
import { Eye, Search, FileText, Users, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/core/currency';
import { getMonthName, getPayrollStatusColor } from '@/features/payroll/lib/utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ICON_SIZES } from '@/lib/constants';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    year?: string;
    month?: string;
    search?: string;
  }>;
}

export default async function PayslipsSearchPage({ searchParams }: PageProps) {
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
  const monthFilter = params.month ? parseInt(params.month, 10) : undefined;
  const search = params.search || '';

  const where: Record<string, unknown> = { tenantId };

  if (yearFilter) {
    where.payrollRun = { ...((where.payrollRun as object) || {}), year: yearFilter };
  }

  if (monthFilter) {
    where.payrollRun = { ...((where.payrollRun as object) || {}), month: monthFilter };
  }

  if (search) {
    where.member = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [payslips, total, years] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
          },
        },
        payrollRun: {
          select: {
            year: true,
            month: true,
            status: true,
          },
        },
      },
      orderBy: [
        { payrollRun: { year: 'desc' } },
        { payrollRun: { month: 'desc' } },
        { member: { name: 'asc' } },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
    prisma.payrollRun.findMany({
      where: { tenantId },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const availableYears = years.map((y) => y.year);

  return (
    <>
      <PageHeader
        title="Search Payslips"
        subtitle="Search and view all employee payslips"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Payslips' },
        ]}
        actions={
          <>
            <PageHeaderButton href="/admin/payroll/runs" variant="secondary">
              <FileText className={ICON_SIZES.sm} />
              Payroll Runs
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/salary-structures" variant="secondary">
              <Users className={ICON_SIZES.sm} />
              Salary Structures
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/gratuity" variant="secondary">
              <Calculator className={ICON_SIZES.sm} />
              Gratuity
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={total} label="payslips found" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <form method="GET" className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Search Employee</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${ICON_SIZES.sm} text-muted-foreground`} />
                  <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Name or email..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <select
                  name="year"
                  defaultValue={yearFilter || ''}
                  className="w-[120px] px-3 py-2 border rounded-md"
                >
                  <option value="">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Month</label>
                <select
                  name="month"
                  defaultValue={monthFilter || ''}
                  className="w-[140px] px-3 py-2 border rounded-md"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit">Search</Button>

              {(search || yearFilter || monthFilter) && (
                <Button asChild variant="outline">
                  <Link href="/admin/payroll/payslips">Clear</Link>
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Payslips ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payslip No.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No payslips found
                    </TableCell>
                  </TableRow>
                ) : (
                  payslips.map((payslip) => (
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
                      <TableCell>
                        {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
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
                        <Badge
                          style={{ backgroundColor: getPayrollStatusColor(payslip.payrollRun.status) }}
                          className="text-white"
                        >
                          {payslip.isPaid ? 'Paid' : 'Processing'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/payroll/payslips/${payslip.id}`}>
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
                      href={`/admin/payroll/payslips?p=${page - 1}${yearFilter ? `&year=${yearFilter}` : ''}${monthFilter ? `&month=${monthFilter}` : ''}${search ? `&search=${search}` : ''}`}
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
                      href={`/admin/payroll/payslips?p=${page + 1}${yearFilter ? `&year=${yearFilter}` : ''}${monthFilter ? `&month=${monthFilter}` : ''}${search ? `&search=${search}` : ''}`}
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Server-side rendered page for searching and browsing all employee payslips
 * with filtering capabilities.
 *
 * Key Features:
 * - Search by employee name or email
 * - Filter by year and month
 * - Paginated results (20 per page)
 * - Displays payslip summary (gross, deductions, net, status)
 * - Quick navigation to payslip detail pages
 * - Quick links to related payroll sections
 *
 * Data Flow:
 * - Server-side data fetching with Prisma
 * - URL-based filter state for bookmarkable searches
 * - Parallel data fetching for payslips, count, and available years
 *
 * Security:
 * - Requires authenticated session
 * - Access restricted to admins OR users with Finance access
 * - Tenant-scoped queries via tenantId filter
 *
 * Improvements Made:
 * - Uses Promise.all for parallel database queries
 * - Clean filter state management via search params
 * - Good use of shared UI components (PageHeader, StatChip, Table)
 *
 * Potential Improvements:
 * - Add export functionality (CSV/Excel)
 * - Consider adding bulk actions (mark as paid)
 * - Add sorting options for columns
 * - Consider infinite scroll for large datasets
 */
