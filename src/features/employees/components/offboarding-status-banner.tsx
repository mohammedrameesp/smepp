/**
 * @file offboarding-status-banner.tsx
 * @description Banner showing offboarding status and details for an employee
 * @module features/employees/components
 */
'use client';

import { UserMinus } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';
import { CancelOffboardingButton } from './cancel-offboarding-button';
import {
  offboardingReasonLabels,
  type OffboardingReason,
} from '../validations/offboarding';

interface OffboardingStatusBannerProps {
  employeeId: string;
  employeeName: string;
  dateOfLeaving?: Date | null;
  offboardingReason?: string | null;
  offboardingNotes?: string | null;
}

export function OffboardingStatusBanner({
  employeeId,
  employeeName,
  dateOfLeaving,
  offboardingReason,
  offboardingNotes,
}: OffboardingStatusBannerProps) {
  const reasonLabel = offboardingReason
    ? offboardingReasonLabels[offboardingReason as OffboardingReason] || offboardingReason
    : 'Not specified';

  const isPastLeaving = dateOfLeaving ? new Date(dateOfLeaving) < new Date() : false;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <UserMinus className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-amber-800">Offboarded</h3>
        <p className="text-sm text-amber-700">
          {isPastLeaving ? (
            <>
              This employee&apos;s last working day was{' '}
              <strong>{dateOfLeaving ? formatDate(dateOfLeaving) : 'N/A'}</strong>.
            </>
          ) : (
            <>
              This employee is scheduled to leave on{' '}
              <strong>{dateOfLeaving ? formatDate(dateOfLeaving) : 'N/A'}</strong>.
            </>
          )}
        </p>
        <div className="mt-2 text-sm text-amber-600">
          <span className="font-medium">Reason:</span> {reasonLabel}
        </div>
        {offboardingNotes && (
          <div className="mt-1 text-sm text-amber-600">
            <span className="font-medium">Notes:</span> {offboardingNotes}
          </div>
        )}
      </div>
      <CancelOffboardingButton employeeId={employeeId} employeeName={employeeName} />
    </div>
  );
}
