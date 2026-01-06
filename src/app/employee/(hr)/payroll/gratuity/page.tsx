import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Calculator, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { calculateGratuity, projectGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { formatCurrency } from '@/lib/payroll/utils';
import { PageHeader, PageContent } from '@/components/ui/page-header';

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
      <>
        <PageHeader
          title="Gratuity Projection"
          subtitle="End of Service Benefits calculation"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'Payroll', href: '/employee/payroll' },
            { label: 'Gratuity' }
          ]}
          actions={
            <Link href="/employee/payroll">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payroll
              </Button>
            </Link>
          }
        />

        <PageContent>
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Info className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">
              {!salaryStructure
                ? 'Salary structure not set up. Please contact HR.'
                : 'Date of joining not recorded. Please contact HR.'}
            </p>
          </div>
        </PageContent>
      </>
    );
  }

  const basicSalary = Number(salaryStructure.basicSalary);
  const dateOfJoining = new Date(member.dateOfJoining);
  const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);
  const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

  return (
    <>
      <PageHeader
        title="Gratuity Projection"
        subtitle="End of Service Benefits calculation"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll', href: '/employee/payroll' },
          { label: 'Gratuity' }
        ]}
        actions={
          <Link href="/employee/payroll">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payroll
            </Button>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">
              {formatCurrency(gratuityCalculation.gratuityAmount)} current gratuity
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              {getServiceDurationText(gratuityCalculation.monthsOfService)} of service
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* Current Gratuity */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Current Gratuity Amount</h2>
                <p className="text-sm text-slate-500">Based on your current service duration and basic salary</p>
              </div>
            </div>
            <div className="p-5">
              <div className="text-4xl font-bold text-emerald-600 mb-6">
                {formatCurrency(gratuityCalculation.gratuityAmount)}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Service Duration</p>
                  <p className="font-semibold text-slate-900">
                    {getServiceDurationText(gratuityCalculation.monthsOfService)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Basic Salary</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(basicSalary)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Weekly Rate</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(gratuityCalculation.weeklyRate)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date of Joining</p>
                  <p className="font-semibold text-slate-900">
                    {dateOfJoining.toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Calculation Breakdown</h2>
                <p className="text-sm text-slate-500">How your gratuity is computed</p>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Full Years ({gratuityCalculation.yearsOfService} years)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(gratuityCalculation.breakdown.fullYearsAmount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Partial Year (pro-rated)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(gratuityCalculation.breakdown.partialYearAmount)}</span>
                </div>
                <div className="flex justify-between py-3 pt-4 font-semibold">
                  <span className="text-slate-900">Total Gratuity</span>
                  <span className="text-emerald-600 text-lg">{formatCurrency(gratuityCalculation.gratuityAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Future Projections */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Future Projections</h2>
                <p className="text-sm text-slate-500">Estimated gratuity if you continue working</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-5">
                {projections.map((proj) => (
                  <div key={proj.years} className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200">
                    <p className="text-sm text-slate-600 mb-2">
                      In {proj.years} year{proj.years !== 1 ? 's' : ''}
                    </p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {formatCurrency(proj.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Info className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">How is Gratuity Calculated?</h2>
                <p className="text-sm text-slate-500">Understanding the formula</p>
              </div>
            </div>
            <div className="p-5">
              <p className="text-slate-600 mb-4">
                Gratuity (End of Service Benefits) is calculated using the following formula:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 mb-4">
                <li><strong className="text-slate-900">Weekly Rate:</strong> Basic Salary ÷ 30 days × 7 days</li>
                <li><strong className="text-slate-900">Annual Gratuity:</strong> Weekly Rate × 3 weeks per year</li>
                <li><strong className="text-slate-900">Total Gratuity:</strong> Years of Service × Annual Gratuity (pro-rated for partial years)</li>
              </ul>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This is an estimate based on your current basic salary. The actual amount may vary based on company policies and applicable laws at the time of separation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
