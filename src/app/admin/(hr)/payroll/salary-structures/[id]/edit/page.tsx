'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/payroll/utils';

interface SalaryStructure {
  id: string;
  memberId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  phoneAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  effectiveFrom: string;
  member: {
    id: string;
    name: string | null;
    email: string;
    employeeCode?: string | null;
    designation?: string | null;
  };
}

export default function EditSalaryStructurePage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);

  const [basicSalary, setBasicSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [foodAllowance, setFoodAllowance] = useState('');
  const [phoneAllowance, setPhoneAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  useEffect(() => {
    fetch(`/api/payroll/salary-structures/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push('/admin/payroll/salary-structures');
          return;
        }
        setSalary(data);
        setBasicSalary(data.basicSalary.toString());
        setHousingAllowance(data.housingAllowance.toString());
        setTransportAllowance(data.transportAllowance.toString());
        setFoodAllowance(data.foodAllowance.toString());
        setPhoneAllowance(data.phoneAllowance.toString());
        setOtherAllowances(data.otherAllowances.toString());
        setEffectiveFrom(new Date(data.effectiveFrom).toISOString().split('T')[0]);
      })
      .catch(() => {
        toast.error('Failed to load salary structure');
        router.push('/admin/payroll/salary-structures');
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Calculate totals
  const basic = parseFloat(basicSalary) || 0;
  const housing = parseFloat(housingAllowance) || 0;
  const transport = parseFloat(transportAllowance) || 0;
  const food = parseFloat(foodAllowance) || 0;
  const phone = parseFloat(phoneAllowance) || 0;
  const other = parseFloat(otherAllowances) || 0;
  const totalAllowances = housing + transport + food + phone + other;
  const grossSalary = basic + totalAllowances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (basic <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/payroll/salary-structures/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basicSalary: basic,
          housingAllowance: housing,
          transportAllowance: transport,
          foodAllowance: food,
          phoneAllowance: phone,
          otherAllowances: other,
          effectiveFrom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update salary structure');
      }

      toast.success('Salary structure updated successfully');
      router.push('/admin/payroll/salary-structures');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update salary structure');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Edit Salary Structure" subtitle="Loading..." />
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageContent>
      </>
    );
  }

  if (!salary) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="Edit Salary Structure"
        subtitle={`Update salary components for ${salary.member?.name || salary.member?.email}`}
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Salary Structures', href: '/admin/payroll/salary-structures' },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-4xl">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Employee Info */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="grid gap-2 md:grid-cols-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{salary.member?.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-medium">{salary.member?.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employee ID:</span>{' '}
                      <span className="font-medium">
                        {salary.member?.employeeCode || 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Designation:</span>{' '}
                      <span className="font-medium">
                        {salary.member?.designation || 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="mt-1 max-w-[200px]"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Salary Components */}
            <Card>
              <CardHeader>
                <CardTitle>Salary Components</CardTitle>
                <CardDescription>
                  Monthly amounts in QAR
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary *</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="housingAllowance">Housing Allowance</Label>
                  <Input
                    id="housingAllowance"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={housingAllowance}
                    onChange={(e) => setHousingAllowance(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportAllowance">Transport Allowance</Label>
                  <Input
                    id="transportAllowance"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={transportAllowance}
                    onChange={(e) => setTransportAllowance(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodAllowance">Food Allowance</Label>
                  <Input
                    id="foodAllowance"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={foodAllowance}
                    onChange={(e) => setFoodAllowance(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneAllowance">Phone Allowance</Label>
                  <Input
                    id="phoneAllowance"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={phoneAllowance}
                    onChange={(e) => setPhoneAllowance(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherAllowances">Other Allowances</Label>
                  <Input
                    id="otherAllowances"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={otherAllowances}
                    onChange={(e) => setOtherAllowances(e.target.value)}
                    onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Salary Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Salary Summary
                </CardTitle>
                <CardDescription>
                  Monthly breakdown preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-medium">{formatCurrency(basic)}</span>
                  </div>

                  {housing > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Housing</span>
                      <span className="font-medium">{formatCurrency(housing)}</span>
                    </div>
                  )}

                  {transport > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Transport</span>
                      <span className="font-medium">{formatCurrency(transport)}</span>
                    </div>
                  )}

                  {food > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Food</span>
                      <span className="font-medium">{formatCurrency(food)}</span>
                    </div>
                  )}

                  {phone > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{formatCurrency(phone)}</span>
                    </div>
                  )}

                  {other > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Other</span>
                      <span className="font-medium">{formatCurrency(other)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-b font-medium">
                    <span>Total Allowances</span>
                    <span>{formatCurrency(totalAllowances)}</span>
                  </div>

                  <div className="flex justify-between py-3 text-lg font-semibold">
                    <span>Gross Salary</span>
                    <span className="text-green-600">{formatCurrency(grossSalary)}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Salary Structure
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/admin/payroll/salary-structures">Cancel</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </PageContent>
    </>
  );
}
