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
import { Plus, Pencil, FileText, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/features/payroll/lib/utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    search?: string;
  }>;
}

export default async function SalaryStructuresPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isAdmin) {
    redirect('/');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;
  const search = params.search || '';

  const where = search
    ? {
        tenantId,
        member: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : { tenantId };

  const [salaryStructures, total] = await Promise.all([
    prisma.salaryStructure.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salaryStructure.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <PageHeader
        title="Salary Structures"
        subtitle="Manage employee salary components and allowances"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Salary Structures' },
        ]}
        actions={
          <>
            <PageHeaderButton href="/admin/payroll/salary-structures/new" variant="primary">
              <Plus className="h-4 w-4" />
              Add Salary Structure
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/runs" variant="secondary">
              <FileText className="h-4 w-4" />
              Payroll Runs
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
          <StatChip value={total} label="salary structures" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <Card>
        <CardHeader>
          <CardTitle>All Salary Structures ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Gross Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryStructures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No salary structures found
                  </TableCell>
                </TableRow>
              ) : (
                salaryStructures.map((salary) => {
                  const basic = Number(salary.basicSalary);
                  const allowances =
                    Number(salary.housingAllowance) +
                    Number(salary.transportAllowance) +
                    Number(salary.foodAllowance) +
                    Number(salary.phoneAllowance) +
                    Number(salary.otherAllowances);
                  const gross = Number(salary.grossSalary);

                  return (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{salary.member?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {salary.member?.employeeCode || salary.member?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{salary.member?.designation || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(basic)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(allowances)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(gross)}</TableCell>
                      <TableCell>
                        <Badge variant={salary.isActive ? 'default' : 'secondary'}>
                          {salary.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(salary.effectiveFrom).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/payroll/salary-structures/${salary.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/payroll/salary-structures?p=${page - 1}`}>Previous</Link>
                </Button>
              )}
              <span className="py-2 px-3 text-sm">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/payroll/salary-structures?p=${page + 1}`}>Next</Link>
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
