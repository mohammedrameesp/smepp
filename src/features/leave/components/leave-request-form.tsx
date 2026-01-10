/**
 * @file leave-request-form.tsx
 * @description Form component for submitting leave requests with balance validation
 * @module components/domains/hr
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { createLeaveRequestSchema } from '@/features/leave/validations/leave';
import { useState, useEffect } from 'react';
import { calculateWorkingDays, formatLeaveDays, calculateRemainingBalance } from '@/features/leave/lib/leave-utils';
import { LeaveRequestType } from '@prisma/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Define form data type that matches form structure
interface FormData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestType: LeaveRequestType;
  reason?: string | null;
  documentUrl?: string | null;
  adminOverrideNotice?: boolean;
}

interface LeaveType {
  id: string;
  name: string;
  color: string;
  requiresDocument: boolean;
  minNoticeDays: number;
  maxConsecutiveDays?: number | null;
  isPaid?: boolean;
  accrualBased?: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
    accrualBased?: boolean;
  };
  // Accrual info for annual leave
  accrued?: number;
}

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  onSuccess?: () => void;
  isAdmin?: boolean;
  // For admin to create leave request on behalf of an employee
  employeeId?: string;
}

export function LeaveRequestForm({ leaveTypes, balances, onSuccess, isAdmin = false, employeeId }: LeaveRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createLeaveRequestSchema) as never,
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      requestType: 'FULL_DAY',
      reason: '',
      documentUrl: null,
      adminOverrideNotice: false,
    },
  });

  const watchStartDate = form.watch('startDate');
  const watchEndDate = form.watch('endDate');
  const watchRequestType = form.watch('requestType');
  const watchLeaveTypeId = form.watch('leaveTypeId');

  // Filter leave types to only show ones the user has balance for
  const availableLeaveTypes = leaveTypes.filter((lt) => {
    const balance = balances.find((b) => b.leaveTypeId === lt.id);
    return balance !== undefined;
  });

  // Update selected leave type and balance when selection changes
  useEffect(() => {
    const leaveType = leaveTypes.find((lt) => lt.id === watchLeaveTypeId);
    setSelectedLeaveType(leaveType || null);

    const balance = balances.find((b) => b.leaveTypeId === watchLeaveTypeId);
    setSelectedBalance(balance || null);

    // Reset request type to FULL_DAY when changing leave type
    if (leaveType) {
      form.setValue('requestType', 'FULL_DAY');
    }
  }, [watchLeaveTypeId, leaveTypes, balances, form]);

  // Calculate working days when dates change
  // Accrual-based leave (Annual Leave) includes weekends, other leave types exclude weekends
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const start = new Date(watchStartDate);
      const end = new Date(watchEndDate);
      if (start <= end) {
        const includeWeekends = selectedLeaveType?.accrualBased === true;
        const days = calculateWorkingDays(start, end, watchRequestType as LeaveRequestType, includeWeekends);
        setCalculatedDays(days);
      } else {
        setCalculatedDays(null);
      }
    } else {
      setCalculatedDays(null);
    }
  }, [watchStartDate, watchEndDate, watchRequestType, selectedLeaveType]);

  // Calculate available balance for selected leave type
  const getAvailableBalance = (): number => {
    if (!selectedBalance) return 0;

    // For annual leave with accrual, use accrued amount
    const effectiveEntitlement = selectedBalance.accrued !== undefined
      ? selectedBalance.accrued
      : Number(selectedBalance.entitlement);

    return calculateRemainingBalance(
      effectiveEntitlement,
      selectedBalance.used,
      selectedBalance.pending,
      selectedBalance.carriedForward,
      selectedBalance.adjustment
    );
  };

  const availableBalance = getAvailableBalance();

  // Check if request exceeds available balance
  const exceedsBalance = calculatedDays !== null && calculatedDays > availableBalance;

  // Determine if half-day options should be shown (not for accrual-based leave like Annual Leave)
  const showHalfDayOption = selectedLeaveType && selectedLeaveType.accrualBased !== true;

  // Check if max consecutive days is exceeded
  const exceedsMaxConsecutiveDays = calculatedDays !== null &&
    selectedLeaveType?.maxConsecutiveDays !== null &&
    selectedLeaveType?.maxConsecutiveDays !== undefined &&
    calculatedDays > selectedLeaveType.maxConsecutiveDays;

  // Check if required document is missing (optional for 1-day leave)
  const watchDocumentUrl = form.watch('documentUrl');
  const isOneDayLeave = calculatedDays !== null && calculatedDays <= 1;
  const missingRequiredDocument = selectedLeaveType?.requiresDocument && !watchDocumentUrl && !isOneDayLeave;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Include employeeId if admin is creating request on behalf of someone
      const requestData = employeeId ? { ...data, employeeId } : data;

      const response = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit leave request');
      }

      form.reset();
      setCalculatedDays(null);
      toast.success('Leave request submitted successfully');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="leaveTypeId">Leave Type *</Label>
        <Select
          value={form.watch('leaveTypeId')}
          onValueChange={(value) => form.setValue('leaveTypeId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {availableLeaveTypes.map((type) => {
              const balance = balances.find((b) => b.leaveTypeId === type.id);
              const isAccrualBased = balance?.accrued !== undefined;
              const effectiveEnt = isAccrualBased
                ? (balance.accrued ?? 0)
                : Number(balance?.entitlement || 0);
              const available = balance
                ? calculateRemainingBalance(
                    effectiveEnt,
                    balance.used,
                    balance.pending,
                    balance.carriedForward,
                    balance.adjustment
                  )
                : 0;

              // For accrual-based (Annual Leave), show accrued amount
              // For others, show available balance (after deducting used/pending)
              const displayValue = isAccrualBased ? (balance?.accrued ?? 0) : available;
              const displayLabel = isAccrualBased ? 'accrued' : 'available';

              return (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <span>{type.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {displayValue.toFixed(1)} days {displayLabel}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {form.formState.errors.leaveTypeId && (
          <p className="text-sm text-red-500">{form.formState.errors.leaveTypeId.message}</p>
        )}
      </div>

      {/* Show balance info when leave type selected */}
      {selectedBalance && (
        <div className="bg-gray-50 p-3 rounded-md space-y-2">
          {selectedBalance.accrued !== undefined ? (
            // Accrual-based leave (Annual Leave)
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accrued Balance</span>
                <span className={`font-semibold ${selectedBalance.accrued > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {selectedBalance.accrued.toFixed(1)} days
                </span>
              </div>
              {selectedBalance.accrued === 0 ? (
                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  Your date of joining is not set. Please contact HR to update your profile.
                </div>
              ) : (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Pro-rata accrual based on months worked this year
                </div>
              )}
              {(Number(selectedBalance.used) > 0 || Number(selectedBalance.pending) > 0) && (
                <div className="text-xs text-gray-500">
                  Used: {Number(selectedBalance.used)} days | Pending: {Number(selectedBalance.pending)} days
                </div>
              )}
            </>
          ) : (
            // Fixed entitlement leave types
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Available Balance</span>
                <span className={`font-semibold ${availableBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {availableBalance.toFixed(1)} days
                </span>
              </div>
              {(Number(selectedBalance.used) > 0 || Number(selectedBalance.pending) > 0) && (
                <div className="text-xs text-gray-500">
                  Entitlement: {Number(selectedBalance.entitlement)} | Used: {Number(selectedBalance.used)} | Pending: {Number(selectedBalance.pending)}
                </div>
              )}
            </>
          )}
          {selectedLeaveType && (
            <div className="text-xs text-gray-500 space-y-1 pt-1 border-t">
              {selectedLeaveType.minNoticeDays > 0 && (
                <p>Requires {selectedLeaveType.minNoticeDays} days advance notice</p>
              )}
              {selectedLeaveType.maxConsecutiveDays && (
                <p>Max {selectedLeaveType.maxConsecutiveDays} consecutive days</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Half day option - only show for non-Annual Leave */}
      {showHalfDayOption && (
        <div className="space-y-2">
          <Label htmlFor="requestType">Request Type</Label>
          <Select
            value={form.watch('requestType') || 'FULL_DAY'}
            onValueChange={(value) => {
              form.setValue('requestType', value as LeaveRequestType);
              // For half-day requests, auto-set end date to match start date
              if (value !== 'FULL_DAY' && form.watch('startDate')) {
                form.setValue('endDate', form.watch('startDate'));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select request type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL_DAY">Full Day</SelectItem>
              <SelectItem value="HALF_DAY_AM">Half Day (AM)</SelectItem>
              <SelectItem value="HALF_DAY_PM">Half Day (PM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(() => {
        const requestType = form.watch('requestType') || 'FULL_DAY';
        const isHalfDay = requestType !== 'FULL_DAY';

        return (
          <div className={isHalfDay ? '' : 'grid grid-cols-2 gap-4'}>
            <div className="space-y-2">
              <Label htmlFor="startDate">{isHalfDay ? 'Date *' : 'Start Date *'}</Label>
              <DatePicker
                id="startDate"
                value={form.watch('startDate')}
                onChange={(value) => {
                  form.setValue('startDate', value);
                  // For half-day, auto-sync end date
                  if (isHalfDay) {
                    form.setValue('endDate', value);
                  }
                }}
                placeholder="DD/MM/YYYY"
                minDate={isAdmin ? undefined : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })()}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            {!isHalfDay && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <DatePicker
                  id="endDate"
                  value={form.watch('endDate')}
                  onChange={(value) => form.setValue('endDate', value)}
                  minDate={isAdmin ? undefined : (() => {
                    const startDate = form.watch('startDate');
                    if (startDate) {
                      // Parse as local time, not UTC (new Date("yyyy-mm-dd") parses as UTC)
                      const [y, m, d] = startDate.split('-').map(Number);
                      return new Date(y, m - 1, d, 0, 0, 0);
                    }
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return today;
                  })()}
                  placeholder="DD/MM/YYYY"
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {calculatedDays !== null && (
        <div className={`p-3 rounded-md text-center ${exceedsBalance || exceedsMaxConsecutiveDays ? 'bg-red-50' : 'bg-blue-50'}`}>
          <div className="flex items-center justify-center gap-2">
            {exceedsBalance || exceedsMaxConsecutiveDays ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            )}
            <span className={`font-semibold ${exceedsBalance || exceedsMaxConsecutiveDays ? 'text-red-800' : 'text-blue-800'}`}>
              Duration: {formatLeaveDays(calculatedDays)}
            </span>
          </div>
          <span className={`text-sm ${exceedsBalance || exceedsMaxConsecutiveDays ? 'text-red-600' : 'text-blue-600'}`}>
            {exceedsBalance
              ? `Exceeds available balance (${availableBalance.toFixed(1)} days)`
              : exceedsMaxConsecutiveDays
                ? `Exceeds max consecutive days (${selectedLeaveType?.maxConsecutiveDays} days)`
                : selectedLeaveType?.accrualBased
                  ? '(includes weekends)'
                  : '(excludes Fri/Sat weekends)'}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          placeholder="Optional reason for leave"
          rows={3}
          {...form.register('reason')}
        />
      </div>

      {/* Supporting document */}
      <div className="space-y-2">
        <Label htmlFor="documentUrl">
          Supporting Document URL
          {selectedLeaveType?.requiresDocument ? (
            isOneDayLeave ? (
              <span className="text-gray-400 font-normal ml-1">(optional for 1-day leave)</span>
            ) : (
              <span className="text-red-500 font-normal ml-1">*</span>
            )
          ) : (
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          )}
        </Label>
        <Input
          id="documentUrl"
          type="url"
          placeholder="https://..."
          className={missingRequiredDocument ? 'border-red-300' : ''}
          {...form.register('documentUrl')}
        />
        {missingRequiredDocument ? (
          <p className="text-xs text-red-500">
            A supporting document is required for {selectedLeaveType?.name}
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            Link to supporting document (e.g., medical certificate, travel itinerary)
          </p>
        )}
      </div>

      {/* Admin override for advance notice requirement */}
      {isAdmin && selectedLeaveType && selectedLeaveType.minNoticeDays > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <input
            type="checkbox"
            id="adminOverrideNotice"
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            {...form.register('adminOverrideNotice')}
          />
          <label htmlFor="adminOverrideNotice" className="text-sm text-amber-800">
            Override {selectedLeaveType.minNoticeDays}-day advance notice requirement (Admin only)
          </label>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || exceedsBalance || availableBalance <= 0 || exceedsMaxConsecutiveDays || missingRequiredDocument}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
      </Button>

      {availableBalance <= 0 && selectedLeaveType && (
        <p className="text-sm text-center text-red-600">
          You have no available balance for {selectedLeaveType.name}
        </p>
      )}
    </form>
  );
}
