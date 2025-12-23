import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/payroll/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeePayslipDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const { id } = await params;

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          hrProfile: {
            select: {
              employeeId: true,
              designation: true,
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
      deductions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!payslip) {
    notFound();
  }

  // Verify the user owns this payslip
  if (payslip.userId !== session.user.id) {
    redirect('/employee/payroll');
  }

  const basicSalary = Number(payslip.basicSalary);
  const housingAllowance = Number(payslip.housingAllowance);
  const transportAllowance = Number(payslip.transportAllowance);
  const foodAllowance = Number(payslip.foodAllowance);
  const phoneAllowance = Number(payslip.phoneAllowance);
  const otherAllowances = Number(payslip.otherAllowances);
  const grossSalary = Number(payslip.grossSalary);
  const totalDeductions = Number(payslip.totalDeductions);
  const netSalary = Number(payslip.netSalary);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/employee/payroll/payslips">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year} Payslip
            </h1>
            <Badge variant={payslip.isPaid ? 'default' : 'secondary'}>
              {payslip.isPaid ? 'Paid' : 'Processing'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Payslip No: {payslip.payslipNumber}
          </p>
        </div>
      </div>

      {/* Employee Details */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Employee</div>
                <div className="font-medium">{payslip.user.name}</div>
                <div className="text-sm text-muted-foreground">
                  {payslip.user.hrProfile?.employeeId}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Pay Period</div>
                <div className="font-medium">
                  {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Bank</div>
                <div className="font-medium">{payslip.bankName || 'Not specified'}</div>
                {payslip.iban && (
                  <div className="text-sm text-muted-foreground font-mono">
                    ****{payslip.iban.slice(-4)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-medium">{formatCurrency(basicSalary)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Housing Allowance</span>
                <span className="font-medium">{formatCurrency(housingAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Transport Allowance</span>
                <span className="font-medium">{formatCurrency(transportAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Food Allowance</span>
                <span className="font-medium">{formatCurrency(foodAllowance)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Phone Allowance</span>
                <span className="font-medium">{formatCurrency(phoneAllowance)}</span>
              </div>
              {otherAllowances > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Other Allowances</span>
                  <span className="font-medium">{formatCurrency(otherAllowances)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-semibold">
                <span>Total Earnings</span>
                <span className="text-green-600">{formatCurrency(grossSalary)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslip.deductions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No deductions this month
                </p>
              ) : (
                payslip.deductions.map((deduction) => (
                  <div key={deduction.id} className="flex justify-between py-2 border-b">
                    <div>
                      <span className="text-muted-foreground">
                        {deduction.type.replace(/_/g, ' ')}
                      </span>
                      {deduction.description && (
                        <div className="text-xs text-muted-foreground">
                          {deduction.description}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(Number(deduction.amount))}
                    </span>
                  </div>
                ))
              )}
              <div className="flex justify-between py-2 font-semibold">
                <span>Total Deductions</span>
                <span className="text-red-600">-{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Pay Summary */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-medium text-green-800">Net Pay</div>
              <p className="text-sm text-green-600">
                Your take-home salary for {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
              </p>
            </div>
            <div className="text-4xl font-bold text-green-700">
              {formatCurrency(netSalary)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {payslip.isPaid && payslip.paidAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-muted-foreground">Payment Date:</span>{' '}
              <span className="font-medium">
                {new Date(payslip.paidAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
