import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calculator, CreditCard, ArrowRight } from 'lucide-react';
import { formatCurrency, getMonthName, getPayrollStatusText, getPayrollStatusColor } from '@/lib/payroll/utils';
import { calculateGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';

export default async function EmployeePayrollPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const userId = session.user.id;

  // Get employee's salary structure, HR profile, and recent payslips
  const [salaryStructure, hrProfile, recentPayslips, loans] = await Promise.all([
    prisma.salaryStructure.findUnique({
      where: { memberId: userId },
    }),
    prisma.hRProfile.findUnique({
      where: { userId },
      select: {
        dateOfJoining: true,
        designation: true,
        employeeId: true,
        bankName: true,
      },
    }),
    prisma.payslip.findMany({
      where: { memberId: userId },
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
      take: 6,
    }),
    prisma.employeeLoan.findMany({
      where: { memberId: userId, status: 'ACTIVE' },
      select: {
        id: true,
        loanNumber: true,
        type: true,
        remainingAmount: true,
        monthlyDeduction: true,
      },
    }),
  ]);

  // Calculate gratuity if data is available
  let gratuityCalculation = null;
  if (salaryStructure && hrProfile?.dateOfJoining) {
    const basicSalary = Number(salaryStructure.basicSalary);
    const dateOfJoining = new Date(hrProfile.dateOfJoining);
    gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);
  }

  const totalLoanRemaining = loans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Payroll</h1>
        <p className="text-muted-foreground">
          View your salary details, payslips, and gratuity projection
        </p>
      </div>

      {/* Salary Overview */}
      {salaryStructure ? (
        <Card>
          <CardHeader>
            <CardTitle>Salary Overview</CardTitle>
            <CardDescription>Your current monthly salary breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Basic Salary</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(Number(salaryStructure.basicSalary))}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Allowances</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(
                    Number(salaryStructure.housingAllowance) +
                    Number(salaryStructure.transportAllowance) +
                    Number(salaryStructure.foodAllowance) +
                    Number(salaryStructure.phoneAllowance) +
                    Number(salaryStructure.otherAllowances)
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Gross Salary</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(Number(salaryStructure.grossSalary))}
                </div>
              </div>
            </div>

            {/* Allowance Breakdown */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Allowance Breakdown</div>
              <div className="grid gap-2 md:grid-cols-5 text-sm">
                <div>
                  <span className="text-muted-foreground">Housing:</span>{' '}
                  {formatCurrency(Number(salaryStructure.housingAllowance))}
                </div>
                <div>
                  <span className="text-muted-foreground">Transport:</span>{' '}
                  {formatCurrency(Number(salaryStructure.transportAllowance))}
                </div>
                <div>
                  <span className="text-muted-foreground">Food:</span>{' '}
                  {formatCurrency(Number(salaryStructure.foodAllowance))}
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  {formatCurrency(Number(salaryStructure.phoneAllowance))}
                </div>
                <div>
                  <span className="text-muted-foreground">Other:</span>{' '}
                  {formatCurrency(Number(salaryStructure.otherAllowances))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No salary structure set up yet. Please contact HR.</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Gratuity Projection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gratuity Projection</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {gratuityCalculation ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(gratuityCalculation.gratuityAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getServiceDurationText(gratuityCalculation.monthsOfService)} of service
                </p>
                <Button asChild variant="link" className="px-0 mt-2">
                  <Link href="/employee/payroll/gratuity">
                    View Details <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not available - missing salary or joining date
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loans.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalLoanRemaining)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {loans.length} active loan{loans.length !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active loans</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payslip */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Payslip</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentPayslips.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(recentPayslips[0].netSalary))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getMonthName(recentPayslips[0].payrollRun.month)} {recentPayslips[0].payrollRun.year}
                </p>
                <Button asChild variant="link" className="px-0 mt-2">
                  <Link href={`/employee/payroll/payslips/${recentPayslips[0].id}`}>
                    View Payslip <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No payslips yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payslips */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Payslips</CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/employee/payroll/payslips">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentPayslips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No payslips available yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentPayslips.map((payslip) => (
                <Link
                  key={payslip.id}
                  href={`/employee/payroll/payslips/${payslip.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="font-medium">
                      {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payslip.payslipNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(Number(payslip.netSalary))}
                    </div>
                    <Badge
                      style={{ backgroundColor: getPayrollStatusColor(payslip.payrollRun.status) }}
                      className="text-white text-xs"
                    >
                      {payslip.isPaid ? 'Paid' : getPayrollStatusText(payslip.payrollRun.status)}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
