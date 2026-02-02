/**
 * @module GratuityReportPage
 * @description Displays end-of-service gratuity calculations for all employees.
 * Calculates gratuity based on basic salary and service duration using the
 * standard formula: 3 weeks of basic salary per year of service (pro-rated).
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calculateGratuity, getServiceDurationText } from '@/features/payroll/lib/gratuity';
import { formatCurrency } from '@/lib/core/currency';
import { formatDate } from '@/lib/core/datetime';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { FileText, Users, DollarSign } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

/**
 * Gratuity Report Page Component
 *
 * Fetches all active salary structures with employee data and calculates
 * end-of-service gratuity for each employee based on their service duration.
 *
 * @returns The rendered gratuity report page
 */
export default async function GratuityReportPage(): Promise<React.JSX.Element> {
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

  // Fetch all active salary structures with employee details
  // Note: This query includes member data via relation for gratuity calculation
  const employees = await prisma.salaryStructure.findMany({
    where: { tenantId, isActive: true },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          designation: true,
          dateOfJoining: true,
        },
      },
    },
    orderBy: {
      member: { name: 'asc' },
    },
  });

  // Calculate gratuity for each employee
  // Filter employees with valid joining dates, then compute gratuity using basic salary
  const gratuityData = employees
    .filter((emp) => emp.member?.dateOfJoining)
    .map((emp) => {
      const basicSalary = Number(emp.basicSalary);
      const dateOfJoining = new Date(emp.member!.dateOfJoining!);
      const calculation = calculateGratuity(basicSalary, dateOfJoining);

      return {
        ...emp,
        gratuity: calculation,
      };
    })
    // Sort by highest gratuity amount for easier financial review
    .sort((a, b) => b.gratuity.gratuityAmount - a.gratuity.gratuityAmount);

  // Aggregate total liability for financial reporting
  const totalGratuityLiability = gratuityData.reduce(
    (sum, emp) => sum + emp.gratuity.gratuityAmount,
    0
  );

  return (
    <>
      <PageHeader
        title="Gratuity Report"
        subtitle="End of Service Benefits calculation for all employees"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Gratuity Report' },
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
            <PageHeaderButton href="/admin/payroll/payslips" variant="secondary">
              <DollarSign className={ICON_SIZES.sm} />
              Payslips
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={gratuityData.length} label="employees" color="blue" />
          <StatChip value={formatCurrency(totalGratuityLiability)} label="total liability" color="emerald" />
        </StatChipGroup>
      </PageHeader>
      <PageContent className="space-y-6">

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
                        <div className="font-medium">{emp.member?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {emp.member?.employeeCode || emp.member?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.member?.designation || '-'}</TableCell>
                    <TableCell>
                      {formatDate(emp.member!.dateOfJoining!)}
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
 *   - Added JSDoc function documentation with return type
 *   - FIXED: Added missing tenantId check and filtering for tenant isolation
 *   - Added inline comments explaining gratuity calculation logic
 * Issues: None
 */
