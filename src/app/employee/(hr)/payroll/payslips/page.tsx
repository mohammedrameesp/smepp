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
import { ArrowLeft, Eye } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusColor } from '@/lib/payroll/utils';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    year?: string;
  }>;
}

export default async function EmployeePayslipsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 12;
  const yearFilter = params.year ? parseInt(params.year, 10) : undefined;

  const where: Record<string, unknown> = {
    memberId: session.user.id,
  };

  if (yearFilter) {
    where.payrollRun = { year: yearFilter };
  }

  const [payslips, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: {
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
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payslip.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Get available years for filter
  const years = await prisma.payslip.findMany({
    where: { memberId: session.user.id },
    select: { payrollRun: { select: { year: true } } },
    distinct: ['payrollRunId'],
  });

  const availableYears = [...new Set(years.map((y) => y.payrollRun.year))].sort((a, b) => b - a);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/employee/payroll">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Payslips</h1>
          <p className="text-muted-foreground">
            View and download your payslips
          </p>
        </div>
      </div>

      {/* Year Filter */}
      {availableYears.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            asChild
            variant={!yearFilter ? 'default' : 'outline'}
            size="sm"
          >
            <Link href="/employee/payroll/payslips">All Years</Link>
          </Button>
          {availableYears.map((year) => (
            <Button
              key={year}
              asChild
              variant={yearFilter === year ? 'default' : 'outline'}
              size="sm"
            >
              <Link href={`/employee/payroll/payslips?year=${year}`}>{year}</Link>
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payslips ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Payslip No.</TableHead>
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payslips found
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">
                      {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
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
                      <Badge
                        style={{ backgroundColor: getPayrollStatusColor(payslip.payrollRun.status) }}
                        className="text-white"
                      >
                        {payslip.isPaid ? 'Paid' : 'Processing'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/employee/payroll/payslips/${payslip.id}`}>
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
                    href={`/employee/payroll/payslips?p=${page - 1}${yearFilter ? `&year=${yearFilter}` : ''}`}
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
                    href={`/employee/payroll/payslips?p=${page + 1}${yearFilter ? `&year=${yearFilter}` : ''}`}
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
