'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/payroll/utils';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  hrProfile?: {
    employeeId: string | null;
  };
}

const LOAN_TYPES = [
  { value: 'ADVANCE', label: 'Salary Advance' },
  { value: 'LOAN', label: 'Personal Loan' },
  { value: 'EMERGENCY', label: 'Emergency Loan' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewLoanPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [userId, setUserId] = useState('');
  const [type, setType] = useState('LOAN');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch('/api/users?includeHrProfile=true')
      .then((res) => res.json())
      .then((data) => setEmployees(data.users || []))
      .catch(() => toast.error('Failed to load employees'));
  }, []);

  const amountNum = parseFloat(principalAmount) || 0;
  const monthlyNum = parseFloat(monthlyDeduction) || 0;
  const estimatedMonths = monthlyNum > 0 ? Math.ceil(amountNum / monthlyNum) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/payroll/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
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
      toast.error(error instanceof Error ? error.message : 'Failed to create loan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/payroll/loans">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Employee Loan</h1>
            <p className="text-muted-foreground">
              Create a loan or salary advance for an employee
            </p>
          </div>
        </div>

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
                <Label htmlFor="userId">Employee *</Label>
                <Select value={userId} onValueChange={setUserId} required>
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name || emp.email}
                        {emp.hrProfile?.employeeId && ` (${emp.hrProfile.employeeId})`}
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
                <Input
                  id="principalAmount"
                  type="number"
                  min="0"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyDeduction">Monthly Deduction (QAR) *</Label>
                <Input
                  id="monthlyDeduction"
                  type="number"
                  min="0"
                  value={monthlyDeduction}
                  onChange={(e) => setMonthlyDeduction(e.target.value)}
                  onKeyDown={(e) => ['ArrowUp', 'ArrowDown'].includes(e.key) && e.preventDefault()}
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
                    <Calculator className="h-5 w-5" />
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
              <Button type="submit" disabled={isLoading || !userId || !principalAmount || !monthlyDeduction || !description}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Loan
              </Button>
            </div>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
}
