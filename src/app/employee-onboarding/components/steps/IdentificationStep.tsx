'use client';

/**
 * @file IdentificationStep.tsx
 * @description Step 3: Identification & Legal
 * @module employee-onboarding/steps
 */

import { CreditCard, AlertTriangle, Check, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// QID validation hint component
function QidValidationHint({ qid }: { qid: string }) {
  if (!qid) {
    return <p className="text-xs text-slate-500">11 digits, starts with 2 or 3</p>;
  }

  const isValidLength = qid.length === 11;
  const isValidStart = qid.startsWith('2') || qid.startsWith('3');
  const isComplete = isValidLength && isValidStart;

  if (isComplete) {
    return (
      <p className="text-xs text-green-600 flex items-center gap-1">
        <Check className="h-3 w-3" /> Valid QID format
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Only show "Starts with 2 or 3" when it's wrong */}
      {!isValidStart && qid.length > 0 && (
        <p className="text-xs flex items-center gap-1 text-red-500">
          <X className="h-3 w-3" />
          Must start with 2 or 3
        </p>
      )}
      <p className={`text-xs flex items-center gap-1 ${isValidLength ? 'text-green-600' : 'text-slate-500'}`}>
        {isValidLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
        {qid.length}/11 digits
      </p>
    </div>
  );
}

// Check if a date is in the past
function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  } catch {
    return false;
  }
}

// Expiry warning component
function ExpiryWarning({ date, label }: { date: string | null | undefined; label: string }) {
  if (!isExpired(date)) return null;
  return (
    <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-1">
      <AlertTriangle className="h-3 w-3" />
      <span>{label} appears to be expired</span>
    </div>
  );
}

interface IdentificationStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const formatDateForPicker = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// Calculate minimum date (2 years back from today)
const getMinExpiryDate = (): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date;
};

export function IdentificationStep({ formData, updateField, errors }: IdentificationStepProps) {
  const minExpiryDate = getMinExpiryDate();
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Identification & Legal</h2>
        <p className="text-slate-600">
          Your Qatar ID and passport information.
        </p>
      </div>

      <div className="space-y-6">
        {/* QID Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Qatar ID (QID)</CardTitle>
            <CardDescription>Your resident permit details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>QID Number <span className="text-red-500">*</span></Label>
                <Input
                  value={(formData.qidNumber as string) || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    updateField('qidNumber', value);
                  }}
                  placeholder="28400000000"
                  maxLength={11}
                  inputMode="numeric"
                  className={errors.qidNumber ? 'border-red-500' : ''}
                />
                {errors.qidNumber && (
                  <p className="text-sm text-red-600">{errors.qidNumber}</p>
                )}
                <QidValidationHint qid={(formData.qidNumber as string) || ''} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formatDateForPicker(formData.qidExpiry as string)}
                  onChange={(val) => updateField('qidExpiry', val)}
                  placeholder="DD/MM/YYYY"
                  minDate={minExpiryDate}
                />
                {errors.qidExpiry && (
                  <p className="text-sm text-red-600">{errors.qidExpiry}</p>
                )}
                <ExpiryWarning date={formData.qidExpiry as string} label="QID" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passport Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Passport</CardTitle>
            <CardDescription>Your travel document details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passport Number <span className="text-red-500">*</span></Label>
                <Input
                  value={(formData.passportNumber as string) || ''}
                  onChange={(e) => updateField('passportNumber', e.target.value.toUpperCase())}
                  placeholder="AB1234567"
                  className={errors.passportNumber ? 'border-red-500' : ''}
                />
                {errors.passportNumber && (
                  <p className="text-sm text-red-600">{errors.passportNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formatDateForPicker(formData.passportExpiry as string)}
                  onChange={(val) => updateField('passportExpiry', val)}
                  placeholder="DD/MM/YYYY"
                  minDate={minExpiryDate}
                />
                {errors.passportExpiry && (
                  <p className="text-sm text-red-600">{errors.passportExpiry}</p>
                )}
                <ExpiryWarning date={formData.passportExpiry as string} label="Passport" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional (Optional) */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-600">Optional Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Health Card Expiry</Label>
                <DatePicker
                  value={formatDateForPicker(formData.healthCardExpiry as string)}
                  onChange={(val) => updateField('healthCardExpiry', val)}
                  placeholder="DD/MM/YYYY"
                  minDate={minExpiryDate}
                />
                <ExpiryWarning date={formData.healthCardExpiry as string} label="Health Card" />
                <p className="text-xs text-slate-400">Leave blank if you don&apos;t have one</p>
              </div>
              <div className="space-y-2">
                <Label>Driving License Expiry</Label>
                <DatePicker
                  value={formatDateForPicker(formData.drivingLicenseExpiry as string)}
                  onChange={(val) => updateField('drivingLicenseExpiry', val)}
                  placeholder="DD/MM/YYYY"
                  minDate={minExpiryDate}
                />
                <ExpiryWarning date={formData.drivingLicenseExpiry as string} label="Driving License" />
                <p className="text-xs text-slate-400">Leave blank if you don&apos;t have one</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
