import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
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
import { ArrowLeft, Eye, Search } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusColor } from '@/lib/payroll/utils';

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
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;
  const yearFilter = params.year ? parseInt(params.year, 10) : undefined;
  const monthFilter = params.month ? parseInt(params.month, 10) : undefined;
  const search = params.search || '';

  const where: Record<string, unknown> = {};

  if (yearFilter) {
    where.payrollRun = { ...((where.payrollRun as object) || {}), year: yearFilter };
  }

  if (monthFilter) {
    where.payrollRun = { ...((where.payrollRun as object) || {}), month: monthFilter };
  }

  if (search) {
    where.user = {
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hrProfile: {
              select: {
                employeeId: true,
              },
            },
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
        { user: { name: 'asc' } },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
    prisma.payrollRun.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const availableYears = years.map((y) => y.year);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/payroll">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Search Payslips</h1>
            <p className="text-muted-foreground">
              Search and view all employee payslips
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <form method="GET" className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Search Employee</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                          <div className="font-medium">{payslip.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payslip.user.hrProfile?.employeeId || payslip.user.email}
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
      </div>
    </div>
  );
}
