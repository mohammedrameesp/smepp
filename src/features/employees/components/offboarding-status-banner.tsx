/**
 * @file offboarding-status-banner.tsx
 * @description Banner showing offboarding status and details for an employee
 * @module features/employees/components
 */
'use client';

import { UserMinus } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';
import { AlertBanner } from '@/components/ui/alert-banner';
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
    <AlertBanner
      variant="warning"
      icon={UserMinus}
      title="Offboarded"
      description={
        <>
          <p>
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
          <div className="mt-2">
            <span className="font-medium">Reason:</span> {reasonLabel}
          </div>
          {offboardingNotes && (
            <div className="mt-1">
              <span className="font-medium">Notes:</span> {offboardingNotes}
            </div>
          )}
        </>
      }
      action={<CancelOffboardingButton employeeId={employeeId} employeeName={employeeName} />}
      className="mb-6"
    />
  );
}
