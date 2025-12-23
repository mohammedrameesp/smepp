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
import { Plus, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/payroll/utils';

interface PageProps {
  searchParams: Promise<{
    p?: string;
    search?: string;
  }>;
}

export default async function SalaryStructuresPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);
  const pageSize = 20;
  const search = params.search || '';

  const where = search
    ? {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const [salaryStructures, total] = await Promise.all([
    prisma.salaryStructure.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salaryStructure.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Salary Structures</h1>
          <p className="text-muted-foreground">
            Manage employee salary components and allowances
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/payroll/salary-structures/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Salary Structure
          </Link>
        </Button>
      </div>

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
                          <div className="font-medium">{salary.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {salary.user.hrProfile?.employeeId || salary.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{salary.user.hrProfile?.designation || '-'}</TableCell>
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
      </div>
    </div>
  );
}
