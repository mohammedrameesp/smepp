'use client';

/**
 * @file EducationSkillsStep.tsx
 * @description Step 5: Education & Skills
 * @module employee-onboarding/steps
 */

import { GraduationCap, Check, X } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectTags, TagsInput } from '@/components/domains/hr/profile/multi-select-tags';
import { QUALIFICATIONS, LANGUAGES } from '@/lib/constants';

// Graduation year validation constants
const MIN_GRAD_YEAR = new Date().getFullYear() - 50;
const MAX_GRAD_YEAR = new Date().getFullYear() + 4;

// Graduation year validation hint component
function GraduationYearHint({ year }: { year: string }) {
  if (!year) return null;

  const yearNum = parseInt(year, 10);
  const isValidNumber = !isNaN(yearNum);
  const isInRange = isValidNumber && yearNum >= MIN_GRAD_YEAR && yearNum <= MAX_GRAD_YEAR;

  if (isInRange) {
    return (
      <p className="text-xs text-green-600 flex items-center gap-1">
        <Check className={ICON_SIZES.xs} /> Valid year
      </p>
    );
  }

  if (isValidNumber) {
    return (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <X className={ICON_SIZES.xs} />
        Must be between {MIN_GRAD_YEAR} and {MAX_GRAD_YEAR}
      </p>
    );
  }

  return null;
}

interface EducationSkillsStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

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
          <GraduationCap className={`${ICON_SIZES.xl} text-amber-600`} />
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
                  min={MIN_GRAD_YEAR}
                  max={MAX_GRAD_YEAR}
                  value={(formData.graduationYear as string) || ''}
                  onChange={(e) => updateField('graduationYear', e.target.value)}
                  placeholder={`e.g., ${new Date().getFullYear() - 5}`}
                  className={errors.graduationYear ? 'border-red-500' : ''}
                />
                <GraduationYearHint year={(formData.graduationYear as string) || ''} />
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

      </div>
    </div>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */