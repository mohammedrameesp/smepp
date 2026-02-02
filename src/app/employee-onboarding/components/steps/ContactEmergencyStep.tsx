'use client';

/**
 * @file ContactEmergencyStep.tsx
 * @description Step 2: Contact & Emergency Information
 * @module employee-onboarding/steps
 */

import { useCallback } from 'react';
import { Phone, Lock, MapPin, Home, Mail } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput, QatarPhoneInput } from '@/components/domains/hr/profile';
import { RELATIONSHIPS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QatarAddressSelect, type QatarAddressValue } from '@/components/ui/qatar-address-select';

interface ContactEmergencyStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  workEmail: string;
}

export function ContactEmergencyStep({ formData, updateField, errors, workEmail }: ContactEmergencyStepProps) {
  // Handler for Qatar address changes from the cascading select
  const handleAddressChange = useCallback(
    (address: QatarAddressValue) => {
      updateField('qatarZone', address.zone);
      updateField('qatarStreet', address.street);
      updateField('qatarBuilding', address.building);
      updateField('qatarUnit', address.unit || '');
      // Store coordinates if available
      if (address.latitude !== undefined) {
        updateField('qatarLatitude', address.latitude);
      }
      if (address.longitude !== undefined) {
        updateField('qatarLongitude', address.longitude);
      }
    },
    [updateField]
  );

  // Current address value for the component
  const addressValue: QatarAddressValue = {
    zone: (formData.qatarZone as string) || '',
    street: (formData.qatarStreet as string) || '',
    building: (formData.qatarBuilding as string) || '',
    unit: (formData.qatarUnit as string) || '',
    latitude: formData.qatarLatitude as number | undefined,
    longitude: formData.qatarLongitude as number | undefined,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Phone className={`${ICON_SIZES.xl} text-green-600`} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Contact & Emergency</h2>
        <p className="text-slate-600">
          Your contact details and emergency contacts.
        </p>
      </div>

      <div className="space-y-6">
        {/* Qatar Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className={`${ICON_SIZES.sm} text-emerald-600`} />
              <CardTitle className="text-base">Qatar Details</CardTitle>
            </div>
            <CardDescription>Your contact information in Qatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Qatar Mobile <span className="text-red-500">*</span></Label>
              <QatarPhoneInput
                value={(formData.qatarMobile as string) || ''}
                onChange={(val) => updateField('qatarMobile', val)}
                placeholder="12345678"
                error={errors.qatarMobile}
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-2 block">
                Qatar Address <span className="text-red-500">*</span>
              </Label>
              <QatarAddressSelect
                value={addressValue}
                onChange={handleAddressChange}
                errors={{
                  zone: errors.qatarZone,
                  street: errors.qatarStreet,
                  building: errors.qatarBuilding,
                }}
                showMap={true}
              />
            </div>

            {/* Local Emergency Contact */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold text-slate-700">
                Emergency Contact <span className="text-red-500">*</span>
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={(formData.localEmergencyName as string) || ''}
                    onChange={(e) => updateField('localEmergencyName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select
                    value={(formData.localEmergencyRelation as string) || ''}
                    onValueChange={(val) => updateField('localEmergencyRelation', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <PhoneInput
                    codeValue={(formData.localEmergencyPhoneCode as string) || '+974'}
                    numberValue={(formData.localEmergencyPhone as string) || ''}
                    onCodeChange={(val) => updateField('localEmergencyPhoneCode', val)}
                    onNumberChange={(val) => updateField('localEmergencyPhone', val)}
                    error={errors.localEmergencyPhone}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Home Country Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Home className={`${ICON_SIZES.sm} text-blue-600`} />
              <CardTitle className="text-base">Home Country Details</CardTitle>
              <span className="text-xs text-slate-400 font-normal">(Optional)</span>
            </div>
            <CardDescription>Your contact information in your home country</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mobile</Label>
              <PhoneInput
                codeValue={(formData.otherMobileCode as string) || '+91'}
                numberValue={(formData.otherMobileNumber as string) || ''}
                onCodeChange={(val) => updateField('otherMobileCode', val)}
                onNumberChange={(val) => updateField('otherMobileNumber', val)}
                numberPlaceholder="Phone number"
                error={errors.otherMobileNumber}
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={(formData.homeCountryAddress as string) || ''}
                onChange={(e) => updateField('homeCountryAddress', e.target.value)}
                placeholder="Full address in home country"
                rows={2}
              />
            </div>

            {/* Home Country Emergency Contact */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold text-slate-700">Emergency Contact</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={(formData.homeEmergencyName as string) || ''}
                    onChange={(e) => updateField('homeEmergencyName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select
                    value={(formData.homeEmergencyRelation as string) || ''}
                    onValueChange={(val) => updateField('homeEmergencyRelation', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <PhoneInput
                    codeValue={(formData.homeEmergencyPhoneCode as string) || '+91'}
                    numberValue={(formData.homeEmergencyPhone as string) || ''}
                    onCodeChange={(val) => updateField('homeEmergencyPhoneCode', val)}
                    onNumberChange={(val) => updateField('homeEmergencyPhone', val)}
                    error={errors.homeEmergencyPhone}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 pt-3 border-t">
              🔒 Emergency contacts are used only for urgent situations.
            </p>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className={`${ICON_SIZES.sm} text-violet-600`} />
              <CardTitle className="text-base">Email</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personalEmail">
                  Personal Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={(formData.personalEmail as string) || ''}
                  onChange={(e) => updateField('personalEmail', e.target.value)}
                  placeholder="personal@email.com"
                  className={errors.personalEmail ? 'border-red-500' : ''}
                />
                {errors.personalEmail && (
                  <p className="text-sm text-red-600">{errors.personalEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Work Email
                </Label>
                <Input value={workEmail} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">Managed by your company</p>
              </div>
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