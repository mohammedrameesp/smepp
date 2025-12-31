'use client';

/**
 * @file BankingDocumentsStep.tsx
 * @description Step 4: Banking & Documents
 * @module employee-onboarding/steps
 */

import { Building2, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentUpload } from '@/components/domains/hr/profile';
import { QATAR_BANKS } from '@/lib/data/constants';

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
                <Input
                  value={(formData.iban as string) || ''}
                  onChange={(e) => updateField('iban', e.target.value.toUpperCase())}
                  placeholder="QA00XXXX0000000000XXXXXXXXXXX"
                  className={errors.iban ? 'border-red-500' : ''}
                />
                {errors.iban && (
                  <p className="text-sm text-red-600">{errors.iban}</p>
                )}
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

        {/* Optional Photo */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-600">Profile Photo (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUpload
              id="photo"
              label="Passport-size Photo"
              value={(formData.photoUrl as string) || ''}
              onChange={(url) => updateField('photoUrl', url)}
              accept="image/jpeg,image/png"
              description="Professional headshot"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
