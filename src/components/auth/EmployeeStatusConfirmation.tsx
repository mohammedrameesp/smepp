'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, User, AlertCircle } from 'lucide-react';
import { detectServiceEmail, getDetectionMessage } from '@/lib/utils/email-pattern-detection';

interface EmployeeStatusConfirmationProps {
  email: string;
  /** Called when user confirms their status */
  onConfirm: (status: { isEmployee: boolean; isOnWps: boolean }) => void;
  /** If true, shows inline (no card wrapper) */
  inline?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component to confirm if a user is an employee or a system/service account.
 * Shows email pattern detection with option to override.
 * If employee, also asks about WPS status.
 */
export function EmployeeStatusConfirmation({
  email,
  onConfirm,
  inline = false,
  className = '',
}: EmployeeStatusConfirmationProps) {
  // Detect if email looks like a service account
  const detection = detectServiceEmail(email);
  const detectionMessage = getDetectionMessage(email, detection);

  // Initial state based on detection - system account if service email detected
  const [isSystemAccount, setIsSystemAccount] = useState(detection.isLikelyServiceEmail);
  const [isOnWps, setIsOnWps] = useState(false);

  // Reset when email changes
  useEffect(() => {
    const newDetection = detectServiceEmail(email);
    setIsSystemAccount(newDetection.isLikelyServiceEmail);
    setIsOnWps(false);
  }, [email]);

  const handleConfirm = () => {
    onConfirm({
      isEmployee: !isSystemAccount,
      isOnWps: !isSystemAccount ? isOnWps : false,
    });
  };

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Detection message */}
      {detectionMessage && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{detectionMessage}</span>
        </div>
      )}

      {/* System account checkbox */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
        <Checkbox
          id="isSystemAccount"
          checked={isSystemAccount}
          onCheckedChange={(checked) => {
            setIsSystemAccount(checked === true);
            if (checked) setIsOnWps(false);
          }}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label
            htmlFor="isSystemAccount"
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            This is a system/shared account
          </Label>
          <p className="text-xs text-slate-500 mt-1">
            System accounts (like info@, admin@, support@) don&apos;t require an HR profile
            and will use the organization logo as their avatar.
          </p>
        </div>
      </div>

      {/* WPS checkbox - only shown for employees */}
      {!isSystemAccount && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
          <Checkbox
            id="isOnWps"
            checked={isOnWps}
            onCheckedChange={(checked) => setIsOnWps(checked === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label
              htmlFor="isOnWps"
              className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            >
              <User className="h-4 w-4 text-slate-500" />
              This employee is on WPS
            </Label>
            <p className="text-xs text-slate-500 mt-1">
              Wage Protection System - select if this employee&apos;s salary is paid through WPS.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
        {isSystemAccount ? (
          <p>
            <strong>Account type:</strong> System/Shared Account
            <br />
            <span className="text-xs text-slate-500">No HR profile required. Will use organization logo as avatar.</span>
          </p>
        ) : (
          <p>
            <strong>Account type:</strong> Employee
            {isOnWps && ' (WPS)'}
            <br />
            <span className="text-xs text-slate-500">Will need to complete HR profile after joining.</span>
          </p>
        )}
      </div>

      {!inline && (
        <Button onClick={handleConfirm} className="w-full">
          Continue
        </Button>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Account Type</CardTitle>
        <CardDescription>
          Help us set up your account correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}

export default EmployeeStatusConfirmation;
