'use client';

/**
 * @file EducationSkillsStep.tsx
 * @description Step 5: Education, Skills & Driving License
 * @module employee-onboarding/steps
 */

import { GraduationCap, Car, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectTags, TagsInput } from '@/components/domains/hr/profile/multi-select-tags';
import { QUALIFICATIONS, LANGUAGES } from '@/lib/data/constants';

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

interface EducationSkillsStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const formatDateForPicker = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// Helper to parse JSON array from string
const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function EducationSkillsStep({ formData, updateField, errors }: EducationSkillsStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Education & Skills</h2>
        <p className="text-slate-600">
          Your qualifications, skills, and additional information.
        </p>
      </div>

      <div className="space-y-6">
        {/* Education Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Education</CardTitle>
            <CardDescription>Your academic background</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Highest Qualification</Label>
                <Select
                  value={(formData.highestQualification as string) || ''}
                  onValueChange={(val) => updateField('highestQualification', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Specialization/Major</Label>
                <Input
                  value={(formData.specialization as string) || ''}
                  onChange={(e) => updateField('specialization', e.target.value)}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  value={(formData.institutionName as string) || ''}
                  onChange={(e) => updateField('institutionName', e.target.value)}
                  placeholder="e.g., University of Qatar"
                />
              </div>

              <div className="space-y-2">
                <Label>Year of Graduation</Label>
                <Input
                  type="number"
                  min={new Date().getFullYear() - 50}
                  max={new Date().getFullYear() + 4}
                  value={(formData.graduationYear as string) || ''}
                  onChange={(e) => updateField('graduationYear', e.target.value)}
                  placeholder={`e.g., ${new Date().getFullYear() - 5}`}
                  className={errors.graduationYear ? 'border-red-500' : ''}
                />
                {errors.graduationYear && (
                  <p className="text-sm text-red-600">{errors.graduationYear}</p>
                )}
                <p className="text-xs text-slate-400">
                  {new Date().getFullYear() - 50} - {new Date().getFullYear() + 4} (future years for expected graduation)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills & Languages Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills & Languages</CardTitle>
            <CardDescription>Your professional skills and language proficiency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Languages Known</Label>
              <MultiSelectTags
                options={LANGUAGES}
                value={parseJsonArray(formData.languagesKnown as string)}
                onChange={(values) => updateField('languagesKnown', JSON.stringify(values))}
                placeholder="Select or type languages"
                allowCustom
              />
            </div>

            <div className="space-y-2">
              <Label>Skills & Certifications</Label>
              <TagsInput
                value={parseJsonArray(formData.skillsCertifications as string)}
                onChange={(values) => updateField('skillsCertifications', JSON.stringify(values))}
                placeholder="Type skill and press Enter"
              />
              <p className="text-xs text-slate-500">
                Add certifications like PMP, AWS, CPA, or technical skills
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Driving License Card */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base text-slate-600">Driving License (Optional)</CardTitle>
            </div>
            <CardDescription>Leave blank if you don&apos;t have a license</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>License Expiry Date</Label>
              <DatePicker
                value={formatDateForPicker(formData.licenseExpiry as string)}
                onChange={(val) => updateField('licenseExpiry', val)}
                placeholder="DD/MM/YYYY"
              />
              {errors.licenseExpiry && (
                <p className="text-sm text-red-600">{errors.licenseExpiry}</p>
              )}
              {isExpired(formData.licenseExpiry as string) && (
                <div className="flex items-center gap-1.5 text-amber-600 text-xs mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>License appears to be expired</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
