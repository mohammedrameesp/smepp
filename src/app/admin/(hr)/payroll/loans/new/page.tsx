/**
 * @module NewLoanPage
 * @description Form page for creating new employee loans or salary advances.
 * Includes automatic calculation of estimated repayment duration and a
 * summary preview before submission.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { ICON_SIZES } from '@/lib/constants';
import { formatCurrency } from '@/lib/core/currency';

/** Employee data structure for the selection dropdown */
interface Employee {
  id: string;
  name: string | null;
  email: string;
  employeeCode?: string | null;
}

/** Available loan type options */
const LOAN_TYPES = [
  { value: 'ADVANCE', label: 'Salary Advance' },
  { value: 'LOAN', label: 'Personal Loan' },
  { value: 'EMERGENCY', label: 'Emergency Loan' },
  { value: 'OTHER', label: 'Other' },
] as const;

/**
 * New Loan Page Component
 *
 * Client component for creating employee loans with form validation,
 * automatic repayment estimation, and real-time summary display.
 *
 * @returns The rendered new loan form page
 */
export default function NewLoanPage(): React.JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [memberId, setMemberId] = useState('');
  const [type, setType] = useState('LOAN');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Load employees on mount - tenant filtering handled server-side in API
  useEffect(() => {
    fetch('/api/team?isEmployee=true')
      .then((res) => res.json())
      .then((data) => setEmployees(data.members || []))
      .catch(() => toast.error('Failed to load employees'));
  }, []);

  // Calculate loan metrics for summary display
  const amountNum = parseFloat(principalAmount) || 0;
  const monthlyNum = parseFloat(monthlyDeduction) || 0;
  // Estimate repayment duration in months (rounded up)
  const estimatedMonths = monthlyNum > 0 ? Math.ceil(amountNum / monthlyNum) : 0;

  /**
   * Handles form submission for creating a new loan
   * Sends loan data to the API and redirects on success
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/payroll/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          type,
          principalAmount: amountNum,
          monthlyDeduction: monthlyNum,
          startDate: startDate || new Date().toISOString(),
          description: description || `${type} for employee`,
          notes: notes || undefined,
          installments: estimatedMonths,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create loan');
      }

      toast.success('Loan created successfully');
      router.push(`/admin/payroll/loans/${data.id}`);
    } catch (error) {
      // Display user-friendly error message
      toast.error(error instanceof Error ? error.message : 'Failed to create loan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New Employee Loan"
        subtitle="Create a loan or salary advance for an employee"
        breadcrumbs={[
          { label: 'Payroll', href: '/admin/payroll' },
          { label: 'Loans', href: '/admin/payroll/loans' },
          { label: 'New Loan' },
        ]}
      />

      <PageContent>
        <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Loan Details */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>
                Enter the loan information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberId">Employee *</Label>
                <Select value={memberId} onValueChange={setMemberId} required>
                  <SelectTrigger id="memberId">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name || 'Unnamed'}
                        {emp.employeeCode && ` (${emp.employeeCode})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Loan Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="principalAmount">Loan Amount (QAR) *</Label>
                <CurrencyInput
                  id="principalAmount"
                  min="0"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyDeduction">Monthly Deduction (QAR) *</Label>
                <CurrencyInput
                  id="monthlyDeduction"
                  min="0"
                  value={monthlyDeduction}
                  onChange={(e) => setMonthlyDeduction(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info & Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the loan purpose..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Calculation Summary */}
            {amountNum > 0 && monthlyNum > 0 && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className={ICON_SIZES.md} />
                    Repayment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Amount</span>
                      <span className="font-medium">{formatCurrency(amountNum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Deduction</span>
                      <span className="font-medium">{formatCurrency(monthlyNum)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Estimated Duration</span>
                      <span className="font-semibold">
                        {estimatedMonths} month{estimatedMonths !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deductions will be automatically applied to monthly payslips.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/payroll/loans">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isLoading || !memberId || !principalAmount || !monthlyDeduction || !description}>
                {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
                Create Loan
              </Button>
            </div>
          </div>
          </div>
        </form>
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
 *   - Added JSDoc documentation for Employee interface
 *   - Added 'as const' to LOAN_TYPES for better type safety
 *   - Added JSDoc function documentation with return type
 *   - Added JSDoc documentation for handleSubmit function
 *   - Added inline comments for data loading and calculations
 *   - Verified error handling with user-friendly messages
 * Issues: None (tenant isolation handled by API layer)
 */
