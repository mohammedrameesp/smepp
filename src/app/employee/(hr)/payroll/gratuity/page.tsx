import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { calculateGratuity, projectGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { formatCurrency } from '@/lib/payroll/utils';

export default async function EmployeeGratuityPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  const userId = session.user.id;

  // Get employee's salary structure and member profile
  const [salaryStructure, member] = await Promise.all([
    prisma.salaryStructure.findUnique({
      where: { memberId: userId },
    }),
    prisma.teamMember.findUnique({
      where: { id: userId },
      select: {
        dateOfJoining: true,
        designation: true,
        employeeCode: true,
      },
    }),
  ]);

  // Check if we can calculate gratuity
  if (!salaryStructure || !member?.dateOfJoining) {
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
              <h1 className="text-2xl font-bold">Gratuity Projection</h1>
              <p className="text-muted-foreground">
                End of Service Benefits calculation
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="py-8 text-center">
              <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {!salaryStructure
                  ? 'Salary structure not set up. Please contact HR.'
                  : 'Date of joining not recorded. Please contact HR.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const basicSalary = Number(salaryStructure.basicSalary);
  const dateOfJoining = new Date(member.dateOfJoining);
  const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);
  const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

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
            <h1 className="text-2xl font-bold">Gratuity Projection</h1>
            <p className="text-muted-foreground">
              End of Service Benefits calculation
            </p>
          </div>
        </div>

        {/* Current Gratuity */}
      <Card>
        <CardHeader>
          <CardTitle>Current Gratuity Amount</CardTitle>
          <CardDescription>
            Based on your current service duration and basic salary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600 mb-4">
            {formatCurrency(gratuityCalculation.gratuityAmount)}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Service Duration</div>
              <div className="font-semibold">
                {getServiceDurationText(gratuityCalculation.monthsOfService)}
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Basic Salary</div>
              <div className="font-semibold">{formatCurrency(basicSalary)}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Weekly Rate</div>
              <div className="font-semibold">{formatCurrency(gratuityCalculation.weeklyRate)}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Date of Joining</div>
              <div className="font-semibold">
                {dateOfJoining.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Full Years ({gratuityCalculation.yearsOfService} years)</span>
              <span className="font-medium">{formatCurrency(gratuityCalculation.breakdown.fullYearsAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Partial Year (pro-rated)</span>
              <span className="font-medium">{formatCurrency(gratuityCalculation.breakdown.partialYearAmount)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span>Total Gratuity</span>
              <span className="text-green-600">{formatCurrency(gratuityCalculation.gratuityAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Projections */}
      <Card>
        <CardHeader>
          <CardTitle>Future Projections</CardTitle>
          <CardDescription>
            Estimated gratuity if you continue working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {projections.map((proj) => (
              <div key={proj.years} className="p-4 border rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-1">
                  In {proj.years} year{proj.years !== 1 ? 's' : ''}
                </div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(proj.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How is Gratuity Calculated?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p className="text-muted-foreground">
            Gratuity (End of Service Benefits) is calculated using the following formula:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li><strong>Weekly Rate:</strong> Basic Salary ÷ 30 days × 7 days</li>
            <li><strong>Annual Gratuity:</strong> Weekly Rate × 3 weeks per year</li>
            <li><strong>Total Gratuity:</strong> Years of Service × Annual Gratuity (pro-rated for partial years)</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Note: This is an estimate based on your current basic salary. The actual amount may vary based on company policies and applicable laws at the time of separation.
          </p>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
