'use client';

/**
 * @file PersonalStep.tsx
 * @description Step 1: Personal & Employment Information
 * @module employee-onboarding/steps
 */

import { User } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { CountrySelect } from '@/components/ui/country-select';
import { GENDERS, MARITAL_STATUS } from '@/lib/data/constants';
import { toInputDateString } from '@/lib/core/datetime';

// DOB constraints: must be 18-80 years old
const getMaxDOB = (): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

const getMinDOB = (): Date => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 80);
  return date;
};

interface PersonalStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

export function PersonalStep({ formData, updateField, errors }: PersonalStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <User className={`${ICON_SIZES.xl} text-blue-600`} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Personal Information</h2>
        <p className="text-slate-600">
          Let&apos;s start with your basic personal and employment details.
        </p>
      </div>

      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">
              Date of Birth <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              id="dateOfBirth"
              value={toInputDateString(formData.dateOfBirth as string)}
              onChange={(val) => updateField('dateOfBirth', val)}
              placeholder="DD/MM/YYYY"
              minDate={getMinDOB()}
              maxDate={getMaxDOB()}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-red-600">{errors.dateOfBirth}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">
              Nationality <span className="text-red-500">*</span>
            </Label>
            <CountrySelect
              id="nationality"
              value={(formData.nationality as string) || ''}
              onChange={(val) => updateField('nationality', val)}
              placeholder="Select country"
            />
            {errors.nationality && (
              <p className="text-sm text-red-600">{errors.nationality}</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">
              Gender <span className="text-red-500">*</span>
            </Label>
            <Select
              value={(formData.gender as string) || ''}
              onValueChange={(val) => updateField('gender', val)}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-red-600">{errors.gender}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select
              value={(formData.maritalStatus as string) || ''}
              onValueChange={(val) => updateField('maritalStatus', val)}
            >
              <SelectTrigger id="maritalStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.maritalStatus && (
              <p className="text-sm text-red-600">{errors.maritalStatus}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
