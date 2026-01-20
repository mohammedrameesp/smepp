/**
 * @file offboard-employee-dialog.tsx
 * @description Dialog for offboarding an employee with last working day and reason
 * @module features/employees/components
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import {
  offboardingReasons,
  offboardingReasonLabels,
  type OffboardingReason,
} from '../validations/offboarding';

interface OffboardEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  dateOfJoining?: Date | null;
}

export function OffboardEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  dateOfJoining,
}: OffboardEmployeeDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [reason, setReason] = useState<OffboardingReason | ''>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ lastWorkingDay?: string; reason?: string }>({});

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});

    // Validate
    const newErrors: { lastWorkingDay?: string; reason?: string } = {};
    if (!lastWorkingDay) {
      newErrors.lastWorkingDay = 'Last working day is required';
    }
    if (!reason) {
      newErrors.reason = 'Please select a reason';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${employeeId}/offboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastWorkingDay,
          reason,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to offboard employee');
      }

      toast.success(`${employeeName} has been offboarded`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Offboard error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to offboard employee', {
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setLastWorkingDay('');
      setReason('');
      setNotes('');
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  // Calculate min date for date picker (can't be before joining date)
  const minDate = dateOfJoining ? new Date(dateOfJoining) : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <UserMinus className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Offboard Employee</DialogTitle>
              <DialogDescription>
                Set the last working day for <strong>{employeeName}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lastWorkingDay">
              Last Working Day <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              id="lastWorkingDay"
              value={lastWorkingDay}
              onChange={setLastWorkingDay}
              minDate={minDate}
              required
            />
            {errors.lastWorkingDay && (
              <p className="text-sm text-red-500">{errors.lastWorkingDay}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={(val) => setReason(val as OffboardingReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {offboardingReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {offboardingReasonLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the offboarding..."
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-slate-500">{notes.length}/1000 characters</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-slate-700 mb-1">What happens when you offboard:</p>
            <ul className="text-slate-600 space-y-1 list-disc list-inside">
              <li>Status changes to &quot;Offboarded&quot;</li>
              <li>Employee can still login until their last working day</li>
              <li>Record is retained permanently for compliance</li>
              <li>Gratuity calculations use the last working day</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Offboarding...
              </>
            ) : (
              'Offboard Employee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
