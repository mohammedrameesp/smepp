import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Wallet } from 'lucide-react';
import { formatCurrency, getMonthName } from '@/lib/payroll/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPayslipDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
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
          email: true,
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
          id: true,
          year: true,
          month: true,
          status: true,
          referenceNumber: true,
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/admin/payroll/runs/${payslip.payrollRun.id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Payslip Details</h1>
              <Badge variant={payslip.isPaid ? 'default' : 'secondary'}>
                {payslip.isPaid ? 'Paid' : 'Pending'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {payslip.payslipNumber}
            </p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href={`/admin/employees/${payslip.userId}`}>
            <User className="mr-2 h-4 w-4" />
            View Employee
          </Link>
        </Button>
      </div>

      {/* Employee & Payroll Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{payslip.user.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Employee ID</div>
                <div className="font-medium font-mono">
                  {payslip.user.hrProfile?.employeeId || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Designation</div>
                <div className="font-medium">
                  {payslip.user.hrProfile?.designation || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Pay Period</div>
                <div className="font-medium">
                  {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payroll Reference</div>
                <div className="font-medium font-mono">
                  {payslip.payrollRun.referenceNumber}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Bank</div>
                <div className="font-medium">{payslip.bankName || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">IBAN</div>
                <div className="font-medium font-mono">{payslip.iban || 'N/A'}</div>
              </div>
              {payslip.qidNumber && (
                <div>
                  <div className="text-sm text-muted-foreground">QID</div>
                  <div className="font-medium font-mono">{payslip.qidNumber}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  No deductions
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
                Amount to be paid for {getMonthName(payslip.payrollRun.month)} {payslip.payrollRun.year}
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
            <CardTitle className="text-lg">Payment Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-sm text-muted-foreground">Payment Date</div>
              <div className="font-medium">
                {new Date(payslip.paidAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
