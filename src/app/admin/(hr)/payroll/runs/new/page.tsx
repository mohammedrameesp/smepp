/**
 * @module app/admin/(hr)/payroll/runs/new/page
 * @description New payroll run creation page - allows admins to initiate a monthly
 * payroll process by selecting the target year and month. Creates a draft payroll
 * run that includes all employees with active salary structures. Provides year
 * selection spanning 5 years and month selection with user-friendly names.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { toast } from 'sonner';
import { getMonthName } from '@/features/payroll/lib/utils';

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: parseInt(year, 10),
          month: parseInt(month, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payroll run');
      }

      toast.success(`Payroll run created for ${getMonthName(parseInt(month, 10))} ${year}`);

      router.push(`/admin/payroll/runs/${data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create payroll run');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Create Payroll Run"
        subtitle="Start a new monthly payroll process"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Payroll Runs', href: '/admin/payroll/runs' },
          { label: 'New Run' },
        ]}
      />

      <PageContent className="max-w-md">
        <Card>
        <CardHeader>
          <CardTitle>Select Pay Period</CardTitle>
          <CardDescription>
            Choose the month and year for this payroll run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {getMonthName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                This will create a payroll run for <strong>{getMonthName(parseInt(month, 10))} {year}</strong>.
                All employees with active salary structures will be included.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/payroll/runs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
                Create Payroll Run
              </Button>
            </div>
          </form>
        </CardContent>
        </Card>
      </PageContent>
    </>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Client-side form for creating a new monthly payroll run by selecting
 * the target year and month.
 *
 * Key Features:
 * - Month and year selection with 5-year range
 * - Preview message showing selected period
 * - Loading state during submission
 * - Automatic redirect to new payroll run detail page
 * - Cancel button to return to list
 *
 * Data Flow:
 * - Posts to /api/payroll/runs to create new payroll run
 * - Redirects to /admin/payroll/runs/[id] on success
 *
 * Security:
 * - Client-side page (relies on API for authorization)
 * - No duplicate run check on client (handled by API)
 *
 * Improvements Made:
 * - Clean, simple form with clear user feedback
 * - Good use of toast notifications for success/error
 * - Proper loading state prevents double submission
 * - Uses shared Select component for consistent UX
 *
 * Potential Improvements:
 * - Add validation to prevent selecting future months
 * - Show warning if a payroll run already exists for selected period
 * - Add ability to set custom period end date
 * - Consider adding preview of employees that will be included
 */
