'use client';

/**
 * @file ReviewStep.tsx
 * @description Step 5: Review all information before completing onboarding
 * @module employee-onboarding/steps
 */

import { CheckCircle2, Pencil, User, Phone, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReviewStepProps {
  formData: Record<string, string | null>;
  workEmail: string;
  onEdit: (step: number) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function str(value: string | null | undefined): string {
  return value || '-';
}

function ReviewSection({
  title,
  icon: Icon,
  step,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ElementType;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(step)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value || '-'}</dd>
    </div>
  );
}

export function ReviewStep({ formData, workEmail, onEdit }: ReviewStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Your Information</h2>
        <p className="text-slate-600">
          Please review your details before completing onboarding.
        </p>
      </div>

      <div className="space-y-4">
        {/* Personal Information */}
        <ReviewSection title="Personal Information" icon={User} step={1} onEdit={onEdit}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Date of Birth" value={formatDate(formData.dateOfBirth)} />
            <Field label="Date of Joining" value={formatDate(formData.dateOfJoining)} />
            <Field label="Gender" value={formData.gender} />
            <Field label="Nationality" value={formData.nationality} />
            {formData.maritalStatus && (
              <Field label="Marital Status" value={formData.maritalStatus} />
            )}
          </dl>
        </ReviewSection>

        {/* Contact Information */}
        <ReviewSection title="Contact & Emergency" icon={Phone} step={2} onEdit={onEdit}>
          <div className="space-y-4">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Qatar Mobile" value={formData.qatarMobile ? `+974 ${formData.qatarMobile}` : null} />
              <Field
                label="Other Mobile"
                value={
                  formData.otherMobileNumber
                    ? `${formData.otherMobileCode || ''} ${formData.otherMobileNumber}`
                    : null
                }
              />
              <Field label="Personal Email" value={formData.personalEmail} />
              <Field label="Work Email" value={workEmail} />
            </dl>

            {(formData.qatarZone || formData.qatarStreet) && (
              <div>
                <dt className="text-xs text-slate-500 mb-1">Qatar Address</dt>
                <dd className="text-sm text-slate-900">
                  {[
                    formData.qatarZone && `Zone ${formData.qatarZone}`,
                    formData.qatarStreet && `Street ${formData.qatarStreet}`,
                    formData.qatarBuilding && `Building ${formData.qatarBuilding}`,
                    formData.qatarUnit && `Unit ${formData.qatarUnit}`,
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </dd>
              </div>
            )}

            <div className="border-t pt-3">
              <h4 className="text-xs font-medium text-slate-500 mb-2">Emergency Contacts</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Local (Qatar)</p>
                  <p className="text-sm font-medium text-slate-900">
                    {str(formData.localEmergencyName)}
                  </p>
                  <p className="text-xs text-slate-600">
                    {str(formData.localEmergencyRelation)} &bull;{' '}
                    {formData.localEmergencyPhone
                      ? `${formData.localEmergencyPhoneCode || ''} ${formData.localEmergencyPhone}`
                      : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Home Country</p>
                  <p className="text-sm font-medium text-slate-900">
                    {str(formData.homeEmergencyName)}
                  </p>
                  <p className="text-xs text-slate-600">
                    {str(formData.homeEmergencyRelation)} &bull;{' '}
                    {formData.homeEmergencyPhone
                      ? `${formData.homeEmergencyPhoneCode || ''} ${formData.homeEmergencyPhone}`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ReviewSection>

        {/* Identification */}
        <ReviewSection title="ID & Legal" icon={CreditCard} step={3} onEdit={onEdit}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="QID Number" value={formData.qidNumber} />
            <Field label="QID Expiry" value={formatDate(formData.qidExpiry)} />
            <Field label="Passport Number" value={formData.passportNumber} />
            <Field label="Passport Expiry" value={formatDate(formData.passportExpiry)} />
            {formData.healthCardExpiry && (
              <Field label="Health Card Expiry" value={formatDate(formData.healthCardExpiry)} />
            )}
            {formData.sponsorshipType && (
              <Field label="Sponsorship Type" value={formData.sponsorshipType} />
            )}
          </dl>
        </ReviewSection>

        {/* Banking */}
        <ReviewSection title="Banking & Documents" icon={Building2} step={4} onEdit={onEdit}>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Bank Name" value={formData.bankName} />
            <Field label="IBAN" value={formData.iban} />
          </dl>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-slate-500 mb-2">Uploaded Documents</p>
            <div className="flex gap-2">
              {formData.qidUrl && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  QID Copy
                </span>
              )}
              {formData.passportCopyUrl && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Passport Copy
                </span>
              )}
              {formData.photoUrl && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Photo
                </span>
              )}
              {!formData.qidUrl && !formData.passportCopyUrl && !formData.photoUrl && (
                <span className="text-xs text-slate-400">No documents uploaded</span>
              )}
            </div>
          </div>
        </ReviewSection>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> After completing onboarding, your HR department will be notified
          to review your information. You can update your profile anytime from the dashboard.
        </p>
      </div>
    </div>
  );
}
