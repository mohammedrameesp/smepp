'use client';

/**
 * @file IdentificationStep.tsx
 * @description Step 3: Identification & Legal
 * @module employee-onboarding/steps
 */

import { CreditCard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

export function IdentificationStep({ formData, updateField, errors }: IdentificationStepProps) {
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
                  onChange={(e) => updateField('qidNumber', e.target.value)}
                  placeholder="284XXXXXXXX"
                  maxLength={11}
                  className={errors.qidNumber ? 'border-red-500' : ''}
                />
                {errors.qidNumber && (
                  <p className="text-sm text-red-600">{errors.qidNumber}</p>
                )}
                <p className="text-xs text-slate-500">11 digits</p>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-red-500">*</span></Label>
                <DatePicker
                  value={formatDateForPicker(formData.qidExpiry as string)}
                  onChange={(val) => updateField('qidExpiry', val)}
                  placeholder="DD/MM/YYYY"
                />
                {errors.qidExpiry && (
                  <p className="text-sm text-red-600">{errors.qidExpiry}</p>
                )}
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
                />
                {errors.passportExpiry && (
                  <p className="text-sm text-red-600">{errors.passportExpiry}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional (Optional) */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-600">Optional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Health Card Expiry</Label>
              <DatePicker
                value={formatDateForPicker(formData.healthCardExpiry as string)}
                onChange={(val) => updateField('healthCardExpiry', val)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
