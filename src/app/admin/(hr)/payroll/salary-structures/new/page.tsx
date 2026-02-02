/**
 * @module app/admin/(hr)/payroll/salary-structures/new/page
 * @description New salary structure creation page - allows admins to set up salary
 * components for employees. Supports two modes: auto-calculate (enter total salary
 * and percentages are applied) or manual entry of individual components. Includes
 * configurable percentage breakdown for basic salary and allowances (housing,
 * transport, food, phone, other) with real-time gross salary calculation preview.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calculator, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ICON_SIZES } from '@/lib/constants';
import { formatCurrency } from '@/lib/core/currency';
import { formatNumber, calculatePercentage } from '@/lib/utils/math-utils';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  employeeCode?: string | null;
  designation?: string | null;
  salaryStructure?: {
    id: string;
  } | null;
}

interface Percentages {
  basic: number;
  housing: number;
  transport: number;
  food: number;
  phone: number;
  other: number;
}

const DEFAULT_PERCENTAGES: Percentages = {
  basic: 60,
  housing: 20,
  transport: 10,
  food: 5,
  phone: 3,
  other: 2,
};

export default function NewSalaryStructurePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Mode toggle
  const [useAutoCalculate, setUseAutoCalculate] = useState(true);
  const [totalSalary, setTotalSalary] = useState('');
  const [percentages, setPercentages] = useState<Percentages>(DEFAULT_PERCENTAGES);
  const [showCustomPercentages, setShowCustomPercentages] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [housingAllowance, setHousingAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [foodAllowance, setFoodAllowance] = useState('');
  const [phoneAllowance, setPhoneAllowance] = useState('');
  const [otherAllowances, setOtherAllowances] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Load default percentages from settings
  useEffect(() => {
    fetch('/api/settings/payroll-percentages')
      .then((res) => res.json())
      .then((data) => {
        if (data.percentages) {
          setPercentages(data.percentages);
        }
      })
      .catch(() => {
        // Use default percentages
      });
  }, []);

  useEffect(() => {
    fetch('/api/team?isEmployee=true&noSalaryStructure=true')
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data.members || []);
      })
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoadingEmployees(false));
  }, []);

  // Auto-calculate components when total salary or percentages change
  const calculateComponents = useCallback(() => {
    if (!useAutoCalculate) return;

    const total = parseFloat(totalSalary) || 0;
    if (total <= 0) return;

    setBasicSalary(formatNumber(calculatePercentage(total, percentages.basic)));
    setHousingAllowance(formatNumber(calculatePercentage(total, percentages.housing)));
    setTransportAllowance(formatNumber(calculatePercentage(total, percentages.transport)));
    setFoodAllowance(formatNumber(calculatePercentage(total, percentages.food)));
    setPhoneAllowance(formatNumber(calculatePercentage(total, percentages.phone)));
    setOtherAllowances(formatNumber(calculatePercentage(total, percentages.other)));
  }, [totalSalary, percentages, useAutoCalculate]);

  useEffect(() => {
    calculateComponents();
  }, [calculateComponents]);

  // Calculate totals for display
  const basic = parseFloat(basicSalary) || 0;
  const housing = parseFloat(housingAllowance) || 0;
  const transport = parseFloat(transportAllowance) || 0;
  const food = parseFloat(foodAllowance) || 0;
  const phone = parseFloat(phoneAllowance) || 0;
  const other = parseFloat(otherAllowances) || 0;
  const totalAllowances = housing + transport + food + phone + other;
  const grossSalary = basic + totalAllowances;

  const percentageTotal = Object.values(percentages).reduce((sum, val) => sum + val, 0);
  const percentagesValid = Math.abs(percentageTotal - 100) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberId) {
      toast.error('Please select an employee');
      return;
    }

    if (basic <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payroll/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
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
        throw new Error(data.error || 'Failed to create salary structure');
      }

      toast.success('Salary structure created successfully');
      router.push('/admin/payroll/salary-structures');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create salary structure');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === memberId);

  const updatePercentage = (key: keyof Percentages, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPercentages((prev) => ({ ...prev, [key]: numValue }));
  };

  return (
    <>
      <PageHeader
        title="New Salary Structure"
        subtitle="Set up salary components for an employee"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Salary Structures', href: '/admin/payroll/salary-structures' },
          { label: 'New Structure' },
        ]}
      />

      <PageContent className="max-w-5xl">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Employee Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Employee</CardTitle>
                <CardDescription>
                  Select the employee to set up salary for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Select Employee</Label>
                    <Select value={memberId} onValueChange={setMemberId} disabled={loadingEmployees}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder={loadingEmployees ? 'Loading...' : 'Select an employee'} />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No employees without salary structure
                          </SelectItem>
                        ) : (
                          employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name || 'Unnamed'}
                              {emp.employeeCode && ` (${emp.employeeCode})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effectiveFrom">Effective From</Label>
                    <Input
                      id="effectiveFrom"
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {selectedEmployee && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="grid gap-2 md:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>{' '}
                        <span className="font-medium">{selectedEmployee.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>{' '}
                        <span className="font-medium">{selectedEmployee.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Designation:</span>{' '}
                        <span className="font-medium">
                          {selectedEmployee.designation || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary Input Mode */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Salary Entry Mode</CardTitle>
                    <CardDescription>
                      Choose how to enter salary information
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-calc" className="text-sm">
                      {useAutoCalculate ? 'Auto-calculate from total' : 'Manual entry'}
                    </Label>
                    <Switch
                      id="auto-calc"
                      checked={useAutoCalculate}
                      onCheckedChange={setUseAutoCalculate}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {useAutoCalculate ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalSalary" className="text-lg font-medium">
                        Total Monthly Salary (Gross)
                      </Label>
                      <CurrencyInput
                        id="totalSalary"
                        min="0"
                        placeholder="Enter total salary"
                        value={totalSalary}
                        onChange={(e) => setTotalSalary(e.target.value)}
                        className="text-lg h-12"
                      />
                      <p className="text-sm text-muted-foreground">
                        Components will be auto-calculated based on percentages
                      </p>
                    </div>

                    {/* Custom Percentages Toggle */}
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Settings2 className={`${ICON_SIZES.sm} text-muted-foreground`} />
                          <span className="text-sm font-medium">Customize Percentages</span>
                        </div>
                        <Switch
                          checked={showCustomPercentages}
                          onCheckedChange={setShowCustomPercentages}
                        />
                      </div>

                      {showCustomPercentages && (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Basic %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.basic}
                                onChange={(e) => updatePercentage('basic', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Housing %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.housing}
                                onChange={(e) => updatePercentage('housing', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Transport %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.transport}
                                onChange={(e) => updatePercentage('transport', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Food %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.food}
                                onChange={(e) => updatePercentage('food', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Phone %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.phone}
                                onChange={(e) => updatePercentage('phone', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Other %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={percentages.other}
                                onChange={(e) => updatePercentage('other', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className={`p-2 rounded text-sm ${percentagesValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            Total: {percentageTotal.toFixed(1)}%
                            {!percentagesValid && ' (must equal 100%)'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">Basic Salary *</Label>
                      <CurrencyInput
                        id="basicSalary"
                        min="0"
                        placeholder="0.00"
                        value={basicSalary}
                        onChange={(e) => setBasicSalary(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="housingAllowance">Housing Allowance</Label>
                      <CurrencyInput
                        id="housingAllowance"
                        min="0"
                        placeholder="0.00"
                        value={housingAllowance}
                        onChange={(e) => setHousingAllowance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transportAllowance">Transport Allowance</Label>
                      <CurrencyInput
                        id="transportAllowance"
                        min="0"
                        placeholder="0.00"
                        value={transportAllowance}
                        onChange={(e) => setTransportAllowance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="foodAllowance">Food Allowance</Label>
                      <CurrencyInput
                        id="foodAllowance"
                        min="0"
                        placeholder="0.00"
                        value={foodAllowance}
                        onChange={(e) => setFoodAllowance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneAllowance">Phone Allowance</Label>
                      <CurrencyInput
                        id="phoneAllowance"
                        min="0"
                        placeholder="0.00"
                        value={phoneAllowance}
                        onChange={(e) => setPhoneAllowance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otherAllowances">Other Allowances</Label>
                      <CurrencyInput
                        id="otherAllowances"
                        min="0"
                        placeholder="0.00"
                        value={otherAllowances}
                        onChange={(e) => setOtherAllowances(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className={ICON_SIZES.md} />
                  Salary Summary
                </CardTitle>
                <CardDescription>
                  Final breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-medium">{formatCurrency(basic)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Housing Allowance</span>
                      <span className="font-medium">{formatCurrency(housing)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Transport Allowance</span>
                      <span className="font-medium">{formatCurrency(transport)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Food Allowance</span>
                      <span className="font-medium">{formatCurrency(food)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Phone Allowance</span>
                      <span className="font-medium">{formatCurrency(phone)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Other Allowances</span>
                      <span className="font-medium">{formatCurrency(other)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-green-800">Gross Monthly Salary</span>
                    <span className="text-2xl font-bold text-green-700">{formatCurrency(grossSalary)}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button type="submit" className="w-full" disabled={isLoading || !memberId || basic <= 0}>
                    {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
                    Create Salary Structure
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

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Client-side form for creating new salary structures with flexible
 * auto-calculate or manual entry modes.
 *
 * Key Features:
 * - Employee selection (filtered to those without salary structure)
 * - Two entry modes: auto-calculate from total or manual component entry
 * - Configurable percentage breakdown for auto-calculation
 * - Real-time gross salary preview
 * - Effective date selection
 * - Loads default percentages from organization settings
 *
 * Data Flow:
 * - Fetches employees without salary structure from /api/team
 * - Fetches default percentages from /api/settings/payroll-percentages
 * - Posts to /api/payroll/salary-structures to create
 *
 * Security:
 * - Client-side page (relies on API for authorization)
 * - Form validation prevents invalid submissions
 *
 * Improvements Made:
 * - Excellent dual-mode entry (auto vs manual)
 * - Customizable percentage breakdown with validation
 * - Real-time calculation preview
 * - Good use of useCallback for memoized calculations
 * - Clean form validation with user-friendly errors
 *
 * Potential Improvements:
 * - Add option to copy from existing employee's structure
 * - Add salary history preview for employee
 * - Consider adding template selection for common structures
 * - Add confirmation dialog before submission
 */
