/**
 * @module app/admin/(hr)/payroll/salary-structures/page
 * @description Salary structures list page - displays all employee salary structures
 * with basic salary, allowances breakdown, gross salary totals, and effective dates.
 * Shows active/inactive status for each structure. Provides navigation to create
 * new structures, access payroll runs, payslips, and loans management.
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
import { Plus, Pencil, FileText, DollarSign, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/core/currency';
import { formatDate } from '@/lib/core/datetime';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ICON_SIZES } from '@/lib/constants';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    search?: string;
  }>;
}

export default async function SalaryStructuresPage({ searchParams }: PageProps) {
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
              <Plus className={ICON_SIZES.sm} />
              Add Salary Structure
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/runs" variant="secondary">
              <FileText className={ICON_SIZES.sm} />
              Payroll Runs
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/payslips" variant="secondary">
              <DollarSign className={ICON_SIZES.sm} />
              Payslips
            </PageHeaderButton>
            <PageHeaderButton href="/admin/payroll/loans" variant="secondary">
              <CreditCard className={ICON_SIZES.sm} />
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
                        {formatDate(salary.effectiveFrom)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/admin/payroll/salary-structures/${salary.id}/edit`}>
                            <Pencil className={ICON_SIZES.sm} />
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Server-side rendered page displaying all employee salary structures
 * with search and pagination.
 *
 * Key Features:
 * - Search by employee name or email
 * - Paginated list with 20 items per page
 * - Shows breakdown (basic, allowances, gross total)
 * - Active/inactive status badges
 * - Effective date display
 * - Quick actions to add new structure, access runs/payslips/loans
 *
 * Data Flow:
 * - Server-side data fetching with Prisma
 * - URL-based search state for bookmarkable searches
 * - Parallel queries for data and count
 *
 * Security:
 * - Requires authenticated session
 * - Access restricted to admins OR users with Finance access
 * - Tenant-scoped queries via tenantId filter
 *
 * Improvements Made:
 * - Efficient parallel queries with Promise.all
 * - Clean search filter implementation
 * - Good use of shared UI components
 * - Proper number conversion for Prisma Decimal types
 *
 * Potential Improvements:
 * - Add filter for active/inactive structures
 * - Add bulk salary revision functionality
 * - Add salary comparison/analysis view
 * - Consider adding department/team grouping
 */
