'use client';

/**
 * @file BankingDocumentsStep.tsx
 * @description Step 4: Banking & Documents
 * @module employee-onboarding/steps
 */

import { Building2, FileText, Check, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUpload, ProfilePhotoUpload } from '@/components/domains/hr/profile';
import { QATAR_BANKS } from '@/lib/data/constants';

// IBAN validation hint component - shows character count only (QA prefix is fixed)
function IbanValidationHint({ iban }: { iban: string }) {
  // Full IBAN includes QA prefix
  const fullLength = iban ? iban.length + 2 : 0;
  const isComplete = fullLength === 29;

  if (!iban) {
    return <p className="text-xs text-slate-500">27 characters after QA</p>;
  }

  if (isComplete) {
    return (
      <p className="text-xs text-green-600 flex items-center gap-1">
        <Check className="h-3 w-3" /> Valid IBAN format
      </p>
    );
  }

  return (
    <p className={`text-xs flex items-center gap-1 ${isComplete ? 'text-green-600' : 'text-slate-500'}`}>
      {isComplete ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 text-slate-400" />}
      {fullLength}/29 characters
    </p>
  );
}

interface BankingDocumentsStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

export function BankingDocumentsStep({ formData, updateField, errors }: BankingDocumentsStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Banking & Documents</h2>
        <p className="text-slate-600">
          Bank details for salary and required document uploads.
        </p>
      </div>

      <div className="space-y-6">
        {/* Bank Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bank Details</CardTitle>
            <CardDescription>For salary payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name <span className="text-red-500">*</span></Label>
                <Select
                  value={(formData.bankName as string) || ''}
                  onValueChange={(val) => updateField('bankName', val)}
                >
                  <SelectTrigger className={errors.bankName ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {QATAR_BANKS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankName && (
                  <p className="text-sm text-red-600">{errors.bankName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>IBAN <span className="text-red-500">*</span></Label>
                <div className="flex">
                  <div className="flex items-center justify-center px-3 py-2 bg-slate-100 border border-r-0 rounded-l-md text-sm font-medium text-slate-700">
                    QA
                  </div>
                  <Input
                    value={((formData.iban as string) || '').replace(/^QA/i, '')}
                    onChange={(e) => {
                      // Remove spaces and non-alphanumeric, uppercase
                      const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                      // Always store with QA prefix
                      updateField('iban', 'QA' + value);
                    }}
                    placeholder="00XXXX0000000000000000000"
                    maxLength={27}
                    className={`rounded-l-none ${errors.iban ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.iban && (
                  <p className="text-sm text-red-600">{errors.iban}</p>
                )}
                <IbanValidationHint iban={((formData.iban as string) || '').replace(/^QA/i, '')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Required Documents</CardTitle>
            </div>
            <CardDescription>
              Upload copies of your ID documents (JPG, PNG, or PDF, max 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <DocumentUpload
                id="qidCopy"
                label="QID Copy *"
                value={(formData.qidUrl as string) || ''}
                onChange={(url) => updateField('qidUrl', url)}
                accept="image/jpeg,image/png,application/pdf"
                description="Front of your QID"
              />

              <DocumentUpload
                id="passportCopy"
                label="Passport Copy *"
                value={(formData.passportCopyUrl as string) || ''}
                onChange={(url) => updateField('passportCopyUrl', url)}
                accept="image/jpeg,image/png,application/pdf"
                description="Main passport page"
              />
            </div>
            {(errors.qidUrl || errors.passportCopyUrl) && (
              <p className="text-sm text-red-600 mt-3">
                Please upload both required documents
              </p>
            )}
          </CardContent>
        </Card>

        {/* Profile Photo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Photo <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePhotoUpload
              id="photo"
              label="Passport-size Photo"
              value={(formData.photoUrl as string) || ''}
              onChange={(url) => updateField('photoUrl', url)}
              employeeName={`${(formData.firstName as string) || ''} ${(formData.lastName as string) || ''}`.trim() || 'Employee Name'}
            />
            {errors.photoUrl && (
              <p className="text-sm text-red-600 mt-2">{errors.photoUrl}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
