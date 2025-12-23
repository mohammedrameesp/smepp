import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { calculateGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { formatCurrency } from '@/lib/payroll/utils';

export default async function GratuityReportPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/');
  }

  // Get all employees with salary structures and date of joining
  const employees = await prisma.salaryStructure.findMany({
    where: { isActive: true },
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
              dateOfJoining: true,
            },
          },
        },
      },
    },
    orderBy: {
      user: { name: 'asc' },
    },
  });

  // Calculate gratuity for each employee
  const gratuityData = employees
    .filter((emp) => emp.user.hrProfile?.dateOfJoining)
    .map((emp) => {
      const basicSalary = Number(emp.basicSalary);
      const dateOfJoining = new Date(emp.user.hrProfile!.dateOfJoining!);
      const calculation = calculateGratuity(basicSalary, dateOfJoining);

      return {
        ...emp,
        gratuity: calculation,
      };
    })
    .sort((a, b) => b.gratuity.gratuityAmount - a.gratuity.gratuityAmount);

  const totalGratuityLiability = gratuityData.reduce(
    (sum, emp) => sum + emp.gratuity.gratuityAmount,
    0
  );

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
          <h1 className="text-2xl font-bold">Gratuity Report</h1>
          <p className="text-muted-foreground">
            End of Service Benefits calculation for all employees
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Gratuity Liability</CardTitle>
          <CardDescription>
            Based on current service duration and basic salaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalGratuityLiability)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            For {gratuityData.length} employees with active salary structures
          </p>
        </CardContent>
      </Card>

      {/* Employee Gratuity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Gratuity Details</CardTitle>
          <CardDescription>
            Formula: 3 weeks of basic salary per year of service (pro-rated)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Date of Joining</TableHead>
                <TableHead>Service Duration</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead className="text-right">Weekly Rate</TableHead>
                <TableHead className="text-right">Gratuity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gratuityData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No employees with salary structures and joining dates
                  </TableCell>
                </TableRow>
              ) : (
                gratuityData.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{emp.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {emp.user.hrProfile?.employeeId || emp.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.user.hrProfile?.designation || '-'}</TableCell>
                    <TableCell>
                      {new Date(emp.user.hrProfile!.dateOfJoining!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getServiceDurationText(emp.gratuity.monthsOfService)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(emp.gratuity.basicSalary)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(emp.gratuity.weeklyRate)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(emp.gratuity.gratuityAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Method</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul>
            <li><strong>Formula:</strong> 3 weeks of basic salary per year of service</li>
            <li><strong>Weekly Rate:</strong> Basic Salary / 30 days × 7 days</li>
            <li><strong>Annual Gratuity:</strong> Weekly Rate × 3 weeks</li>
            <li><strong>Partial Years:</strong> Pro-rated based on months of service</li>
          </ul>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
